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

        if ($state !== $request->session()->pull('tiktok_state')) {
            return response()->json(['error' => 'Invalid state'], 400);
        }

        // 1) Exchange code -> token
        $tokenResp = Http::asForm()->post(self::TOKEN_URL, [
            'client_key'    => self::CLIENT_KEY,
            'client_secret' => self::CLIENT_SECRET,
            'code'          => $code,
            'grant_type'    => 'authorization_code',
            'redirect_uri'  => self::REDIRECT_URI,
        ]);

        if (!$tokenResp->ok()) {
            \Log::error('tiktok_token_error', [
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

        // (opsional) Cek apakah scope mengandung user.info.basic
        $scopesStr = $tokenData['scope'] ?? '';
        if (stripos($scopesStr, 'user.info.basic') === false) {
            \Log::warning('tiktok_scope_missing_user_info_basic', ['scopes' => $scopesStr]);
            return response()->json([
                'error'   => 'Missing required scope: user.info.basic',
                'details' => ['scopes' => $scopesStr],
            ], 403);
        }

        // 2) Fetch user info (PASTIKAN fields valid, username TIDAK ada di v2)
        $userResp = Http::withToken($tokenData['access_token'])
            ->withHeaders(['Accept' => 'application/json'])
            ->get(self::USERINFO_URL, [
                'fields' => 'open_id,display_name,avatar_url,profile_deep_link,bio_description',
            ]);

        if (!$userResp->ok()) {
            $body = $userResp->json();
            \Log::error('tiktok_userinfo_error', [
                'status' => $userResp->status(),
                'body'   => $body,
            ]);

            // Bikin pesan yang lebih informatif di front-end
            $msg = $body['message']
                ?? ($body['error']['message'] ?? 'Failed to fetch user info');

            // Kalau 403, biasanya sandbox/whitelist atau scope
            if ($userResp->status() === 403) {
                $msg .= ' (403). Make sure the TikTok account is whitelisted for Sandbox and scope user.info.basic is granted.';
            }

            return response()->json(['error' => $msg, 'details' => $body], 500);
        }

        $data = $userResp->json()['data'] ?? [];
        // Struktur seringnya: ['data' => [ 'user' => { ... } ]] atau langsung di data
        $user = $data['user'] ?? $data;

        // Simpan ke session untuk prefill
        session([
            'tiktok_user_id'   => $user['open_id']      ?? null,
            // NOTE: v2 tidak expose username → jangan diset dari user['username']
            'tiktok_full_name' => $user['display_name'] ?? null,
            'tiktok_profile_link' => $user['profile_deep_link'] ?? null,
        ]);

        return redirect('/registration?connected=tiktok');
    }

}
