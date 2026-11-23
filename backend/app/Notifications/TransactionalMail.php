<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;

final class TransactionalMail
{
    public static function make(
        string $subject,
        string $title,
        string $intro,
        string $action,
        string $url,
        array $notes = [],
        bool $showLink = false,
    ): MailMessage {
        $siteUrl = rtrim(config('app.frontend_url'), '/');

        return (new MailMessage)
            ->subject($subject)
            ->action($action, $url)
            ->view([
                'html' => 'mail.transactional',
                'text' => 'mail.transactional-text',
            ], [
                'title' => $title,
                'intro' => $intro,
                'notes' => $notes,
                'showLink' => $showLink,
                'logoUrl' => $siteUrl.'/brand/adoptplace-logo.png',
            ]);
    }
}
