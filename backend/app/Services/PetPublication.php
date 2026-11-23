<?php

namespace App\Services;

use App\Models\Pet;
use Illuminate\Validation\ValidationException;

class PetPublication
{
    public static function validatedCover(Pet $pet): string
    {
        $coverPhoto = $pet->cover_photo ?: ($pet->photos[0]['url'] ?? null);
        $errors = [];

        if (! filled($pet->name)) {
            $errors['name'] = ['Informe o nome do animal antes de publicar.'];
        }
        if (! in_array($pet->species, ['dog', 'cat', 'other'], true)) {
            $errors['species'] = ['Selecione a espécie do animal antes de publicar.'];
        }
        if (! in_array($pet->sex, ['male', 'female', 'unknown'], true)) {
            $errors['sex'] = ['Selecione o sexo do animal antes de publicar.'];
        }
        if (! in_array($pet->size, ['small', 'medium', 'large'], true)) {
            $errors['size'] = ['Selecione o porte do animal antes de publicar.'];
        }
        if (mb_strlen(trim((string) $pet->description)) < 30) {
            $errors['description'] = ['A descrição deve ter pelo menos 30 caracteres antes da publicação.'];
        }
        if (! filled(data_get($pet->location, 'city'))) {
            $errors['location.city'] = ['Informe a cidade do animal antes de publicar.'];
        }
        if (mb_strlen(trim((string) data_get($pet->location, 'state'))) !== 2) {
            $errors['location.state'] = ['Informe o estado (UF com 2 letras) antes de publicar.'];
        }
        if (! filled($coverPhoto)) {
            $errors['photo'] = ['Adicione uma foto de capa antes de publicar.'];
        }

        if (! empty($errors)) {
            throw ValidationException::withMessages($errors);
        }

        return $coverPhoto;
    }
}
