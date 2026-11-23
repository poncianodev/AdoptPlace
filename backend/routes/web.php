<?php

use App\Models\User;
use App\Services\ProtectorActivation;
use Illuminate\Auth\Events\Verified;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

Route::get('/email/verify/{id}/{hash}', function (string $id, string $hash, ProtectorActivation $activation) {
    $verified = DB::connection('mongodb')->transaction(function () use ($id, $hash, $activation) {
        $user = User::findOrFail($id);
        abort_unless(hash_equals(sha1($user->getEmailForVerification()), $hash), 403);
        $changed = ! $user->hasVerifiedEmail() && $user->markEmailAsVerified();
        if ($changed && $user->organization) {
            $activation->activate($user->organization, 'email_verification', $user);
        }

        return $changed ? $user : null;
    }, 3);

    if ($verified) {
        event(new Verified($verified));
    }

    return redirect(rtrim(config('app.frontend_url'), '/').'/login?verified=1');
})->middleware(['signed', 'throttle:6,1'])->name('verification.verify');

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

// Keep backend namespaces and missing static files out of the SPA fallback.
Route::get('/{spaPath?}', function () {
    $entry = public_path('index.html');
    abort_unless(is_file($entry), 503, 'Frontend build is not available. Use Vite for local development.');

    return response()->file($entry, ['Cache-Control' => 'no-cache']);
})->where('spaPath', '(?!(?:api|sanctum|email/verify|storage|assets|demo-pets)(?:/|$))(?:(?:index|login|dashboard|pet-detail)\.html|[^.]*)');
