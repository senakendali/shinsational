<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\InfluencerRegistration;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use App\Models\InfluencerAccount;


class TikTokAuthController extends Controller
{
    // ==== Pakai env/config kalau bisa. Constants ini hanya fallback. ====
    private const CLIENT_KEY    = 'sbawru1jwiig13smtm';                       // ganti ke env('TIKTOK_CLIENT_KEY')
    private const CLIENT_SECRET = 'm7IRftc8Lpu6CUFmgzezQxWO8HJYyKf3';         // ganti ke env('TIKTOK_CLIENT_SECRET')
    private const REDIRECT_URI  = 'https://dreamxbtladvocacy.com/auth/tiktok/callback';

    private const AUTH_URL     = 'https://www.tiktok.com/v2/auth/authorize/';
    private const TOKEN_URL    = 'https://open.tiktokapis.com/v2/oauth/token/';
    private const USERINFO_URL = 'https://open.tiktokapis.com/v2/user/info/';
    // ⬇️ tambah user.info.profile agar bisa ambil username & avatar_url
    private const SCOPES       = 'user.info.basic,user.info.profile,video.list';

    /**
     * GET /auth/tiktok/redirect
     */
    public function redirect(Request $request)
    {
        $state = Str::random(24);
        $request->session()->put('tiktok_state', $state);

        // simpan konteks campaign (buat redirect balik)
        $campaignId   = $request->query('campaign_id');
        $campaignSlug = $request->query('campaign');

        if (!$campaignId && !$campaignSlug) {
            $raw = $request->getQueryString();
            if ($raw && !str_contains($raw, '=')) {
                $campaignSlug = $raw;
            }
        }
        $request->session()->put('pending_campaign_id', $campaignId);
        $request->session()->put('pending_campaign_slug', $campaignSlug);

        $params = [
            'client_key'    => self::CLIENT_KEY,
            'response_type' => 'code',
            'scope'         => self::SCOPES,     // comma-separated
            'redirect_uri'  => self::REDIRECT_URI,
            'state'         => $state,
        ];

        $url = self::AUTH_URL.'?'.http_build_query($params);

        Log::info('tiktok_auth_redirect', [
            'redirect'     => self::REDIRECT_URI,
            'full_url'     => $url,
            'campaign_id'  => $campaignId,
            'campaign_slug'=> $campaignSlug,
        ]);

        return redirect()->away($url);
    }

    /**
     * GET /auth/tiktok/callback
     */
    public function callback(Request $request)
    {
        $code  = (string) $request->query('code', '');
        $state = (string) $request->query('state', '');

        if ($state !== $request->session()->pull('tiktok_state')) {
            return response()->json(['error' => 'Invalid state'], 400);
        }
        if (!$code) {
            return response()->json(['error' => 'Missing code'], 400);
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

        $tokenData    = $tokenResp->json();
        $accessToken  = $tokenData['access_token']  ?? null;
        $refreshToken = $tokenData['refresh_token'] ?? null;
        $expiresIn    = $tokenData['expires_in']    ?? null; // seconds
        $tokenType    = $tokenData['token_type']    ?? 'Bearer';
        $granted      = preg_split('/[\s,]+/', trim($tokenData['scope'] ?? '')) ?: [];

        // (opsional) validasi scope
        $need    = ['user.info.basic','user.info.profile','video.list'];
        $missing = array_diff($need, $granted);
        if ($missing) {
            Log::warning('tiktok_missing_scopes', compact('granted','missing'));
            // tetap lanjut; username/avatar bisa saja null
        }

        // 2) Ambil profil user → open_id, username, display_name, avatar_url
        $userResp = Http::withToken($accessToken)
            ->acceptJson()
            ->get(self::USERINFO_URL, [
                'fields' => 'open_id,username,display_name,avatar_url',
            ]);

        if (!$userResp->ok()) {
            $body = $userResp->json();
            Log::error('tiktok_userinfo_error', ['status'=>$userResp->status(),'body'=>$body]);
            $msg = $body['message'] ?? ($body['error']['message'] ?? 'Failed to fetch user info');
            return response()->json(['error' => $msg, 'details' => $body], 500);
        }

        $user       = data_get($userResp->json(), 'data.user', []);
        $openId     = $user['open_id']      ?? null;
        $username   = $user['username']     ?? null;
        $display    = $user['display_name'] ?? null;
        $avatar     = $user['avatar_url']   ?? null;

        if (!$openId) {
            return response()->json(['error' => 'Missing open_id'], 400);
        }

        // 3) Simpan/Update ke tabel influencer_accounts (satu baris per tiktok_user_id)
        InfluencerAccount::updateOrCreate(
            ['tiktok_user_id' => $openId],
            [
                'tiktok_username'    => $username,
                'full_name'          => $display,
                'avatar_url'         => $avatar,
                'token_type'         => $tokenType,
                'access_token'       => $accessToken,   // terenkripsi via casts (Laravel 10+)
                'refresh_token'      => $refreshToken,  // terenkripsi via casts
                'expires_at'         => $expiresIn ? now()->addSeconds((int)$expiresIn) : null,
                'last_refreshed_at'  => now(),
                'revoked_at'         => null,
                'scopes'             => $granted,
            ]
        );

        // 4) Simpan session untuk prefill FE (tidak dipakai sebagai sumber token lagi)
        $request->session()->put('tiktok_user_id',    $openId);
        $request->session()->put('tiktok_username',   $username);
        $request->session()->put('tiktok_full_name',  $display);
        $request->session()->put('tiktok_avatar_url', $avatar);

        // (opsional) kalau masih mau: simpan bundle ringan di session (tidak wajib)
        $request->session()->put('tiktok_token_bundle', [
            'token_type'        => $tokenType,
            'expires_at'        => $expiresIn ? now()->addSeconds((int)$expiresIn)->toIso8601String() : null,
            'scopes'            => $granted,
            'last_refreshed_at' => now()->toIso8601String(),
        ]);

        // 5) Redirect balik ke halaman registrasi/profil dengan konteks campaign
        $campaignId   = $request->session()->pull('pending_campaign_id');
        $campaignSlug = $request->session()->pull('pending_campaign_slug');

        $qs = ['connected' => 'tiktok'];
        if ($campaignId)   $qs['campaign_id'] = $campaignId;
        if ($campaignSlug) $qs['campaign']    = $campaignSlug;

        return redirect('/registration?'.http_build_query($qs));
    }

}
