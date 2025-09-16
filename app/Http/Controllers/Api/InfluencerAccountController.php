<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InfluencerAccount;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Http;

class InfluencerAccountController extends Controller
{
    /**
     * GET /api/influencer-accounts
     */
    public function index(Request $request)
    {
        if (Gate::has('submission.viewAny')) {
            Gate::authorize('submission.viewAny');
        }

        $campaignId = $request->integer('campaign_id') ?: null;
        $q          = trim((string) $request->query('q', ''));
        $status     = strtolower((string) $request->query('status', ''));
        $perPage    = (int) max(1, min((int) $request->query('per_page', 20), 100));

        $now = Carbon::now();

        $qb = InfluencerAccount::query();

        if ($campaignId) {
            $qb->whereExists(function ($sub) use ($campaignId) {
                $sub->select(DB::raw(1))
                    ->from('influencer_submissions as s')
                    ->whereColumn('s.tiktok_user_id', 'influencer_accounts.tiktok_user_id')
                    ->where('s.campaign_id', $campaignId);
            });
        }

        if ($q !== '') {
            $qLike = '%' . str_replace(['%','_'], ['\%','\_'], $q) . '%';
            $qb->where(function ($w) use ($qLike) {
                $w->where('tiktok_user_id', 'like', $qLike)
                  ->orWhere('tiktok_username', 'like', $qLike)
                  ->orWhere('full_name', 'like', $qLike);
            });
        }

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
     * POST /api/influencer-accounts/refresh-token   (bulk)
     * Query: ?campaign_id=&only_expired=1
     */
    public function refreshToken(Request $request)
    {
        // Ambil kredensial dari config/env (tidak bergantung ke controller lain)
        $clientKey    = config('services.tiktok.client_key')
                     ?: config('tiktok.client_key')
                     ?: env('TIKTOK_CLIENT_KEY');
        $clientSecret = config('services.tiktok.client_secret')
                     ?: config('tiktok.client_secret')
                     ?: env('TIKTOK_CLIENT_SECRET');

        // Fallback opsional: kalau kamu memang punya class TikTokAuthController dengan konstanta
        if (!$clientKey || !$clientSecret) {
            if (class_exists(\App\Http\Controllers\TikTokAuthController::class)) {
                // gunakan @ silencing kalau konstanta tidak ada
                $clientKey    = $clientKey    ?: @\App\Http\Controllers\TikTokAuthController::CLIENT_KEY;
                $clientSecret = $clientSecret ?: @\App\Http\Controllers\TikTokAuthController::CLIENT_SECRET;
            }
        }

        if (!$clientKey || !$clientSecret) {
            return response()->json([
                'message' => 'Konfigurasi TikTok belum lengkap (client_key / client_secret).',
            ], 500);
        }

        $campaignId  = $request->query('campaign_id');
        $onlyExpired = (bool) $request->boolean('only_expired', false);

        $q = InfluencerAccount::query()
            ->whereNull('revoked_at')
            ->whereNotNull('refresh_token');

        if ($onlyExpired) {
            $q->whereNotNull('expires_at')->where('expires_at', '<=', now());
        }

        if ($campaignId) {
            $q->whereExists(function ($sub) use ($campaignId) {
                $sub->select(DB::raw(1))
                    ->from('influencer_registrations as ir')
                    ->whereColumn('ir.tiktok_user_id', 'influencer_accounts.tiktok_user_id')
                    ->where('ir.campaign_id', $campaignId);
            });
        }

        $summary = [
            'total'          => InfluencerAccount::count(),
            'candidates'     => (clone $q)->count(),
            'refreshed'      => 0,
            'skipped'        => 0,
            'failed'         => 0,
            'revoked_marked' => 0,
        ];

        $errors = [];
        $start  = microtime(true);

        $http = Http::asForm()
            ->timeout(20)
            ->retry(3, 500, function ($exception, $request) {
                $resp   = method_exists($exception, 'response') ? $exception->response : null;
                $status = $resp ? $resp->status() : null;
                if ($status === 429) {
                    $ra = (int) ($resp->header('Retry-After') ?? 0);
                    if ($ra > 0) usleep($ra * 1_000_000);
                    return true;
                }
                return $status && $status >= 500;
            });

        $q->orderBy('id')->chunkById(100, function ($rows) use ($http, $clientKey, $clientSecret, &$summary, &$errors) {
            foreach ($rows as $acc) {
                if (!$acc->refresh_token) { $summary['skipped']++; continue; }

                try {
                    $resp = $http->post('https://open.tiktokapis.com/v2/oauth/token/', [
                        'client_key'    => $clientKey,
                        'client_secret' => $clientSecret,
                        'grant_type'    => 'refresh_token',
                        'refresh_token' => $acc->refresh_token,
                    ]);

                    $json = $resp->json() ?? [];

                    $access  = data_get($json, 'data.access_token')  ?? data_get($json, 'access_token');
                    $refresh = data_get($json, 'data.refresh_token') ?? data_get($json, 'refresh_token');
                    $type    = data_get($json, 'data.token_type')     ?? data_get($json, 'token_type') ?? 'Bearer';
                    $expIn   = (int) (data_get($json, 'data.expires_in') ?? data_get($json, 'expires_in') ?? 0);

                    if ($resp->failed() || !$access) {
                        $code   = data_get($json, 'error.code') ?? data_get($json, 'code') ?? 'unknown_error';
                        $msg    = data_get($json, 'error.message') ?? data_get($json, 'message') ?? 'Refresh token gagal';
                        $logId  = $resp->header('x-tt-logid');

                        $fatal = ['invalid_grant','refresh_token_invalid','refresh_token_expired','access_token_invalid'];
                        if (in_array($code, $fatal, true)) {
                            if (!$acc->revoked_at) {
                                $acc->revoked_at = now();
                                $acc->save();
                                $summary['revoked_marked']++;
                            }
                        }

                        $summary['failed']++;
                        if (count($errors) < 25) {
                            $errors[] = [
                                'id'             => $acc->id,
                                'tiktok_user_id' => $acc->tiktok_user_id,
                                'code'           => $code,
                                'message'        => $msg,
                                'log_id'         => $logId,
                                'http_status'    => $resp->status(),
                            ];
                        }
                        continue;
                    }

                    $acc->access_token      = $access;
                    if ($refresh) $acc->refresh_token = $refresh;
                    $acc->token_type        = $type ?: ($acc->token_type ?: 'Bearer');
                    $acc->expires_at        = $expIn > 0 ? now()->addSeconds($expIn) : now()->addHours(1);
                    $acc->last_refreshed_at = now();
                    if ($acc->revoked_at) $acc->revoked_at = null;
                    $acc->save();

                    $summary['refreshed']++;

                } catch (\Throwable $e) {
                    $summary['failed']++;
                    if (count($errors) < 25) {
                        $errors[] = [
                            'id'             => $acc->id,
                            'tiktok_user_id' => $acc->tiktok_user_id,
                            'message'        => $e->getMessage(),
                        ];
                    }
                }
            }
        });

        return response()->json([
            'message' => 'Bulk refresh token selesai.',
            'summary' => $summary,
            'took_ms' => (int) ((microtime(true) - $start) * 1000),
            'errors'  => $errors,
        ]);
    }

    /**
     * POST /api/influencer-accounts/{account}/refresh-token   (single)
     */
    public function refreshTokenSingle(Request $request, InfluencerAccount $account)
    {
        $clientKey    = config('services.tiktok.client_key')
                     ?: config('tiktok.client_key')
                     ?: env('TIKTOK_CLIENT_KEY');
        $clientSecret = config('services.tiktok.client_secret')
                     ?: config('tiktok.client_secret')
                     ?: env('TIKTOK_CLIENT_SECRET');

        if (!$clientKey || !$clientSecret) {
            // fallback opsional
            if (class_exists(\App\Http\Controllers\TikTokAuthController::class)) {
                $clientKey    = $clientKey    ?: @\App\Http\Controllers\TikTokAuthController::CLIENT_KEY;
                $clientSecret = $clientSecret ?: @\App\Http\Controllers\TikTokAuthController::CLIENT_SECRET;
            }
        }

        if (!$clientKey || !$clientSecret) {
            return response()->json([
                'message' => 'Konfigurasi TikTok belum lengkap (client_key / client_secret).',
            ], 500);
        }

        if ($account->revoked_at) {
            return response()->json([
                'message' => 'Akun ini sudah ditandai revoked. Minta KOL connect ulang.',
            ], 409);
        }

        if (!$account->refresh_token) {
            return response()->json([
                'message' => 'Refresh token tidak tersedia untuk akun ini.',
            ], 422);
        }

        $resp = Http::asForm()
            ->timeout(20)
            ->retry(3, 500, function ($exception, $request) {
                $resp   = method_exists($exception, 'response') ? $exception->response : null;
                $status = $resp ? $resp->status() : null;
                if ($status === 429) {
                    $ra = (int) ($resp->header('Retry-After') ?? 0);
                    if ($ra > 0) usleep($ra * 1_000_000);
                    return true;
                }
                return $status && $status >= 500;
            })
            ->post('https://open.tiktokapis.com/v2/oauth/token/', [
                'client_key'    => $clientKey,
                'client_secret' => $clientSecret,
                'grant_type'    => 'refresh_token',
                'refresh_token' => $account->refresh_token,
            ]);

        $json = $resp->json() ?? [];

        $access  = data_get($json, 'data.access_token')  ?? data_get($json, 'access_token');
        $refresh = data_get($json, 'data.refresh_token') ?? data_get($json, 'refresh_token');
        $type    = data_get($json, 'data.token_type')     ?? data_get($json, 'token_type') ?? 'Bearer';
        $expIn   = (int) (data_get($json, 'data.expires_in') ?? data_get($json, 'expires_in') ?? 0);

        if ($resp->failed() || !$access) {
            $code  = data_get($json, 'error.code') ?? data_get($json, 'code') ?? 'unknown_error';
            $msg   = data_get($json, 'error.message') ?? data_get($json, 'message') ?? 'Refresh token gagal';
            $logId = $resp->header('x-tt-logid');

            $fatal = ['invalid_grant','refresh_token_invalid','refresh_token_expired','access_token_invalid'];
            if (in_array($code, $fatal, true)) {
                if (!$account->revoked_at) {
                    $account->revoked_at = now();
                    $account->save();
                }
            }

            return response()->json([
                'message'     => $msg,
                'error_code'  => $code,
                'log_id'      => $logId,
                'http_status' => $resp->status(),
            ], 422);
        }

        $account->access_token      = $access;
        if ($refresh) $account->refresh_token = $refresh;
        $account->token_type        = $type ?: ($account->token_type ?: 'Bearer');
        $account->expires_at        = $expIn > 0 ? now()->addSeconds($expIn) : now()->addHours(1);
        $account->last_refreshed_at = now();
        if ($account->revoked_at) $account->revoked_at = null;
        $account->save();

        return response()->json([
            'message' => 'Token berhasil diperbarui.',
            'data'    => $account->fresh(),
        ]);
    }
}
