<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class TikTokAuthController extends Controller
{
    // === KONSTAN (langsung di controller) ===
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

        // NOTE: redirect_uri dikirim RAW (jangan urlencode manual)
        $params = [
            'client_key'    => self::CLIENT_KEY,
            'response_type' => 'code',
            'scope'         => self::SCOPES,
            'redirect_uri'  => self::REDIRECT_URI,
            'state'         => $state,
        ];

        $url = self::AUTH_URL . '?' . http_build_query($params);

        // optional: bantu debug kalau mismatch
        Log::info('tiktok_auth_url', [
            'built_redirect' => self::REDIRECT_URI,
            'full_url'       => $url,
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

        // validasi state
        if ($state !== $request->session()->pull('tiktok_state')) {
            return response()->json(['error' => 'Invalid state'], 400);
        }

        // tukar code -> access_token (redirect_uri HARUS SAMA persis dgn di redirect())
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

        // ambil profil user
        $userResp = Http::withToken($tokenData['access_token'])
            ->get(self::USERINFO_URL, [
                'fields' => 'open_id,username,display_name,avatar_url',
            ]);

        if (!$userResp->ok()) {
            Log::error('tiktok_userinfo_error', [
                'status' => $userResp->status(),
                'body'   => $userResp->json(),
            ]);
            return response()->json(['error' => 'Failed to fetch user info'], 500);
        }

        $user = $userResp->json()['data'] ?? [];

        // simpan ke session untuk prefill di frontend
        session([
            'tiktok_user_id'   => $user['open_id']      ?? null,
            'tiktok_username'  => $user['username']     ?? null,
            'tiktok_full_name' => $user['display_name'] ?? null,
            // kalau perlu simpan token:
            // 'tiktok_access_token'  => $tokenData['access_token'] ?? null,
            // 'tiktok_refresh_token' => $tokenData['refresh_token'] ?? null,
        ]);

        // kembali ke SPA
        return redirect('/registration?connected=tiktok');
    }
}
