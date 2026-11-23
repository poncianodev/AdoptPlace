<?php

namespace App\Http\Middleware;

use App\Services\AnimalManagementAccess;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureOrganizationApproved
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        $reason = $user ? AnimalManagementAccess::blockedReason($user) : 'not_provider';
        if ($reason !== null) {
            return response()->json([
                'message' => 'Seu perfil ainda não está habilitado para gerenciar animais.',
                'reason' => $reason,
            ], 403);
        }

        return $next($request);
    }
}
