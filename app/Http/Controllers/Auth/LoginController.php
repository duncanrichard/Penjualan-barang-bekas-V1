<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class LoginController extends Controller
{
    public function login(Request $request)
    {
        $validated = $request->validate([
            'username' => ['required', 'string'],
            'password' => ['required', 'string'],
        ], [
            'username.required' => 'Username wajib diisi.',
            'password.required' => 'Password wajib diisi.',
        ]);

        $remember = $request->boolean('remember');

        $login = Auth::attempt([
            'username' => $validated['username'],
            'password' => $validated['password'],
        ], $remember);

        if (! $login) {
            throw ValidationException::withMessages([
                'username' => ['Username atau password salah.'],
            ]);
        }

        $request->session()->regenerate();

        return response()->json([
            'success' => true,
            'message' => 'Login berhasil.',
            'redirect' => '/dashboard',
            'user' => [
                'id' => Auth::user()->id,
                'name' => Auth::user()->name,
                'username' => Auth::user()->username,
                'email' => Auth::user()->email,
            ],
        ]);
    }

    public function logout(Request $request)
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'success' => true,
            'message' => 'Logout berhasil.',
            'redirect' => '/login',
        ]);
    }

    public function check()
    {
        if (! Auth::check()) {
            return response()->json([
                'authenticated' => false,
                'user' => null,
            ]);
        }

        return response()->json([
            'authenticated' => true,
            'user' => [
                'id' => Auth::user()->id,
                'name' => Auth::user()->name,
                'username' => Auth::user()->username,
                'email' => Auth::user()->email,
            ],
        ]);
    }
}
