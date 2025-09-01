<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InfluencerRegistration;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Carbon;

class InfluencerRegistrationController extends Controller
{
    /**
     * Store a newly created registration.
     */
    public function store(Request $request)
    {
        $validated = $request->validate(
            [
                'tiktok_user_id'   => ['required','string','max:100'],
                'full_name'        => ['required','string','max:150'],
                'tiktok_username'  => [
                    'required','string','max:100',
                    'regex:/^[A-Za-z0-9_.]+$/',
                    Rule::unique('influencer_registrations','tiktok_username'),
                ],
                'phone'            => ['required','string','max:30'],
                'address'          => ['required','string','max:255'],
                // Umur minimal 18 → harus lahir sebelum atau sama dengan hari ini - 18 tahun
                'birth_date'       => [
                    'required',
                    'date',
                    'before_or_equal:'.Carbon::now()->subYears(18)->format('Y-m-d'),
                ],
            ],
            [
                'tiktok_user_id.required'  => 'ID TikTok wajib diisi.',
                'full_name.required'       => 'Nama lengkap wajib diisi.',
                'tiktok_username.required' => 'Username TikTok wajib diisi.',
                'tiktok_username.unique'   => 'Username TikTok sudah terdaftar.',
                'tiktok_username.regex'    => 'Username hanya boleh huruf, angka, underscore, dan titik.',
                'phone.required'           => 'Nomor telepon wajib diisi.',
                'address.required'         => 'Alamat wajib diisi.',
                'birth_date.required'      => 'Tanggal lahir wajib diisi.',
                'birth_date.date'          => 'Tanggal lahir tidak valid.',
                'birth_date.before_or_equal' => 'Umur minimal harus 18 tahun.',
            ]
        );

        $reg = InfluencerRegistration::create($validated);

        return response()->json([
            'message' => 'Registrasi berhasil disimpan.',
            'data'    => $reg,
        ], 201);
    }
}
