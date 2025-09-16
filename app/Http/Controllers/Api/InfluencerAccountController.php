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
    public function refreshToken(Request $request)
    {
        $clientKey    = TikTokAuthController::CLIENT_KEY;
        $clientSecret = TikTokAuthController::CLIENT_SECRET;

        

        if (!$clientKey || !$clientSecret) {
            return response()->json([
                'message' => 'Konfigurasi TikTok belum lengkap (client_key / client_secret).',
            ], 500);
        }

        // Optional filter dari query:
        // - ?campaign_id=123  -> hanya akun yang pernah registrasi ke campaign tsb
        // - ?only_expired=1   -> hanya yang expired (expires_at <= now)
        $campaignId  = $request->query('campaign_id');
        $onlyExpired = (bool) $request->boolean('only_expired', false);

        $q = InfluencerAccount::query()
            ->whereNull('revoked_at')
            ->whereNotNull('refresh_token');

        if ($onlyExpired) {
            $q->whereNotNull('expires_at')->where('expires_at', '<=', now());
        }

        if ($campaignId) {
            // batasi hanya akun yang pernah daftar di campaign tsb
            $q->whereExists(function ($sub) use ($campaignId) {
                $sub->select(DB::raw(1))
                    ->from('influencer_registrations as ir')
                    ->whereColumn('ir.tiktok_user_id', 'influencer_accounts.tiktok_user_id')
                    ->where('ir.campaign_id', $campaignId);
            });
        }

        $totalCandidates = (clone $q)->count();

        $summary = [
            'total'          => InfluencerAccount::count(),
            'candidates'     => $totalCandidates,
            'refreshed'      => 0,
            'skipped'        => 0,
            'failed'         => 0,
            'revoked_marked' => 0,
        ];

        $errors   = [];
        $start    = microtime(true);

        // HTTP client reusable
        $http = Http::asForm()
            ->timeout(20)
            ->retry(3, 500, function ($exception, $request) {
                // retry untuk 429/5xx/network error
                $resp   = method_exists($exception, 'response') ? $exception->response : null;
                $status = $resp ? $resp->status() : null;
                if ($status === 429) {
                    $ra = (int) ($resp->header('Retry-After') ?? 0);
                    if ($ra > 0) usleep($ra * 1_000_000);
                    return true;
                }
                return $status && $status >= 500;
            });

        // Proses bertahap untuk hemat memori & hindari timeout
        $q->orderBy('id')->chunkById(100, function ($rows) use ($http, $clientKey, $clientSecret, &$summary, &$errors) {
            foreach ($rows as $acc) {
                // Safety skip kalau tidak ada refresh_token (harusnya sudah difilter)
                if (!$acc->refresh_token) { $summary['skipped']++; continue; }

                try {
                    $resp = $http->post('https://open.tiktokapis.com/v2/oauth/token/', [
                        'client_key'    => $clientKey,
                        'client_secret' => $clientSecret,
                        'grant_type'    => 'refresh_token',
                        'refresh_token' => $acc->refresh_token,
                    ]);

                    $json = $resp->json() ?? [];

                    // Extract generic fields (beberapa SDK taruh di root, ada yg di data.*)
                    $access  = data_get($json, 'data.access_token')  ?? data_get($json, 'access_token');
                    $refresh = data_get($json, 'data.refresh_token') ?? data_get($json, 'refresh_token');
                    $type    = data_get($json, 'data.token_type')     ?? data_get($json, 'token_type') ?? 'Bearer';
                    $expIn   = (int) (data_get($json, 'data.expires_in') ?? data_get($json, 'expires_in') ?? 0);

                    if ($resp->failed() || !$access) {
                        // Tangkap error code/message dari TikTok
                        $code   = data_get($json, 'error.code') ?? data_get($json, 'code') ?? 'unknown_error';
                        $msg    = data_get($json, 'error.message') ?? data_get($json, 'message') ?? 'Refresh token gagal';
                        $logId  = $resp->header('x-tt-logid');

                        // Kalau refresh token invalid/expired ⇒ mark revoked
                        $fatalCodes = ['invalid_grant','refresh_token_invalid','refresh_token_expired','access_token_invalid'];
                        if (in_array($code, $fatalCodes, true)) {
                            // jangan overwrite kalau sudah ada
                            if (!$acc->revoked_at) {
                                $acc->revoked_at = now();
                                $acc->save();
                                $summary['revoked_marked']++;
                            }
                        }

                        $summary['failed']++;
                        if (count($errors) < 25) {
                            $errors[] = [
                                'id'              => $acc->id,
                                'tiktok_user_id'  => $acc->tiktok_user_id,
                                'code'            => $code,
                                'message'         => $msg,
                                'log_id'          => $logId,
                                'http_status'     => $resp->status(),
                            ];
                        }
                        continue;
                    }

                    // Sukses → update kolom
                    $acc->access_token       = $access;
                    if ($refresh) {
                        $acc->refresh_token  = $refresh;
                    }
                    $acc->token_type         = $type ?: ($acc->token_type ?: 'Bearer');
                    $acc->expires_at         = $expIn > 0 ? now()->addSeconds($expIn) : now()->addHours(1);
                    $acc->last_refreshed_at  = now();
                    // Kalau sebelumnya sempat ditandai revoked tapi sekarang berhasil, anggap pulih
                    if ($acc->revoked_at) {
                        $acc->revoked_at = null;
                    }
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

        $tookMs = (int) ((microtime(true) - $start) * 1000);

        return response()->json([
            'message' => 'Bulk refresh token selesai.',
            'summary' => $summary,
            'took_ms' => $tookMs,
            // Ditrim biar response gak kebanyakan. Ambil maksimal 25 error.
            'errors'  => $errors,
        ]);
    }
}
