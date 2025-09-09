<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class TikTokAuthController extends Controller
{
    // === KONSTAN (bisa tetap, atau pakai config('services.tiktok.*'))
    private const CLIENT_KEY     = 'sbaw61e5w3i3r6tlbj';
    private const CLIENT_SECRET  = 'okcUviuPUQLzYmiNxc9CTCqfWExo0bAm';
    private const REDIRECT_URI   = 'https://btlcpdtracker.senstech.id/auth/tiktok/callback';

    private const AUTH_URL       = 'https://www.tiktok.com/v2/auth/authorize/';
    private const TOKEN_URL      = 'https://open.tiktokapis.com/v2/oauth/token/';
    private const USERINFO_URL   = 'https://open.tiktokapis.com/v2/user/info/';
    private const SCOPES         = 'user.info.basic,video.list';

    /**
     * /auth/tiktok/redirect
     */
    public function redirect(Request $request)
    {
        $state = Str::random(24);
        $request->session()->put('tiktok_state', $state);

        // --- Ambil campaign dari query ---
        $campaignId   = $request->query('campaign_id');
        $campaignSlug = $request->query('campaign');

        // Fallback format lama: /register?<slug> (tanpa key)
        if (!$campaignId && !$campaignSlug) {
            $raw = $request->getQueryString();
            if ($raw && !str_contains($raw, '=')) {
                $campaignSlug = $raw;
            }
        }

        // Simpan di session untuk dipakai di callback()
        $request->session()->put('pending_campaign_id', $campaignId);
        $request->session()->put('pending_campaign_slug', $campaignSlug);

        $params = [
            'client_key'    => self::CLIENT_KEY,
            'response_type' => 'code',
            'scope'         => self::SCOPES,
            'redirect_uri'  => self::REDIRECT_URI, // RAW (jangan urlencode manual)
            'state'         => $state,
        ];

        $url = self::AUTH_URL . '?' . http_build_query($params);

        Log::info('tiktok_auth_url', [
            'built_redirect' => self::REDIRECT_URI,
            'full_url'       => $url,
            'campaign_id'    => $campaignId,
            'campaign_slug'  => $campaignSlug,
        ]);

        return redirect()->away($url);
    }

    /**
     * /auth/tiktok/callback
     */
    public function callback(Request $request)
    {
        $code  = $request->get('code');
        $state = $request->get('state');

        // Validasi state
        if ($state !== $request->session()->pull('tiktok_state')) {
            return response()->json(['error' => 'Invalid state'], 400);
        }

        // 1) Tukar code -> token
        $tokenResp = Http::asForm()->post(self::TOKEN_URL, [
            'client_key'    => self::CLIENT_KEY,
            'client_secret' => self::CLIENT_SECRET,
            'code'          => $code,
            'grant_type'    => 'authorization_code',
            'redirect_uri'  => self::REDIRECT_URI,
        ]);

        if (!$tokenResp->ok()) {
            Log::error('tiktok_token_error', [
                'sent_redirect' => self::REDIRECT_URI,
                'status'        => $tokenResp->status(),
                'body'          => $tokenResp->json(),
            ]);
            return response()->json([
                'error'   => 'Failed to exchange token',
                'details' => $tokenResp->json(),
            ], 500);
        }

        $tokenData = $tokenResp->json();

        // (opsional) cek scope yang benar2 diberikan
        $granted   = preg_split('/[\s,]+/', trim($tokenData['scope'] ?? ''));
        $need      = ['user.info.basic', 'video.list'];
        $missing   = array_diff($need, $granted ?? []);
        if (!empty($missing)) {
            Log::warning('tiktok_missing_scopes', ['granted' => $granted, 'missing' => $missing]);
            return redirect('/auth/tiktok/redirect?reason=missing_scopes');
        }

        // 2) Ambil profil user (minta avatar_url untuk profile pic)
        $userResp = Http::withToken($tokenData['access_token'])
            ->withHeaders(['Accept' => 'application/json'])
            ->get(self::USERINFO_URL, [
                'fields' => 'open_id,display_name,avatar_url',
            ]);

        if (!$userResp->ok()) {
            $body = $userResp->json();
            Log::error('tiktok_userinfo_error', [
                'status' => $userResp->status(),
                'body'   => $body,
            ]);

            $msg = $body['message']
                ?? ($body['error']['message'] ?? 'Failed to fetch user info');

            return response()->json(['error' => $msg, 'details' => $body], 500);
        }

        $data = $userResp->json()['data'] ?? [];
        $user = $data['user'] ?? $data;

        // 3) Simpan ke session untuk prefill frontend (tambah avatar URL)
        session([
            'tiktok_user_id'     => $user['open_id']      ?? null,
            'tiktok_full_name'   => $user['display_name'] ?? null,
            'tiktok_avatar_url'  => $user['avatar_url']   ?? null,
        ]);

        // 4) Ambil kembali campaign dari session & redirect ke SPA dengan query
        $campaignId   = $request->session()->pull('pending_campaign_id');
        $campaignSlug = $request->session()->pull('pending_campaign_slug');

        // Bangun query redirect
        $qs = ['connected' => 'tiktok'];
        if ($campaignId)   $qs['campaign_id'] = $campaignId;
        if ($campaignSlug) $qs['campaign']    = $campaignSlug;

        $redirectUrl = '/registration' . '?' . http_build_query($qs);

        return redirect($redirectUrl);
    }
}
