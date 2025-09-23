<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\InfluencerRegistration;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use App\Models\InfluencerAccount;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Cookie;
use App\Services\LinkTiktokService;





class TikTokAuthController extends Controller
{
    // ==== Pakai env/config kalau bisa. Constants ini hanya fallback. ====
    /*private const CLIENT_KEY    = 'sbawru1jwiig13smtm';                       // ganti ke env('TIKTOK_CLIENT_KEY')
    private const CLIENT_SECRET = 'm7IRftc8Lpu6CUFmgzezQxWO8HJYyKf3';         // ganti ke env('TIKTOK_CLIENT_SECRET')
    private const REDIRECT_URI  = 'https://dreamxbtladvocacy.com/auth/tiktok/callback';*/

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

        // simpan di session (kalau web middleware ok)
        $request->session()->put('tiktok_state', $state);

        // Ambil campaign context dari query
        $campaignId   = $request->query('campaign_id');
        $campaignSlug = $request->query('campaign');

        // Fallback format lama: ?my-campaign-slug
        if (!$campaignId && !$campaignSlug) {
            $raw = $request->getQueryString();
            if ($raw && !str_contains($raw, '=')) {
                $campaignSlug = $raw;
            }
        }

        // simpan juga di session (boleh)
        $request->session()->put('pending_campaign_id', $campaignId);
        $request->session()->put('pending_campaign_slug', $campaignSlug);

        // ⬇️ simpan DUPLIKAT di cache (fallback kalau session gak kebaca)
        Cache::put("oauth:tiktok:state:{$state}", [
            'campaign_id'  => $campaignId,
            'campaign_slug'=> $campaignSlug,
            'created_at'   => now()->toIso8601String(),
        ], now()->addMinutes(10));

        $params = [
            'client_key'    => config('services.tiktok.client_key'),
            'response_type' => 'code',
            'scope'         => self::SCOPES,
            'redirect_uri'  => config('services.tiktok.redirect_uri'),
            'state'         => $state,
        ];

        $url = self::AUTH_URL . '?' . http_build_query($params);

