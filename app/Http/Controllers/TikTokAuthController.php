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
            'client_key'    => self::CLIENT_KEY,
            'response_type' => 'code',
            'scope'         => self::SCOPES,
            'redirect_uri'  => self::REDIRECT_URI,
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

        // ambil & hapus state dari session (kalau ada)
        $sessionState = $request->session()->pull('tiktok_state');

        // fallback: metadata state dari cache (sekali pakai, di-pull juga)
        $cacheMeta = Cache::pull("oauth:tiktok:state:{$state}");

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

        // … (LANJUTKAN kode tukar token, get profile, dsb persis patch sebelumnya) …

        // Gunakan campaign_id/slug dari session atau fallback dari cache
        $campaignId   = $request->session()->pull('pending_campaign_id')   ?? data_get($cacheMeta, 'campaign_id');
        $campaignSlug = $request->session()->pull('pending_campaign_slug') ?? data_get($cacheMeta, 'campaign_slug');

        // redirect balik
        $qs = ['connected' => 'tiktok'];
        if ($campaignId)   $qs['campaign_id'] = $campaignId;
        if ($campaignSlug) $qs['campaign']    = $campaignSlug;

        return redirect('/registration?'.http_build_query($qs));
    }


}
