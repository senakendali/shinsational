<?php

namespace App\Services;

use App\Models\InfluencerAccount;
use Illuminate\Support\Facades\Http;

class TiktokAccountService
{
    public function ensureFreshToken(InfluencerAccount $acc): InfluencerAccount
    {
        if (!$acc->refresh_token || !$acc->willExpireSoon(300)) {
            return $acc;
        }

        $resp = Http::asForm()->post('https://open.tiktokapis.com/v2/oauth/token/', [
            'client_key'     => config('services.tiktok.client_id'),
            'client_secret'  => config('services.tiktok.client_secret'),
            'grant_type'     => 'refresh_token',
            'refresh_token'  => $acc->refresh_token, // akan didekripsi otomatis (Laravel 10+)
        ]);

        if ($resp->ok()) {
            $p = $resp->json();
            $acc->access_token      = $p['access_token']  ?? $acc->access_token;
            $acc->refresh_token     = $p['refresh_token'] ?? $acc->refresh_token;
            $acc->expires_at        = isset($p['expires_in']) ? now()->addSeconds((int)$p['expires_in']) : $acc->expires_at;
            $acc->last_refreshed_at = now();
            $acc->save();
        }

        return $acc;
    }
}
