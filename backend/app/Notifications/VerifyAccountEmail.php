<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Notifications\Messages\MailMessage;

class VerifyAccountEmail extends VerifyEmail
{
    protected function buildMailMessage($url): MailMessage
    {
        return TransactionalMail::make(
            subject: 'Confirme seu e-mail — AdoptPlace',
            title: 'Confirme seu e-mail',
            intro: 'Confirme que este endereço pertence a você para concluir essa etapa do seu cadastro no AdoptPlace.',
            action: 'Confirmar meu e-mail',
            url: $url,
            notes: [
                'Este link é válido por '.config('auth.verification.expire', 60).' minutos.',
                'Se você não criou uma conta no AdoptPlace, pode ignorar este e-mail.',
            ],
            showLink: true,
        );
    }
}
