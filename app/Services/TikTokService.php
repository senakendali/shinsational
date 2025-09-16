<?php


// app/Services/TikTokService.php
namespace App\Services;

use Illuminate\Support\Facades\Http;
use App\Models\InfluencerAccount;

class TikTokService
{
    protected function ttHttp(string $accessToken)
    {
        return Http::withToken($accessToken)->acceptJson()->timeout(20);
    }

    /** Admin/cron/auto: refresh access_token jika perlu */
    public function ensureFreshAccessToken(InfluencerAccount $acc, int $minTtlSeconds = 300): string
    {
        // kalau revoked → minta reauth
        if ($acc->revoked_at) {
            throw new \RuntimeException('Token revoked, need reauth');
        }

        // kalau belum mau habis, langsung pakai
        if ($acc->access_token && !$acc->tokenExpiringIn($minTtlSeconds)) {
            return $acc->access_token;
        }

        // kalau tidak punya refresh_token → reauth
        if (!$acc->refresh_token) {
            throw new \RuntimeException('Missing refresh_token, need reauth');
        }

        $this->refreshAccessToken($acc);
        if (!$acc->access_token) {
            throw new \RuntimeException('Refresh failed, no access_token returned');
        }
        return $acc->access_token;
    }

    /**
     * Panggil endpoint OAuth refresh token TikTok
     * - Rotasi refresh_token jika diberikan oleh TikTok
     * - Update expires_at, last_refreshed_at
     * - Tandai revoked_at jika invalid_grant/invalid_client
     */
    public function refreshAccessToken(InfluencerAccount $acc): array
    {
        $clientId     = config('services.tiktok.client_id');
        $clientSecret = config('services.tiktok.client_secret');

        // TikTok umumnya minta form-encoded:
        $resp = Http::asForm()
            ->timeout(20)
            ->post('https://open.tiktokapis.com/v2/oauth/token/', [
                'client_key'    => $clientId,
                'client_secret' => $clientSecret,
                'grant_type'    => 'refresh_token',
                'refresh_token' => $acc->refresh_token,
            ]);

        $json = $resp->json() ?: [];
        $error = data_get($json, 'error', []);
        $ok = $resp->ok() && (!data_get($error, 'code') || data_get($error, 'code') === 'ok');

        if (!$ok) {
            $code = data_get($error, 'code') ?: data_get($json, 'error_code');
            if (in_array($code, ['invalid_grant','invalid_client','access_denied'], true)) {
                $acc->revoked_at = now();
                $acc->save();
                return ['updated' => false, 'reauth' => true, 'reason' => $code, 'raw' => $json];
            }
            // error lain: jangan revoke, biar retry lain waktu
            return ['updated' => false, 'reauth' => false, 'reason' => $code ?: 'unknown', 'raw' => $json];
        }

        // Struktur umum respons
        $newAccess  = data_get($json, 'access_token');
        $expiresIn  = (int) (data_get($json, 'expires_in') ?: 0);           // detik
        $newRefresh = data_get($json, 'refresh_token');                     // bisa null
        $refreshExp = (int) (data_get($json, 'refresh_expires_in') ?: 0);   // detik (opsional)

        if ($newAccess) {
            $acc->access_token = $newAccess;
            $acc->token_type   = data_get($json, 'token_type', $acc->token_type ?: 'Bearer');
            $acc->expires_at   = $expiresIn > 0 ? now()->addSeconds($expiresIn) : null;
        }
        if ($newRefresh) {
            $acc->refresh_token = $newRefresh;
            // (opsional) kalau mau simpan refresh_expires_at, tambahin kolom baru di DB
            // $acc->refresh_expires_at = $refreshExp > 0 ? now()->addSeconds($refreshExp) : null;
        }
        $acc->last_refreshed_at = now();
        $acc->revoked_at = null; // kalau sebelumnya pernah ditandai revoke dan sekarang sukses
        $acc->save();

        return ['updated' => true, 'reauth' => false, 'raw' => $json];
    }
}

