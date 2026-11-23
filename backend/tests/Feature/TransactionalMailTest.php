<?php

namespace Tests\Feature;

use App\Models\AdoptionRequest;
use App\Models\Pet;
use App\Models\User;
use App\Notifications\AdoptionRequestReceived;
use App\Notifications\ResetAccountPassword;
use App\Notifications\VerifyAccountEmail;
use Illuminate\Contracts\Auth\UserProvider;
use Illuminate\Http\Request;
use Illuminate\Mail\Transport\ResendTransport;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class TransactionalMailTest extends TestCase
{
    public function test_resend_configuration_resolves_the_native_transport_without_sending(): void
    {
        config(['services.resend.key' => 'test-placeholder']);

        $this->assertInstanceOf(ResendTransport::class, Mail::mailer('resend')->getSymfonyTransport());
    }

    public function test_password_recovery_dispatches_a_notification_with_a_valid_reset_link(): void
    {
        Notification::fake();
        $user = $this->user();
        $provider = $this->mock(UserProvider::class);
        $provider->shouldReceive('retrieveByCredentials')->once()
            ->with(['email' => $user->email])->andReturn($user);
        Auth::provider('mail-test', fn () => $provider);
        config([
            'auth.providers.users.driver' => 'mail-test',
            'auth.passwords.users.store' => 'array',
            'app.frontend_url' => 'https://frontend.example.test',
        ]);

        $this->postJson('/api/v1/auth/forgot-password', ['email' => $user->email])->assertOk();

        Notification::assertSentTo($user, ResetAccountPassword::class, function ($notification, $channels) use ($user) {
            $this->assertSame('pt_BR', $notification->locale);
            $message = $notification->toMail($user);
            $this->assertPortugueseMessage($message, 'Redefinição de senha — AdoptPlace', 'Redefinir minha senha', [
                '60 minutos', 'só pode ser usado uma vez', 'Se você não solicitou',
            ]);
            $url = $message->actionUrl;
            $this->assertStringStartsWith('https://frontend.example.test/redefinir-senha?', $url);
            parse_str((string) parse_url($url, PHP_URL_QUERY), $query);
            $this->assertSame($user->email, $query['email']);
            $this->assertSame($notification->token, $query['token']);
            $this->assertTrue(Password::broker()->tokenExists($user, $query['token']));

            return $channels === ['mail'];
        });
    }

    public function test_verification_resend_dispatches_a_notification_with_a_signed_link(): void
    {
        Notification::fake();
        $user = $this->user();

        $this->actingAs($user)
            ->postJson('/api/v1/auth/email/verification-notification')
            ->assertOk();

        Notification::assertSentTo($user, VerifyAccountEmail::class, function ($notification, $channels) use ($user) {
            $this->assertSame('pt_BR', $notification->locale);
            $message = $notification->toMail($user);
            $this->assertPortugueseMessage($message, 'Confirme seu e-mail — AdoptPlace', 'Confirmar meu e-mail', [
                '60 minutos', 'Se você não criou uma conta',
            ]);
            $url = $message->actionUrl;
            $this->assertSame('/email/verify/'.$user->id.'/'.sha1($user->email), parse_url($url, PHP_URL_PATH));
            $this->assertTrue(URL::hasValidSignature(Request::create($url)));
            $this->travel(61)->minutes();
            $this->assertFalse(URL::hasValidSignature(Request::create($url)));
            $this->travelBack();

            return $channels === ['mail'];
        });
    }

    public function test_adoption_alert_uses_the_same_portuguese_layout_and_portal_link(): void
    {
        config(['app.frontend_url' => 'https://frontend.example.test']);
        $request = new AdoptionRequest;
        $request->setRelation('pet', new Pet(['name' => 'Luna']));
        $notification = new AdoptionRequestReceived($request);

        $this->assertSame('pt_BR', $notification->locale);
        $message = $notification->toMail($this->user());
        $this->assertSame('https://frontend.example.test/dashboard', $message->actionUrl);
        $this->assertPortugueseMessage($message, 'Novo interesse de adoção no AdoptPlace', 'Abrir portal', [
            'Uma pessoa demonstrou interesse em adotar Luna.',
        ]);
    }

    public function test_mail_channel_builds_both_mime_parts_using_an_in_memory_transport(): void
    {
        config(['mail.default' => 'array']);
        $user = $this->user();
        $user->sendEmailVerificationNotification();
        $user->sendPasswordResetNotification('preview-token');

        $messages = Mail::mailer('array')->getSymfonyTransport()->messages();
        $this->assertCount(2, $messages);
        foreach (['Confirmar meu e-mail', 'Redefinir minha senha'] as $index => $action) {
            $email = $messages[$index]->getOriginalMessage();
            $this->assertStringContainsString($action, $email->getHtmlBody());
            $this->assertStringContainsString($action, $email->getTextBody());
        }
    }

    private function assertPortugueseMessage(MailMessage $message, string $subject, string $action, array $phrases): void
    {
        $this->assertSame($subject, $message->subject);
        $data = $message->data();
        $html = view($message->view['html'], $data)->render();
        $plain = view($message->view['text'], $data)->render();

        $this->assertStringContainsString('lang="pt-BR"', $html);
        $this->assertStringContainsString('/brand/adoptplace-logo.png', $html);
        $this->assertStringContainsString('href="'.e($message->actionUrl).'"', $html);
        $this->assertStringContainsString($message->actionUrl, $plain);
        foreach ([$html, $plain] as $body) {
            foreach ([$action, 'Esta é uma mensagem automática.', ...$phrases] as $phrase) {
                $this->assertStringContainsString($phrase, $body);
            }
            $this->assertDoesNotMatchRegularExpression('/Reset Password|Verify Email Address|Hello!|Regards/i', $body);
        }
    }

    private function user(): User
    {
        $user = new User(['name' => 'Ana', 'email' => 'ana@example.test', 'status' => 'active']);
        $user->id = 'mail-test-user';

        return $user;
    }
}