        Log::info('tiktok_auth_redirect', [
            'state'         => $state,
            'campaign_id'   => $campaignId,
            'campaign_slug' => $campaignSlug,
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

        // --- Validasi state: session + cache (sekali pakai) ---
        $sessionState = $request->session()->pull('tiktok_state');
        $cacheMeta    = Cache::pull("oauth:tiktok:state:{$state}");

        if ($state === '' || (!$sessionState && !$cacheMeta) || ($sessionState && $state !== $sessionState)) {
            Log::warning('tiktok_invalid_state', [
                'got'           => $state,
                'session_state' => $sessionState,
                'has_cache'     => (bool) $cacheMeta,
            ]);
            return response()->json(['error' => 'Invalid state'], 400);
        }
        if (!$code) {
            return response()->json(['error' => 'Missing code'], 400);
        }

        // --- 1) Tukar code -> token ---
        $tokenResp = Http::asForm()->post(self::TOKEN_URL, [
            'client_key'    => config('services.tiktok.client_key'),
            'client_secret' => config('services.tiktok.client_secret'),
            'code'          => $code,
            'grant_type'    => 'authorization_code',
            'redirect_uri'  => config('services.tiktok.redirect_uri'),
        ]);

        if (!$tokenResp->ok()) {
            Log::error('tiktok_token_error', [
                'sent_redirect' => config('services.tiktok.redirect_uri'),
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
        $expiresIn    = $tokenData['expires_in']    ?? null;   // seconds
        $tokenType    = $tokenData['token_type']    ?? 'Bearer';
        $granted      = preg_split('/[\s,]+/', trim($tokenData['scope'] ?? '')) ?: [];

        if (!$accessToken) {
            return response()->json(['error' => 'No access_token from TikTok'], 500);
        }

        // (opsional) cek scope
        $need    = ['user.info.basic','user.info.profile','video.list'];
        $missing = array_diff($need, $granted);
        if ($missing) {
            Log::warning('tiktok_missing_scopes', compact('granted','missing'));
            // lanjut; username/avatar bisa kosong bila scope kurang
        }

        // --- 2) Profil user ---
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

        $user     = data_get($userResp->json(), 'data.user', []);
        $openId   = $user['open_id']      ?? null;
        $username = $user['username']     ?? null;
        $display  = $user['display_name'] ?? null;
        $avatar   = $user['avatar_url']   ?? null;

        if (!$openId) {
            return response()->json(['error' => 'Missing open_id'], 400);
        }

        // --- 3) Simpan/Update akun terpusat ---
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

        // --- 3b) LINK & MIGRATE (idempotent) ---
        try {
            if ($username) {
                $migrated = \App\Services\LinkTiktokService::run($openId, $username);
                Log::info('tiktok_link_migrated', ['open_id'=>$openId, 'username'=>$username, 'migrated'=>$migrated]);
            } else {
                Log::warning('tiktok_link_skip_no_username', ['open_id'=>$openId]);
            }
        } catch (\Throwable $e) {
            Log::error('tiktok_link_failed', ['open_id'=>$openId, 'err'=>$e->getMessage()]);
            // tidak blokir user; lanjut set session & redirect
        }

        // --- 4) Session ringan untuk FE (prefill) ---
        $request->session()->put('tiktok_user_id',    $openId);
        $request->session()->put('tiktok_username',   $username);
        $request->session()->put('tiktok_full_name',  $display);
        $request->session()->put('tiktok_avatar_url', $avatar);

        // --- 5) Tentukan redirect target ---
        $campaignId   = $request->session()->pull('pending_campaign_id')   ?? data_get($cacheMeta, 'campaign_id');
        $campaignSlug = $request->session()->pull('pending_campaign_slug') ?? data_get($cacheMeta, 'campaign_slug');

        $qs = [
            'connected' => 'tiktok',
            'open_id'   => $openId,
            'name'      => $display,
            'avatar'    => $avatar,
        ];
        if ($campaignId)   $qs['campaign_id'] = $campaignId;
        if ($campaignSlug) $qs['campaign']    = $campaignSlug;

        // Jika ada pending campaign → balik ke /registration (prefill),
        // kalau tidak → ke /my-profile supaya safety-net juga jalan.
        $redirectBase = ($campaignId || $campaignSlug) ? '/registration' : '/my-profile';
        $redirectUrl  = $redirectBase . '?' . http_build_query($qs);

        $cookieDomain = $request->getHost();
        $secure       = $request->isSecure();
        $minutes      = 60 * 24 * 30; // 30 hari

        Log::info('tiktok_callback_ok', [
            'open_id'  => $openId,
            'username' => $username,
            'redirect' => $redirectUrl,
        ]);

        return redirect($redirectUrl)
            ->cookie(
                'tkoid',           // nama cookie
                $openId,           // value
                $minutes,          // minutes
                '/',               // path
                $cookieDomain,     // domain
                $secure,           // secure
                true,              // httpOnly
                false,             // raw
                'Lax'              // same-site
            );
    }


    public function reset(Request $request)
    {
        // simpan konteks agar ikut ke redirect berikutnya
        $campaignId   = $request->query('campaign_id');
        $campaignSlug = $request->query('campaign');

        // --- bersihkan session lokal sepenuhnya ---
        try {
            // buang semua data di session
            $request->session()->flush();
            // invalidate (destroy) & ganti session ID
            $request->session()->invalidate();
            // regenerate CSRF token
            $request->session()->regenerateToken();
        } catch (\Throwable $e) {
            \Log::warning('session_reset_failed', ['err' => $e->getMessage()]);
        }

        // --- hapus cookie sesi di browser ---
        try {
            $forget = Cookie::forget(config('session.cookie'));
        } catch (\Throwable $e) {
            $forget = null; // fallback kalau gagal ambil nama cookie
        }

        // redirect ke OAuth dengan force re-consent
        $qs = array_filter([
            'campaign_id' => $campaignId,
            'campaign'    => $campaignSlug,
            'force'       => 1,
        ]);
        $url = '/auth/tiktok/redirect' . ($qs ? ('?' . http_build_query($qs)) : '');

        // kirim juga instruksi hapus cookie (kalau tersedia)
        return $forget
            ? redirect($url)->withCookie($forget)
            : redirect($url);
    }




}
