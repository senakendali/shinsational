<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class TikTokAuthController extends Controller
{
    public function redirect(Request $request)
    {
        $clientKey    = 'sbaw61e5w3i3r6tlbj';
        $redirectUri  = urlencode(config('https://btlcpdtracker.senstech.id/auth/tiktok/callback'));
        $state        = Str::random(16); // simpan ke session biar bisa divalidasi di callback

        session(['tiktok_oauth_state' => $state]);

        $scopes = 'user.info.basic,video.list';

        $url = "https://www.tiktok.com/v2/auth/authorize/?" . http_build_query([
            'client_key'    => $clientKey,
            'response_type' => 'code',
            'scope'         => $scopes,
            'redirect_uri'  => config('services.tiktok.redirect_uri'),
            'state'         => $state,
        ]);

        return redirect()->away($url);
    }



    public function callback(Request $request)
    {
        $code  = $request->get('code');
        $state = $request->get('state');

        if ($state !== session('tiktok_oauth_state')) {
            return response()->json(['error' => 'Invalid state'], 400);
        }

        // tukar code -> access_token
        $response = Http::asForm()->post('https://open.tiktokapis.com/v2/oauth/token/', [
            'client_key'    => 'sbaw61e5w3i3r6tlbj',
            'client_secret' => 'okcUviuPUQLzYmiNxc9CTCqfWExo0bAm',
            'code'          => $code,
            'grant_type'    => 'authorization_code',
            'redirect_uri'  => 'https://btlcpdtracker.senstech.id/auth/tiktok/callback',
        ]);

        if (!$response->ok()) {
            return response()->json(['error' => 'Failed to fetch access token', 'details' => $response->json()], 500);
        }

        $tokenData = $response->json();

        // ambil profil user
        $userResp = Http::withToken($tokenData['access_token'])
            ->get('https://open.tiktokapis.com/v2/user/info/', [
                'fields' => 'open_id,username,display_name',
            ]);

        if (!$userResp->ok()) {
            return response()->json(['error' => 'Failed to fetch user info'], 500);
        }

        $user = $userResp->json()['data'];

        // simpan ke session
        session([
            'tiktok_user_id' => $user['open_id'] ?? null,
            'tiktok_username' => $user['username'] ?? null,
            'tiktok_full_name' => $user['display_name'] ?? null,
        ]);

        // redirect balik ke SPA
        return redirect('/registration');
    }

    public function callback__(Request $request)
    {
        $code  = $request->get('code');
        $state = $request->get('state');

        // validate state
        if ($state !== session('tiktok_oauth_state')) {
            return response()->json(['error' => 'Invalid state'], 400);
        }

        // tukar code -> access_token
        $response = Http::asForm()->post('https://open.tiktokapis.com/v2/oauth/token/', [
            'client_key'    => 'sbaw61e5w3i3r6tlbj',
            'client_secret' => 'okcUviuPUQLzYmiNxc9CTCqfWExo0bAm',
            'code'          => $code,
            'grant_type'    => 'authorization_code',
            'redirect_uri'  => 'https://btlcpdtracker.senstech.id/auth/tiktok/callback',
        ]);

        if (!$response->ok()) {
            return response()->json(['error' => 'Failed to fetch access token', 'details' => $response->json()], 500);
        }

        $data = $response->json();

        // simpan token, misalnya ke DB atau session
        // session(['tiktok_access_token' => $data['access_token']]);

        // redirect balik ke SPA (frontend)
        return redirect('/registration?connected=tiktok');
    }
}
