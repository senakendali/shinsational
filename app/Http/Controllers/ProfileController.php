<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Support\Facades\Storage;

class ProfileController extends Controller
{
    // GET /api/me
    public function show(Request $request)
    {
        $u = $request->user()->loadMissing(['roles:id,name,guard_name']);
        $abilities = $u->getAllPermissions()->pluck('name')->values(); // Spatie
        $roleName  = optional($u->roles->first())->name;

        return response()->json([
            'id'         => $u->id,
            'name'       => $u->name,
            'email'      => $u->email,
            // path relatif -> aman untuk subfolder
            'avatar_path' => $u->avatar_path ? '/storage/'.$u->avatar_path : null,
            // full url (kalau APP_URL benar, ini juga valid)
            'avatar_url'  => $u->avatar_path ? Storage::disk('public')->url($u->avatar_path) : null,
            'role'       => $roleName,
            'roles'      => $u->roles->pluck('name')->values(),
            'abilities'  => $abilities,
        ]);
    }

    // PATCH /api/me
    public function updateProfile(Request $request)
    {
        $u = $request->user();

        $data = $request->validate([
            'name'  => ['sometimes','required','string','max:150'],
            'email' => ['sometimes','required','email','max:255','unique:users,email,'.$u->id],
        ]);

        if (array_key_exists('name', $data))  $u->name  = $data['name'];
        if (array_key_exists('email', $data)) $u->email = $data['email'];
        $u->save();

        return response()->json(['message' => 'Profil diperbarui.', 'data' => $u]);
    }

    // PATCH /api/me/password
    public function updatePassword(Request $request)
    {
        $u = $request->user();

        $data = $request->validate([
            'current_password' => ['required','string'],
            'password'         => ['required','confirmed', Password::min(8)],
        ]);

        if (!Hash::check($data['current_password'], $u->password)) {
            return response()->json(['message' => 'Password saat ini tidak cocok.'], 422);
        }

        $u->password = Hash::make($data['password']);
        $u->save();

        return response()->json(['message' => 'Password diperbarui.']);
    }

    // POST /api/me/avatar
    public function updateAvatar(Request $request)
    {
        $u = $request->user();

        $data = $request->validate([
            'avatar' => ['required','image','max:2048'], // 2MB
        ]);

        // Hapus avatar lama bila ada
        if ($u->avatar_path && Storage::disk('public')->exists($u->avatar_path)) {
            Storage::disk('public')->delete($u->avatar_path);
        }

        $path = $request->file('avatar')->store('avatars', 'public');
        $u->avatar_path = $path;
        $u->save();

        return response()->json([
            'message'     => 'Avatar updated.',
            'avatar_path' => '/storage/'.$path,                  // <— relatif
            'avatar_url'  => Storage::disk('public')->url($path) // <— absolut
        ]);
    }

    // DELETE /api/me/avatar
    public function deleteAvatar(Request $request)
    {
        $u = $request->user();

        if ($u->avatar_path && Storage::disk('public')->exists($u->avatar_path)) {
            Storage::disk('public')->delete($u->avatar_path);
        }
        $u->avatar_path = null;
        $u->save();

        return response()->json([
            'message'     => 'Avatar deleted.',
            'avatar_path' => null,
            'avatar_url'  => null,
        ]);
    }
}
