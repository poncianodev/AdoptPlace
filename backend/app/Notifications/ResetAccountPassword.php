<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Notifications\Messages\MailMessage;

class ResetAccountPassword extends ResetPassword
{
    protected function buildMailMessage($url): MailMessage
    {
        $broker = config('auth.defaults.passwords');

        return TransactionalMail::make(
            subject: 'Redefinição de senha — AdoptPlace',
            title: 'Redefina sua senha',
            intro: 'Recebemos um pedido para redefinir a senha da sua conta no AdoptPlace. Use o botão abaixo para escolher uma nova senha.',
            action: 'Redefinir minha senha',
            url: $url,
            notes: [
                'Este link é válido por '.config("auth.passwords.{$broker}.expire").' minutos e só pode ser usado uma vez.',
                'Se você não solicitou a redefinição, ignore este e-mail. Sua senha continuará a mesma.',
            ],
            showLink: true,
        );
    }
}
