<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InfluencerAccount;
use App\Models\InfluencerSubmission;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Http;

class InfluencerAccountController extends Controller
{
    /**
     * GET /api/influencer-accounts
     * Query params:
     * - campaign_id (optional): filter KOL yang punya submission di campaign tsb
     * - q (optional): cari by nama/username/open_id
     * - status (optional): active | expired | revoked
     * - per_page (default 20, max 100)
     */
    public function index(Request $request)
    {
        // (opsional) permission; sesuaikan dengan policy lo
        if (Gate::has('submission.viewAny')) {
            Gate::authorize('submission.viewAny');
        }

        $campaignId = $request->integer('campaign_id') ?: null;
        $q          = trim((string) $request->query('q', ''));
        $status     = strtolower((string) $request->query('status', ''));
        $perPage    = (int) max(1, min((int) $request->query('per_page', 20), 100));

        $now = Carbon::now();

        $qb = InfluencerAccount::query();

        // Filter per campaign: hanya akun yang punya submission pada campaign tersebut
        if ($campaignId) {
            $qb->whereExists(function ($sub) use ($campaignId) {
                $sub->select(DB::raw(1))
                    ->from('influencer_submissions as s')
                    ->whereColumn('s.tiktok_user_id', 'influencer_accounts.tiktok_user_id')
                    ->where('s.campaign_id', $campaignId);
            });
        }

        // Keyword search
        if ($q !== '') {
            $qLike = '%' . str_replace(['%','_'], ['\%','\_'], $q) . '%';
            $qb->where(function ($w) use ($q, $qLike) {
                $w->where('tiktok_user_id', 'like', $qLike)
                  ->orWhere('tiktok_username', 'like', $qLike)
                  ->orWhere('full_name', 'like', $qLike);
            });
        }

        // Status filter
        if (in_array($status, ['active','expired','revoked'], true)) {
            $qb->when($status === 'revoked', function ($w) {
                $w->whereNotNull('revoked_at');
            })->when($status === 'active', function ($w) use ($now) {
                $w->whereNull('revoked_at')
                  ->whereNotNull('access_token')
                  ->where(function ($x) use ($now) {
                      $x->whereNull('expires_at')
                        ->orWhere('expires_at', '>', $now);
                  });
            })->when($status === 'expired', function ($w) use ($now) {
                $w->whereNull('revoked_at')
                  ->whereNotNull('expires_at')
                  ->where('expires_at', '<=', $now);
            });
        }

        $qb->orderByDesc('last_refreshed_at')->orderByDesc('updated_at');

        $p = $qb->paginate($perPage);

        // Tambahkan computed field "token_status" di payload (biar enak ditampilin)
        $items = collect($p->items())->map(function ($acc) use ($now) {
            $status = 'unknown';
            if ($acc->revoked_at) {
                $status = 'revoked';
            } elseif ($acc->access_token) {
                if (!$acc->expires_at || Carbon::parse($acc->expires_at)->gt($now)) {
                    $status = 'active';
                } else {
                    $status = 'expired';
                }
            } else {
                $status = 'missing';
            }

            return array_merge($acc->toArray(), [
                'token_status' => $status,
            ]);
        })->values();

        return response()->json([
            'data'         => $items,
            'current_page' => $p->currentPage(),
            'last_page'    => $p->lastPage(),
            'per_page'     => $p->perPage(),
            'total'        => $p->total(),
        ]);
    }

