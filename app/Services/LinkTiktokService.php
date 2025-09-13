<?php

// app/Services/LinkTiktokService.php
namespace App\Services;

use App\Models\InfluencerRegistration;
use App\Models\InfluencerSubmission;
use App\Models\InfluencerAccount;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;

class LinkTiktokService
{
    public static function run(string $openId, string $username): int
    {
        $username = ltrim(strtolower($username), '@');

        return DB::transaction(function () use ($openId, $username) {
            // 1) Ambil akun TikTok (token sumber)
            $acc = InfluencerAccount::where('tiktok_user_id', $openId)->first();

            // 2) Temukan semua registration yang perlu dimigrasi → match username & user_id masih pseudo/null
            $regs = InfluencerRegistration::query()
                ->whereRaw('LOWER(tiktok_username) = ?', [$username])
                ->where(function ($q) {
                    $q->whereNull('tiktok_user_id')
                      ->orWhere('tiktok_user_id', 'like', 'pseudo_%')
                      ->orWhere('tiktok_user_id', 'like', 'temp_%');
                })
                ->get();

            $migrated = 0;

            foreach ($regs as $reg) {
                $oldId = $reg->tiktok_user_id;

                // 2a) Update reg → open_id asli
                $reg->tiktok_user_id = $openId;

                // 2b) Copy token dari influencer_accounts (kalau ada)
                if ($acc) {
                    $reg->token_type        = $acc->token_type ?: ($reg->token_type ?: 'Bearer');
                    $reg->access_token      = $acc->access_token;
                    $reg->refresh_token     = $acc->refresh_token;
                    $reg->expires_at        = $acc->expires_at ? Carbon::parse($acc->expires_at) : null;
                    $reg->last_refreshed_at = $acc->last_refreshed_at ?: now();
                    $reg->revoked_at        = null;
                    $reg->scopes            = $acc->scopes ?? [];
                }

                $reg->save();

                // 2c) Update semua submission di campaign tsb yang masih pakai oldId → openId
                if ($oldId) {
                    InfluencerSubmission::where('campaign_id', $reg->campaign_id)
                        ->where('tiktok_user_id', $oldId)
                        ->update(['tiktok_user_id' => $openId]);
                }

                $migrated++;
            }

            return $migrated; // jumlah reg yang dimigrasi
        });
    }
}

