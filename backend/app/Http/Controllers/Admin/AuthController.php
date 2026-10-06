<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\CmsAudit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function session(Request $request): JsonResponse
    {
        $u = $request->user();

        return response()->json(['data' => ['user' => $u?->is_admin ? ['id' => $u->id, 'name' => $u->name, 'email' => $u->email] : null, 'csrf_token' => csrf_token()]]);
    }

    public function login(Request $request): JsonResponse
    {
        $v = $request->validate(['email' => 'required|email|max:254', 'password' => 'required|string|max:200']);
        $key = 'admin-login:'.$request->ip().':'.strtolower($v['email']);
        abort_if(RateLimiter::tooManyAttempts($key, 5), 429, 'Too many login attempts. Please wait.');
        RateLimiter::hit($key, 60);
        if (! Auth::attempt(['email' => strtolower($v['email']), 'password' => $v['password'], 'is_admin' => true])) {
            throw ValidationException::withMessages(['email' => 'The sign-in details are not valid.']);
        }
        RateLimiter::clear($key);
        $request->session()->regenerate();
        CmsAudit::record('login', 'administrator', Auth::id());

        return $this->session($request);
    }

    public function logout(Request $request): JsonResponse
    {
        CmsAudit::record('logout', 'administrator', Auth::id());
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['data' => ['message' => 'Signed out.']]);
    }
}