    /**
     * POST /api/influencer-accounts/{id}/refresh-token
     * Admin-triggered refresh menggunakan refresh_token yang tersimpan.
     */
    public function refreshToken(Request $request, $id)
    {
        // (opsional) permission
        if (Gate::has('submission.update')) {
            Gate::authorize('submission.update');
        }

        $acc = InfluencerAccount::findOrFail($id);

        // Cek prerequisite
        if ($acc->revoked_at) {
            return response()->json([
                'message' => 'Token sudah dicabut (revoked). Mohon re-authorize.',
                'reauth_url' => url('/auth/tiktok/reset?force=1'),
            ], 409);
        }

        if (!$acc->refresh_token) {
            return response()->json([
                'message' => 'Refresh token tidak tersedia. Minta KOL connect ulang.',
                'reauth_url' => url('/auth/tiktok/reset?force=1'),
            ], 409);
        }

        $clientKey    = config('tiktok.client_key') ?? config('services.tiktok.client_key') ?? env('TIKTOK_CLIENT_KEY');
        $clientSecret = config('tiktok.client_secret') ?? config('services.tiktok.client_secret') ?? env('TIKTOK_CLIENT_SECRET');

        if (!$clientKey || !$clientSecret) {
            return response()->json([
                'message' => 'Konfigurasi TikTok client_key/client_secret belum di-set.',
            ], 500);
        }

        // 1) Refresh token
        $tokenUrl = rtrim(config('tiktok.oauth_base', 'https://open.tiktokapis.com'), '/') . '/v2/oauth/token/';
        $tokenDebug = [];

        try {
            $res = Http::asForm()
                ->timeout(20)
                ->retry(2, 500)
                ->post($tokenUrl, [
                    'client_key'    => $clientKey,
                    'client_secret' => $clientSecret,
                    'grant_type'    => 'refresh_token',
                    'refresh_token' => $acc->refresh_token,
                ]);

            $tokenDebug = [
                'status' => $res->status(),
                'json'   => $res->json(),
                'headers'=> [
                    'content-type' => $res->header('content-type'),
                    'x-tt-logid'   => $res->header('x-tt-logid'),
                ],
            ];

            if ($res->failed()) {
                // 409 agar UI bisa munculin tombol reauth
                return response()->json([
                    'message'    => data_get($res->json(), 'error.message') ?: 'Gagal refresh token TikTok.',
                    'error_code' => data_get($res->json(), 'error.code'),
                    'reauth_url' => url('/auth/tiktok/reset?force=1'),
                    'hints'      => ['debug' => ['token' => $tokenDebug]],
                ], in_array($res->status(), [400,401,403], true) ? 409 : 502);
            }

            $body = $res->json() ?: [];

            $newAccess  = (string) data_get($body, 'access_token');
            $newRefresh = (string) (data_get($body, 'refresh_token') ?: $acc->refresh_token);
            $tokenType  = (string) (data_get($body, 'token_type') ?: 'Bearer');
            $expiresIn  = (int)    (data_get($body, 'expires_in') ?: data_get($body, 'access_token_expires_in') ?: 0);

            if (!$newAccess) {
                return response()->json([
                    'message' => 'Response refresh tidak mengandung access_token.',
                    'hints'   => ['debug' => ['token' => $tokenDebug]],
                ], 502);
            }

            $acc->token_type        = $tokenType ?: 'Bearer';
            $acc->access_token      = $newAccess;
            $acc->refresh_token     = $newRefresh ?: $acc->refresh_token;
            $acc->expires_at        = $expiresIn > 0 ? Carbon::now()->addSeconds($expiresIn) : null;
            $acc->last_refreshed_at = Carbon::now();
            // scope biasanya tidak dikembalikan saat refresh; biarkan apa adanya
            $acc->save();
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Exception saat refresh token: '.$e->getMessage(),
            ], 502);
        }

        // 2) (Opsional) Verify & update profile (username, display_name, avatar)
        $meDebug = [];
        try {
            $meRes = Http::withToken($acc->access_token)
                ->acceptJson()
                ->timeout(15)
                ->get('https://open.tiktokapis.com/v2/user/info/', [
                    'fields' => 'open_id,username,display_name,avatar_url',
                ]);

            $meDebug = [
                'status' => $meRes->status(),
                'json'   => $meRes->json(),
                'headers'=> [
                    'content-type' => $meRes->header('content-type'),
                    'x-tt-logid'   => $meRes->header('x-tt-logid'),
                ],
            ];

            if ($meRes->ok()) {
                $acc->tiktok_user_id  = data_get($meRes->json(), 'data.user.open_id') ?: $acc->tiktok_user_id;
                $acc->tiktok_username = data_get($meRes->json(), 'data.user.username') ?: $acc->tiktok_username;
                $acc->full_name       = data_get($meRes->json(), 'data.user.display_name') ?: $acc->full_name;
                $acc->avatar_url      = data_get($meRes->json(), 'data.user.avatar_url') ?: $acc->avatar_url;
                $acc->save();
            }
        } catch (\Throwable $e) {
            // diamkan; ini hanya enrichment
            $meDebug['exception'] = $e->getMessage();
        }

        return response()->json([
            'message' => 'Token berhasil di-refresh.',
            'data'    => $acc->fresh(),
            'hints'   => [
                'debug' => [
                    'token' => $tokenDebug,
                    'me'    => $meDebug,
                ],
            ],
        ]);
    }
}
