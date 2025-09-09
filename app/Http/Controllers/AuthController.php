<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email'    => ['required','email'],
            'password' => ['required'],
        ]);

        $remember = (bool) $request->boolean('remember', false);

        if (! Auth::attempt($credentials, $remember)) {
            throw ValidationException::withMessages([
                'email' => ['Email atau password salah.'],
            ]);
        }

        $request->session()->regenerate();

        $user = $request->user();

        // Sesuaikan dengan kebutuhan app-mu; kalau field-nya gak ada, null aja
        session([
            'role'            => data_get($user, 'role', 'user'),
            'user'       => data_get($user, 'name', $user->email),
        ]);

        return response()->json([
            'ok'   => true,
            'user' => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
            ],
            'session' => [
                'role'            => session('role'),
            ],
        ]);
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return response()->json(['ok' => true]);
    }

    public function me(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'authenticated' => (bool) $user,
            'user' => $user ? [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
            ] : null,
            'session' => [
                'role'            => session('role'),
            ],
            'csrf' => csrf_token(),
        ]);
    }
}
