<?php

namespace App\Notifications;

use App\Models\AdoptionRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AdoptionRequestReceived extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public AdoptionRequest $adoptionRequest)
    {
        $this->locale('pt_BR');
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $petName = $this->adoptionRequest->pet?->name;

        return TransactionalMail::make(
            subject: 'Novo interesse de adoção no AdoptPlace',
            title: 'Novo interesse de adoção',
            intro: $petName ? 'Uma pessoa demonstrou interesse em adotar '.$petName.'.' : 'Você recebeu um novo interesse de adoção.',
            action: 'Abrir portal',
            url: rtrim(config('app.frontend_url'), '/').'/dashboard',
            notes: ['Acesse o painel para revisar o pedido e acompanhar a adoção.'],
        );
    }
}
