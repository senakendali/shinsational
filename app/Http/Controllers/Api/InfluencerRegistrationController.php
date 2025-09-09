<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InfluencerRegistration;
use App\Models\Campaign; // ← tambahkan
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
        // --- Resolve campaign dari form/query ---
        $campaignId   = $request->integer('campaign_id');
        $campaignSlug = $request->string('campaign')->toString();

        if (!$campaignId && $campaignSlug) {
            $campaignId = Campaign::where('slug', $campaignSlug)->value('id');
        }

        // (opsional) fallback format lama: ?my-campaign-slug (tanpa key) → biasanya dipakai di GET, bukan POST
        if (!$campaignId && !$campaignSlug) {
            $raw = $request->getQueryString();
            if ($raw && !str_contains($raw, '=')) {
                $campaignId = Campaign::where('slug', $raw)->value('id');
            }
        }

        // Bersihkan username dari awalan '@'
        $username = ltrim((string) $request->input('tiktok_username', ''), '@');

        // Siapkan payload untuk divalidasi & disimpan
        $payload = $request->all();
        $payload['tiktok_username'] = $username;
        $payload['campaign_id']     = $campaignId; // bisa null → validasi akan fail kalau kosong
        // profile_pic_url dikirim dari frontend via hidden input (prefill dari session)
        // $payload['profile_pic_url'] sudah ada jika dikirim

        // Rules dasar
        $rules = [
            'tiktok_user_id'   => ['required','string','max:100'],
            'full_name'        => ['required','string','max:150'],
            'tiktok_username'  => ['required','string','max:100','regex:/^[A-Za-z0-9_.]+$/'],
            'phone'            => ['required','string','max:30'],
            'address'          => ['required','string','max:255'],
            'birth_date'       => [
                'required','date',
                'before_or_equal:'.Carbon::now()->subYears(18)->format('Y-m-d'),
            ],
            'profile_pic_url'  => ['nullable','url','max:2048'],
            'campaign_id'      => ['required','exists:campaigns,id'],
        ];

        // Unik PER CAMPAIGN
        if ($campaignId) {
            $rules['tiktok_user_id'][] = Rule::unique('influencer_registrations', 'tiktok_user_id')
                ->where(fn($q) => $q->where('campaign_id', $campaignId));

            // (opsional) kalau ingin username juga unik per campaign:
            $rules['tiktok_username'][] = Rule::unique('influencer_registrations', 'tiktok_username')
                ->where(fn($q) => $q->where('campaign_id', $campaignId));
        }

        $messages = [
            'tiktok_user_id.required'     => 'ID TikTok wajib diisi.',
            'full_name.required'          => 'Nama lengkap wajib diisi.',
            'tiktok_username.required'    => 'Username TikTok wajib diisi.',
            'tiktok_username.regex'       => 'Username hanya boleh huruf, angka, underscore, dan titik.',
            'phone.required'              => 'Nomor telepon wajib diisi.',
            'address.required'            => 'Alamat wajib diisi.',
            'birth_date.required'         => 'Tanggal lahir wajib diisi.',
            'birth_date.date'             => 'Tanggal lahir tidak valid.',
            'birth_date.before_or_equal'  => 'Umur minimal harus 18 tahun.',
            'profile_pic_url.url'         => 'URL foto profil tidak valid.',
            'campaign_id.required'        => 'Campaign tidak ditemukan.',
            'campaign_id.exists'          => 'Campaign tidak valid.',
            'tiktok_user_id.unique'       => 'Akun TikTok ini sudah terdaftar untuk campaign ini.',
            'tiktok_username.unique'      => 'Username TikTok ini sudah terdaftar untuk campaign ini.',
        ];

        $validated = validator($payload, $rules, $messages)->validate();

        // Simpan
        $reg = InfluencerRegistration::create($validated);

        return response()->json([
            'message' => 'Registrasi berhasil disimpan.',
            'data'    => $reg->load('campaign:id,name,slug'),
        ], 201);
    }
}
