<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InfluencerSubmission;
use App\Models\Campaign;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Validator;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Carbon;

use App\Models\InfluencerAccount; // tabel opsi B
use App\Models\InfluencerRegistration; // fallback token kalau perlu
use Illuminate\Routing\Attributes\Middleware;

use App\Exports\InfluencerSubmissionsExport;
use Maatwebsite\Excel\Facades\Excel;


class InfluencerSubmissionController extends Controller
{
    /**
     * GET /api/influencer-submissions
     * Filter opsional: tiktok_user_id, campaign_id; include=campaign; per_page
     */
    // === KONFIG TIKTOK (ambil dari config/services kalau ada) ===
    private function tiktokClientKey(): string
    {
        return config('services.tiktok.client_key', 'sbawru1jwiig13smtm'); // fallback demo
    }
    private function tiktokClientSecret(): string
    {
        return config('services.tiktok.client_secret', 'm7IRftc8Lpu6CUFmgzezQxWO8HJYyKf3'); // fallback demo
    }
    private const TIKTOK_TOKEN_URL     = 'https://open.tiktokapis.com/v2/oauth/token/';
    private const TIKTOK_VIDEO_LIST_URL= 'https://open.tiktokapis.com/v2/video/list/';

    // === Helper: ambil video_id dari URL TikTok ===
    private function extractVideoId(?string $url): ?string
    {
        if (!$url) return null;
        // format umum: https://www.tiktok.com/@handle/video/7548495147772710151
        if (preg_match('~tiktok\.com/@[^/]+/video/(\d+)~i', $url, $m)) {
            return $m[1];
        }
        // kalau user sudah isi langsung angka id
        if (preg_match('~^\d{15,}$~', $url)) {
            return $url;
        }
        return null;
    }

    // === Ambil token bundle utk open_id ===
    // Prefer: tabel/kolom di InfluencerRegistration (karena kamu sudah simpan di sana).
    // Kalau kamu punya model InfluencerAccount, kamu bisa tambahkan fallback ke sana.
    private function getTokenSourceForOpenId(string $openId): ?\App\Models\InfluencerRegistration
    {
        return \App\Models\InfluencerRegistration::query()
            ->where('tiktok_user_id', $openId)
            ->whereNotNull('access_token')
            ->orderByDesc('last_refreshed_at')
            ->orderByDesc('updated_at')
            ->first();
    }

    // === Refresh token kalau kadaluarsa/akan kadaluarsa ===
    private function ensureValidAccessToken(\App\Models\InfluencerRegistration $src): ?array
    {
        $access  = $src->access_token ?? null;
        $refresh = $src->refresh_token ?? null;
        $expAt   = $src->expires_at ? Carbon::parse($src->expires_at) : null;

        // masih valid > 60 detik → pakai
        if ($access && $expAt && $expAt->gt(now()->addSeconds(60))) {
            return [
                'access_token'  => $access,
                'refresh_token' => $refresh,
                'expires_at'    => $expAt,
            ];
        }

        // kalau tidak ada refresh_token → tidak bisa refresh
        if (!$refresh) {
            return $access ? [
                'access_token'  => $access,
                'refresh_token' => null,
                'expires_at'    => $expAt,
            ] : null;
        }

        // refresh
        $resp = Http::asForm()->post(self::TIKTOK_TOKEN_URL, [
            'client_key'    => $this->tiktokClientKey(),
            'client_secret' => $this->tiktokClientSecret(),
            'grant_type'    => 'refresh_token',
            'refresh_token' => $refresh,
        ]);

        if (!$resp->ok()) {
            Log::warning('tiktok_refresh_failed', ['status'=>$resp->status(), 'body'=>$resp->json()]);
            // kalau gagal refresh tapi access lama masih ada → coba pakai
            return $access ? [
                'access_token'  => $access,
                'refresh_token' => $refresh,
                'expires_at'    => $expAt,
            ] : null;
        }

        $data = $resp->json();
        $newAccess   = $data['access_token']  ?? null;
        $newRefresh  = $data['refresh_token'] ?? $refresh;
        $expiresIn   = (int)($data['expires_in'] ?? 0);

        if ($newAccess) {
            // simpan ke source row
            $src->access_token      = $newAccess;
            $src->refresh_token     = $newRefresh;
            $src->expires_at        = $expiresIn ? now()->addSeconds($expiresIn) : null;
            $src->last_refreshed_at = now();
            $src->revoked_at        = null;
            $src->save();

            return [
                'access_token'  => $newAccess,
                'refresh_token' => $newRefresh,
                'expires_at'    => $src->expires_at,
            ];
        }

        return null;
    }

    // === Panggil video.list dan cari statistik utk id yang diminta ===
    private function fetchStatsForVideoIds(string $accessToken, array $videoIdsWanted): array
    {
        $wanted = array_values(array_unique(array_filter($videoIdsWanted)));
        if (!$wanted) return [];

        $found = [];
        $cursor = 0;
        $maxPages = 25; // batas aman

        while ($maxPages-- > 0) {
            $resp = Http::withToken($accessToken)
                ->acceptJson()
                ->post(self::TIKTOK_VIDEO_LIST_URL, [
                    // field kemungkinan berbeda versi API; kita coba yang umum
                    'fields'    => 'id,statistics,create_time',
                    'max_count' => 20,
                    'cursor'    => $cursor,
                ]);

            if (!$resp->ok()) {
                Log::warning('tiktok_video_list_failed', ['status'=>$resp->status(), 'body'=>$resp->json()]);
                break;
            }

            $body   = $resp->json();
            $videos = data_get($body, 'data.videos', data_get($body, 'data.items', []));

            foreach ($videos as $v) {
                $vid = data_get($v, 'id', data_get($v, 'video_id'));
                if (!$vid) continue;
                if (!in_array($vid, $wanted, true)) continue;

                $stats = data_get($v, 'statistics', data_get($v, 'stats', []));
                $found[$vid] = [
                    'views'    => data_get($stats, 'play_count', data_get($stats, 'view_count')),
                    'likes'    => data_get($stats, 'digg_count', data_get($stats, 'like_count')),
                    'comments' => data_get($stats, 'comment_count'),
                    'shares'   => data_get($stats, 'share_count'),
                ];
            }

            if (count($found) === count($wanted)) {
                break; // semua sudah ketemu
            }

            $hasMore = (bool) data_get($body, 'data.has_more', false);
            $cursor  = (int) data_get($body, 'data.cursor', 0);
            if (!$hasMore) break;
        }

        return $found; // key: video_id
    }

    protected function parseVideoIdFromUrl(?string $url): ?string
{
    if (!$url) return null;
    if (preg_match('~tiktok\.com/.*/video/(\d+)~i', $url, $m)) return $m[1];
    if (preg_match('~(\d{18,20})~', $url, $m)) return $m[1]; // fallback
    return null;
}

protected function parseHandleFromUrl(?string $url): ?string
{
    if (!$url) return null;
    if (preg_match('~tiktok\.com/@([^/]+)/video/~i', $url, $m)) return strtolower($m[1]);
    return null;
}

    /** Ambil access token untuk open_id. Prioritas: influencer_accounts → registrations */
    protected function getAccessTokenBundle(string $openId): ?array
{
    if ($acc = InfluencerAccount::where('tiktok_user_id', $openId)->first()) {
        return [
            'access_token'  => $acc->access_token,
            'refresh_token' => $acc->refresh_token,
            'expires_at'    => $acc->expires_at ? Carbon::parse($acc->expires_at) : null,
            'token_type'    => $acc->token_type ?: 'Bearer',
            'model'         => $acc,
            'source'        => 'accounts',
        ];
    }

    $reg = InfluencerRegistration::where('tiktok_user_id', $openId)
        ->whereNotNull('access_token')
        ->orderByDesc('last_refreshed_at')
        ->orderByDesc('updated_at')
        ->first();

    if ($reg) {
        return [
            'access_token'  => $reg->access_token,
            'refresh_token' => $reg->refresh_token,
            'expires_at'    => $reg->expires_at ? Carbon::parse($reg->expires_at) : null,
            'token_type'    => $reg->token_type ?: 'Bearer',
            'model'         => $reg,
            'source'        => 'registrations',
        ];
    }
    return null;
}

    /** Refresh access_token jika expired; simpan balik ke model sumber */
    protected function ensureFreshToken(array $bundle): array
{
    $exp = $bundle['expires_at'] ?? null;
    if ($exp instanceof Carbon && $exp->gt(now()->addMinutes(2))) {
        return $bundle; // masih valid
    }

    $refresh = $bundle['refresh_token'] ?? null;
    $model   = $bundle['model'] ?? null;
    if (!$refresh || !$model) return $bundle;

    try {
        $resp = Http::asForm()->post('https://open.tiktokapis.com/v2/oauth/token/', [
            'client_key'    => TikTokAuthController::CLIENT_KEY,
            'client_secret' => TikTokAuthController::CLIENT_SECRET,
            'grant_type'    => 'refresh_token',
            'refresh_token' => $refresh,
        ]);
        if ($resp->ok()) {
            $j = $resp->json();
            $model->access_token      = $j['access_token'] ?? $model->access_token;
            $model->refresh_token     = $j['refresh_token'] ?? $model->refresh_token;
            $model->expires_at        = isset($j['expires_in']) ? now()->addSeconds((int)$j['expires_in']) : $model->expires_at;
            $model->last_refreshed_at = now();
            $model->save();

            $bundle['access_token'] = $model->access_token;
            $bundle['refresh_token']= $model->refresh_token;
            $bundle['expires_at']   = $model->expires_at ? Carbon::parse($model->expires_at) : null;
        } else {
            Log::warning('tiktok_refresh_failed', ['status'=>$resp->status(),'body'=>$resp->json()]);
        }
    } catch (\Throwable $e) {
        Log::error('tiktok_refresh_exception', ['err'=>$e->getMessage()]);
    }
    return $bundle;
}

protected function queryVideoStatsByIds(array $videoIds, string $accessToken): array
{
    $stats = [];
    try {
        $resp = Http::withToken($accessToken)->acceptJson()
            ->post('https://open.tiktokapis.com/v2/video/query/', [
                'filters' => ['video_ids' => array_values($videoIds)],
                'fields'  => 'video_id,view_count,like_count,comment_count,share_count,author_open_id',
            ]);
        if ($resp->ok()) {
            foreach ((array) data_get($resp->json(), 'data.videos', []) as $it) {
                $vid = (string) data_get($it, 'video_id');
                if (!$vid) continue;
                $stats[$vid] = [
                    'view'          => data_get($it, 'view_count'),
                    'like'          => data_get($it, 'like_count'),
                    'comment'       => data_get($it, 'comment_count'),
                    'share'         => data_get($it, 'share_count'),
                    'author_open_id'=> data_get($it, 'author_open_id'),
                ];
            }
        } else {
            Log::warning('tiktok_video_query_failed', ['status'=>$resp->status(),'body'=>$resp->json()]);
        }
    } catch (\Throwable $e) {
        Log::error('tiktok_video_query_exception', ['err'=>$e->getMessage()]);
    }
    return $stats;
}

protected function listAndScanStats(string $openId, array $videoIds, string $accessToken): array
{
    $found = [];
    $need  = array_fill_keys($videoIds, true);
    $cursor = 0;

    for ($page=0; $page<3 && count($need)>0; $page++) {
        $resp = Http::withToken($accessToken)->acceptJson()
            ->post('https://open.tiktokapis.com/v2/video/list/', [
                'creator_id' => $openId,
                'max_count'  => 50,
                'cursor'     => $cursor,
                'fields'     => 'video_id,view_count,like_count,comment_count,share_count',
            ]);
        if (!$resp->ok()) {
            Log::warning('tiktok_video_list_failed', ['status'=>$resp->status(),'body'=>$resp->json()]);
            break;
        }

        $j = $resp->json();
        $items  = (array) (data_get($j, 'data.videos') ?? data_get($j, 'data.items', []));
        $cursor = data_get($j, 'data.cursor', null);
        $hasMore= (bool) data_get($j, 'data.has_more', false);

        foreach ($items as $it) {
            $vid = (string) data_get($it, 'video_id');
            if (!isset($need[$vid])) continue;

            $found[$vid] = [
                'view'    => data_get($it, 'view_count'),
                'like'    => data_get($it, 'like_count'),
                'comment' => data_get($it, 'comment_count'),
                'share'   => data_get($it, 'share_count'),
            ];
            unset($need[$vid]);
        }

        if (!$hasMore || !$cursor) break;
    }
    return $found;
}

protected function oembedAuthor(?string $url): ?array
{
    if (!$url) return null;
    try {
        $r = Http::timeout(8)->get('https://www.tiktok.com/oembed', ['url'=>$url]);
        return $r->ok() ? $r->json() : null;
    } catch (\Throwable $e) {
        return null;
    }
}

    /** Ambil metrik video untuk open_id (creator) & daftar video_id; return map video_id => stats */
    protected function fetchVideoStats(string $openId, array $videoIds, string $accessToken): array
    {
        $found = [];
        $want  = array_fill_keys($videoIds, true);
        $cursor = 0;

        // ambil per halaman max 50 sampai ketemu semua / 3 page
        for ($page = 0; $page < 3 && count($want) > 0; $page++) {
            $resp = Http::withToken($accessToken)
                ->acceptJson()
                ->post('https://open.tiktokapis.com/v2/video/list/', [
                    // per dokumentasi: creator_id + fields
                    'creator_id' => $openId,
                    'max_count'  => 50,
                    'cursor'     => $cursor,
                    'fields'     => 'video_id,view_count,like_count,comment_count,share_count',
                ]);

            if (!$resp->ok()) {
                Log::warning('tiktok_video_list_failed', ['status' => $resp->status(), 'body' => $resp->json()]);
                break;
            }

            $j = $resp->json();
            $items  = data_get($j, 'data.videos', data_get($j, 'data.items', []));
            $cursor = data_get($j, 'data.cursor', null);
            $hasMore= data_get($j, 'data.has_more', false);

            foreach ($items as $it) {
                $vid = (string) data_get($it, 'video_id');
                if (!isset($want[$vid])) continue;

                $found[$vid] = [
                    'view'    => data_get($it, 'view_count'),
                    'like'    => data_get($it, 'like_count'),
                    'comment' => data_get($it, 'comment_count'),
                    'share'   => data_get($it, 'share_count'),
                ];
                unset($want[$vid]);
            }

            if (!$hasMore || !$cursor) break;
        }

        return $found;
    }


    // === Endpoint utama: refresh metrics ===
    public function refreshMetrics(Request $request, $id)
    {
        $submission = \App\Models\InfluencerSubmission::findOrFail($id);

        // --- Ambil token milik owner open_id ini (sesuaikan kalau pakai influencer_accounts)
        $reg = \App\Models\InfluencerRegistration::where('tiktok_user_id', $submission->tiktok_user_id)
            ->whereNotNull('access_token')
            ->orderByDesc('last_refreshed_at')
            ->orderByDesc('updated_at')
            ->first();

        if (!$reg) {
            return response()->json([
                'message' => 'Token TikTok tidak ditemukan untuk influencer ini. Minta KOL connect ulang.',
                'reauth_url' => url('/auth/tiktok/reset?campaign_id='.$submission->campaign_id.'&force=1'),
            ], 409);
        }

        $accessToken = $reg->access_token;
        $scopes      = (array) ($reg->scopes ?? []);
        if (!in_array('video.list', $scopes, true)) {
            return response()->json([
                'message' => 'Token tidak punya scope video.list. Minta KOL re-authorize & centang izin video.',
                'reauth_url' => url('/auth/tiktok/reset?campaign_id='.$submission->campaign_id.'&force=1'),
                'current_scopes' => $scopes,
            ], 409);
        }

        // --- Identitas owner token (buat debug)
        $meResp = \Http::withToken($accessToken)->acceptJson()
            ->get('https://open.tiktokapis.com/v2/user/info/', ['fields' => 'open_id,username,display_name']);
        $tokenOwner = [
            'open_id'      => data_get($meResp->json(), 'data.user.open_id'),
            'username'     => data_get($meResp->json(), 'data.user.username'),
            'display_name' => data_get($meResp->json(), 'data.user.display_name'),
        ];

        // --- Ekstrak aweme/video id dari URL
        $id1 = $this->extractAwemeId($submission->link_1);
        $id2 = $this->extractAwemeId($submission->link_2);

        // --- Hint lewat oEmbed (sekadar info author)
        $oembedHints = [];
        foreach ([1 => $submission->link_1, 2 => $submission->link_2] as $slot => $url) {
            if (!$url) continue;
            try {
                $oe = \Http::timeout(8)->get('https://www.tiktok.com/oembed', ['url' => $url]);
                if ($oe->ok()) {
                    $oembedHints[$slot] = [
                        'author_unique_id' => data_get($oe->json(), 'author_unique_id'),
                        'author_name'      => data_get($oe->json(), 'author_name'),
                    ];
                }
            } catch (\Throwable $e) {}
        }

        // --- Helper: query by id (lebih akurat)
        $queryById = function (string $videoId) use ($accessToken) {
            try {
                $resp = \Http::withToken($accessToken)->acceptJson()
                    ->post('https://open.tiktokapis.com/v2/video/query/', [
                        'filters' => ['video_ids' => [$videoId]],
                        'fields'  => 'id,view_count,like_count,comment_count,share_count,create_time',
                    ]);
                if (!$resp->ok()) {
                    return [null, $resp->json()];
                }
                $videos = data_get($resp->json(), 'data.videos', []);
                foreach ($videos as $v) {
                    // beberapa implementasi pakai "id" atau "video_id"
                    $vid = $v['id'] ?? $v['video_id'] ?? null;
                    if ((string)$vid === (string)$videoId) {
                        return [$v, null];
                    }
                }
                return [null, null];
            } catch (\Throwable $e) {
                return [null, ['exception' => $e->getMessage()]];
            }
        };

        // --- Helper: paginate list (fallback)
        $findInList = function (string $videoId) use ($accessToken) {
            $cursor = 0; $page = 0; $maxPages = 25; // naikkan batas
            $lastErr = null;
            while ($page < $maxPages) {
                $resp = \Http::withToken($accessToken)->acceptJson()
                    ->get('https://open.tiktokapis.com/v2/video/list/', [
                        'fields'    => 'id,view_count,like_count,comment_count,share_count,create_time',
                        'cursor'    => $cursor,
                        'max_count' => 20,
                    ]);
                if (!$resp->ok()) {
                    $lastErr = $resp->json();
                    break;
                }
                $data   = $resp->json();
                $videos = data_get($data, 'data.videos', []);
                foreach ($videos as $v) {
                    $vid = $v['id'] ?? $v['video_id'] ?? null;
                    if ((string)$vid === (string)$videoId) {
                        return [$v, $page + 1, true, $lastErr];
                    }
                }
                $hasMore = (bool) data_get($data, 'data.has_more', false);
                $cursor  = data_get($data, 'data.cursor', 0);
                $page++;
                if (!$hasMore) break;
            }
            return [null, $page, true, $lastErr];
        };

        $updated = [];
        $notFound = [];
        $debug    = ['search' => [], 'query' => []];

        // Slot 1
        if ($id1) {
            [$v1, $qErr1] = $queryById($id1);
            $debug['query']['1'] = ['error' => $qErr1, 'matched' => (bool)$v1];
            if (!$v1) {
                [$v1, $pages1, $ok1, $err1] = $findInList($id1);
                $debug['search']['1'] = ['pages_scanned' => $pages1, 'api_ok' => $ok1, 'error' => $err1];
            }
            if ($v1) {
                $submission->views_1    = $v1['view_count']    ?? $submission->views_1;
                $submission->likes_1    = $v1['like_count']    ?? $submission->likes_1;
                $submission->comments_1 = $v1['comment_count'] ?? $submission->comments_1;
                $submission->shares_1   = $v1['share_count']   ?? $submission->shares_1;
                $updated[] = 1;
            } else {
                $notFound['1'] = $id1;
            }
        }

        // Slot 2
        if ($id2) {
            [$v2, $qErr2] = $queryById($id2);
            $debug['query']['2'] = ['error' => $qErr2, 'matched' => (bool)$v2];
            if (!$v2) {
                [$v2, $pages2, $ok2, $err2] = $findInList($id2);
                $debug['search']['2'] = ['pages_scanned' => $pages2, 'api_ok' => $ok2, 'error' => $err2];
            }
            if ($v2) {
                $submission->views_2    = $v2['view_count']    ?? $submission->views_2;
                $submission->likes_2    = $v2['like_count']    ?? $submission->likes_2;
                $submission->comments_2 = $v2['comment_count'] ?? $submission->comments_2;
                $submission->shares_2   = $v2['share_count']   ?? $submission->shares_2;
                $updated[] = 2;
            } else {
                $notFound['2'] = $id2;
            }
        }

        if ($updated) {
            $submission->last_metrics_synced_at = now();
            $submission->save();
            return response()->json([
                'message'      => 'Metrik berhasil diperbarui.',
                'updated'      => $updated,
                'token_owner'  => $tokenOwner,
                'hints'        => ['oembed' => $oembedHints] + $debug,
                'data'         => $submission->fresh(),
            ]);
        }

        return response()->json([
            'message'        => 'Tidak ada metrik yang ditemukan untuk link ini.',
            'updated'        => [],
            'not_found'      => $notFound,
            'token_owner'    => $tokenOwner,
            'current_scopes' => $scopes,
            'reauth_url'     => url('/auth/tiktok/reset?campaign_id='.$submission->campaign_id.'&force=1'),
            'hints'          => ['oembed' => $oembedHints] + $debug,
            'data'           => $submission->fresh(),
        ]);
    }

    /**
     * Ekstrak aweme/video id dari berbagai format URL TikTok.
     */
    protected function extractAwemeId(?string $url): ?string
    {
        if (!$url) return null;
        $u = trim($url);

        // format umum: .../video/1234567890123456789
        if (preg_match('#/video/(\d+)#', $u, $m)) {
            return $m[1];
        }

        // kalau short link (vm.tiktok.com/...), kita tidak follow redirect di server di sini.
        // bisa ditambahkan head request utk resolve, kalau perlu.

        return null;
    }




    // App\Http\Controllers\Api\InfluencerSubmissionController.php

    public function index(Request $request)
    {
        $perPage = (int) $request->input('per_page', 10);

        $q = \App\Models\InfluencerSubmission::query()
            ->select([
                'influencer_submissions.*',
                \DB::raw('influencer_submissions.created_at as submission_created_at'),
                \DB::raw('influencer_submissions.updated_at as submission_updated_at'),
            ])
            ->addSelect([
                // identitas dasar (registrations)
                'full_name' => \App\Models\InfluencerRegistration::select('full_name')
                    ->whereColumn('influencer_registrations.tiktok_user_id', 'influencer_submissions.tiktok_user_id')
                    ->whereColumn('influencer_registrations.campaign_id', 'influencer_submissions.campaign_id')
                    ->latest()->limit(1),

                'tiktok_username' => \App\Models\InfluencerRegistration::select('tiktok_username')
                    ->whereColumn('influencer_registrations.tiktok_user_id', 'influencer_submissions.tiktok_user_id')
                    ->whereColumn('influencer_registrations.campaign_id', 'influencer_submissions.campaign_id')
                    ->latest()->limit(1),

                // ✅ avatar utama dari influencer_accounts
                'avatar_url' => \App\Models\InfluencerAccount::select('avatar_url')
                    ->whereColumn('influencer_accounts.tiktok_user_id', 'influencer_submissions.tiktok_user_id')
                    ->orderByDesc('id')->limit(1),

                // ✅ profile_pic_url = avatar dari accounts, fallback ke registrations.profile_pic_url
                'profile_pic_url' => \DB::raw("
                    COALESCE(
                    (SELECT ia.avatar_url
                        FROM influencer_accounts ia
                        WHERE ia.tiktok_user_id = influencer_submissions.tiktok_user_id
                    ORDER BY ia.id DESC
                        LIMIT 1),
                    (SELECT ir.profile_pic_url
                        FROM influencer_registrations ir
                        WHERE ir.tiktok_user_id = influencer_submissions.tiktok_user_id
                        AND ir.campaign_id    = influencer_submissions.campaign_id
                    ORDER BY ir.id DESC
                        LIMIT 1)
                    )
                "),

                // kontak dari registrations (terbaru by id)
                'phone' => \App\Models\InfluencerRegistration::select('phone')
                    ->whereColumn('influencer_registrations.tiktok_user_id', 'influencer_submissions.tiktok_user_id')
                    ->whereColumn('influencer_registrations.campaign_id', 'influencer_submissions.campaign_id')
                    ->latest()->limit(1),

                'email' => \App\Models\InfluencerRegistration::select('email')
                    ->whereColumn('influencer_registrations.tiktok_user_id', 'influencer_submissions.tiktok_user_id')
                    ->whereColumn('influencer_registrations.campaign_id', 'influencer_submissions.campaign_id')
                    ->latest()->limit(1),

                'address' => \App\Models\InfluencerRegistration::select('address')
                    ->whereColumn('influencer_registrations.tiktok_user_id', 'influencer_submissions.tiktok_user_id')
                    ->whereColumn('influencer_registrations.campaign_id', 'influencer_submissions.campaign_id')
                    ->latest()->limit(1),
            ])
            ->with(['campaign:id,name,slug,brand_id', 'campaign.brand:id,name']);

        // filter opsional
        if ($request->filled('tiktok_user_id')) {
            $q->where('influencer_submissions.tiktok_user_id', $request->input('tiktok_user_id'));
        }
        if ($request->filled('campaign_id')) {
            $q->where('influencer_submissions.campaign_id', (int) $request->input('campaign_id'));
        }

        // terbaru di-update
        $q->latest('influencer_submissions.updated_at');

        if ($perPage === 0) {
            return response()->json($q->get());
        }
        return response()->json($q->paginate($perPage));
    }





    /**
     * GET /api/influencer-submissions/{id}
     */
    public function show($id)
    {
        $submission = \App\Models\InfluencerSubmission::query()
            ->select('influencer_submissions.*')
            ->addSelect([
                // identitas dasar (registrations)
                'full_name' => \App\Models\InfluencerRegistration::select('full_name')
                    ->whereColumn('influencer_registrations.tiktok_user_id', 'influencer_submissions.tiktok_user_id')
                    ->whereColumn('influencer_registrations.campaign_id', 'influencer_submissions.campaign_id')
                    ->latest()->limit(1),

                'tiktok_username' => \App\Models\InfluencerRegistration::select('tiktok_username')
                    ->whereColumn('influencer_registrations.tiktok_user_id', 'influencer_submissions.tiktok_user_id')
                    ->whereColumn('influencer_registrations.campaign_id', 'influencer_submissions.campaign_id')
                    ->latest()->limit(1),

                // ✅ avatar utama dari influencer_accounts
                'avatar_url' => \App\Models\InfluencerAccount::select('avatar_url')
                    ->whereColumn('influencer_accounts.tiktok_user_id', 'influencer_submissions.tiktok_user_id')
                    ->orderByDesc('id')->limit(1),

                // ✅ profile_pic_url = avatar dari accounts, fallback ke registrations.profile_pic_url
                'profile_pic_url' => \DB::raw("
                    COALESCE(
                    (SELECT ia.avatar_url
                        FROM influencer_accounts ia
                        WHERE ia.tiktok_user_id = influencer_submissions.tiktok_user_id
                    ORDER BY ia.id DESC
                        LIMIT 1),
                    (SELECT ir.profile_pic_url
                        FROM influencer_registrations ir
                        WHERE ir.tiktok_user_id = influencer_submissions.tiktok_user_id
                        AND ir.campaign_id    = influencer_submissions.campaign_id
                    ORDER BY ir.id DESC
                        LIMIT 1)
                    )
                "),

                // kontak (registrations)
                'phone' => \App\Models\InfluencerRegistration::select('phone')
                    ->whereColumn('influencer_registrations.tiktok_user_id', 'influencer_submissions.tiktok_user_id')
                    ->whereColumn('influencer_registrations.campaign_id', 'influencer_submissions.campaign_id')
                    ->latest()->limit(1),

                'email' => \App\Models\InfluencerRegistration::select('email')
                    ->whereColumn('influencer_registrations.tiktok_user_id', 'influencer_submissions.tiktok_user_id')
                    ->whereColumn('influencer_registrations.campaign_id', 'influencer_submissions.campaign_id')
                    ->latest()->limit(1),

                'address' => \App\Models\InfluencerRegistration::select('address')
                    ->whereColumn('influencer_registrations.tiktok_user_id', 'influencer_submissions.tiktok_user_id')
                    ->whereColumn('influencer_registrations.campaign_id', 'influencer_submissions.campaign_id')
                    ->latest()->limit(1),
            ])
            ->with(['campaign:id,name,slug,brand_id', 'campaign.brand:id,name'])
            ->findOrFail($id);

        // pastikan accessor URL ikut keluar
        $submission->append([
            'screenshot_1_url',
            'screenshot_2_url',
            'screenshot_3_url',
            'screenshot_4_url',
            'screenshot_5_url',
            'invoice_file_url',
            'review_proof_file_url',
        ]);

        return response()->json($submission);
    }





    /**
     * POST /api/influencer-submissions
     * Terima fields:
     * - tiktok_user_id, campaign_id, link_1, post_date_1, screenshot_1 (file)
     * - link_2, post_date_2, screenshot_2 (file)
     * - purchase_platform (tiktokshop|shopee)
     * - invoice_file (file), review_proof_file (file)
     */
    


    public function store(Request $request)
    {
        // --- Cari existing submission dulu (buat relaksasi syarat invoice kalau sudah ada) ---
        $existing = InfluencerSubmission::query()
            ->where('campaign_id', $request->input('campaign_id'))
            ->where('tiktok_user_id', $request->input('tiktok_user_id'))
            ->first();

        // ---------- VALIDATION ----------
        $rules = [
            'tiktok_user_id'  => ['required','string','max:100'],
            'campaign_id'     => ['required','integer','exists:campaigns,id'],

            // slot 1
            'link_1'          => ['required','url','max:2048'],
            'post_date_1'     => ['nullable','date'],
            'screenshot_1'    => ['nullable','file','mimes:jpg,jpeg,png,webp','max:5120'],

            // slot 2
            'link_2'          => ['nullable','url','max:2048'],
            'post_date_2'     => ['nullable','date'],
            'screenshot_2'    => ['nullable','file','mimes:jpg,jpeg,png,webp','max:5120'],

            // slot 3–5 (opsional)
            'link_3'          => ['nullable','url','max:2048'],
            'post_date_3'     => ['nullable','date'],
            'screenshot_3'    => ['nullable','file','mimes:jpg,jpeg,png,webp','max:5120'],

            'link_4'          => ['nullable','url','max:2048'],
            'post_date_4'     => ['nullable','date'],
            'screenshot_4'    => ['nullable','file','mimes:jpg,jpeg,png,webp','max:5120'],

            'link_5'          => ['nullable','url','max:2048'],
            'post_date_5'     => ['nullable','date'],
            'screenshot_5'    => ['nullable','file','mimes:jpg,jpeg,png,webp','max:5120'],

            // purchase & docs
            'purchase_platform' => ['nullable', Rule::in(['tiktokshop','shopee'])],
            'invoice_file'      => ['nullable','file','mimes:pdf,jpg,jpeg,png,webp','max:10240'],
            'review_proof_file' => ['nullable','file','mimes:pdf,jpg,jpeg,png,webp','max:10240'],

            // KPI lama (opsional)
            'yellow_cart'     => ['nullable','integer','min:0'],
            'product_sold'    => ['nullable','integer','min:0'],
            'gmv'             => ['nullable','numeric','min:0'],

            // Metrik baru (opsional, masih slot 1–2)
            'views_1'         => ['nullable','integer','min:0'],
            'likes_1'         => ['nullable','integer','min:0'],
            'comments_1'      => ['nullable','integer','min:0'],
            'shares_1'        => ['nullable','integer','min:0'],
            'views_2'         => ['nullable','integer','min:0'],
            'likes_2'         => ['nullable','integer','min:0'],
            'comments_2'      => ['nullable','integer','min:0'],
            'shares_2'        => ['nullable','integer','min:0'],

            // ★ acquisition & shipping
            'acquisition_method'       => ['nullable', Rule::in(['buy','sent_by_brand'])],
            'purchase_price'           => ['nullable','numeric','min:0'],
            'shipping_courier'         => ['nullable','string','max:100'],
            'shipping_tracking_number' => ['nullable','string','max:100'],
        ];

        $messages = [
            'tiktok_user_id.required' => 'ID TikTok wajib diisi.',
            'campaign_id.required'    => 'Campaign wajib dipilih.',
            'link_1.required'         => 'Link postingan 1 wajib diisi.',
        ];

        $v = Validator::make($request->all(), $rules, $messages);

        // BUY ⇒ wajib platform & price
        $v->sometimes(['purchase_platform','purchase_price'], 'required', function ($input) {
            return ($input->acquisition_method === 'buy');
        });
        // BUY ⇒ invoice wajib HANYA jika belum ada invoice sebelumnya
        $v->sometimes('invoice_file', 'required', function ($input) use ($existing) {
            return ($input->acquisition_method === 'buy') && !($existing && $existing->invoice_file_path);
        });
        // SENT_BY_BRAND ⇒ wajib shipping fields
        /*$v->sometimes(['shipping_courier','shipping_tracking_number'], 'required', function ($input) {
            return ($input->acquisition_method === 'sent_by_brand');
        });*/

        $validated = $v->validate();

        // ---------- UPSERT RECORD ----------
        $submission = $existing ?: InfluencerSubmission::firstOrNew([
            'campaign_id'    => (int) $validated['campaign_id'],
            'tiktok_user_id' => (string) $validated['tiktok_user_id'],
        ]);

        // ---------- FILE HELPERS ----------
        $baseDir = "submissions/{$validated['campaign_id']}/{$validated['tiktok_user_id']}";
        $saveFile = function (? \Illuminate\Http\UploadedFile $file, string $prefix) use ($baseDir) {
            if (!$file) return null;
            $ext  = strtolower($file->getClientOriginalExtension() ?: $file->extension());
            $name = $prefix . '_' . Str::uuid() . '.' . $ext;
            return $file->storeAs($baseDir, $name, 'public'); // relative path on 'public'
        };

        // Hapus file lama bila upload baru
        foreach ([
            'screenshot_1' => 'screenshot_1_path',
            'screenshot_2' => 'screenshot_2_path',
            'screenshot_3' => 'screenshot_3_path',
            'screenshot_4' => 'screenshot_4_path',
            'screenshot_5' => 'screenshot_5_path',
            'invoice_file' => 'invoice_file_path',
            'review_proof_file' => 'review_proof_file_path',
        ] as $inputName => $column) {
            if ($request->hasFile($inputName) && $submission->$column) {
                Storage::disk('public')->delete($submission->$column);
            }
        }

        // Simpan file baru
        $s1Path  = $saveFile($request->file('screenshot_1'), 's1');
        $s2Path  = $saveFile($request->file('screenshot_2'), 's2');
        $s3Path  = $saveFile($request->file('screenshot_3'), 's3');
        $s4Path  = $saveFile($request->file('screenshot_4'), 's4');
        $s5Path  = $saveFile($request->file('screenshot_5'), 's5');
        $invPath = $saveFile($request->file('invoice_file'), 'invoice');
        $revPath = $saveFile($request->file('review_proof_file'), 'review');

        // ---------- ASSIGN FIELDS ----------
        // slot 1–2
        $submission->link_1      = $validated['link_1'];
        $submission->post_date_1 = $validated['post_date_1'] ?? null;
        $submission->link_2      = $validated['link_2'] ?? $submission->link_2;
        $submission->post_date_2 = $validated['post_date_2'] ?? $submission->post_date_2;

        // slot 3–5 (opsional)
        foreach ([3,4,5] as $i) {
            $linkKey = "link_$i";
            $dateKey = "post_date_$i";
            if (array_key_exists($linkKey, $validated)) {
                $submission->$linkKey = $validated[$linkKey];
            }
            if (array_key_exists($dateKey, $validated)) {
                $submission->$dateKey = $validated[$dateKey];
            }
        }

        // Acquisition
        $submission->acquisition_method = $validated['acquisition_method'] ?? $submission->acquisition_method;

        if (($validated['acquisition_method'] ?? null) === 'buy') {
            $submission->purchase_platform = $validated['purchase_platform'] ?? null;
            $submission->purchase_price    = $validated['purchase_price'] ?? null;
            // shipping dikosongkan
            $submission->shipping_courier         = null;
            $submission->shipping_tracking_number = null;
        } elseif (($validated['acquisition_method'] ?? null) === 'sent_by_brand') {
            // kosongkan pembelian
            $submission->purchase_platform = null;
            $submission->purchase_price    = null;
            // isi shipping
            $submission->shipping_courier         = $validated['shipping_courier'] ?? null;
            $submission->shipping_tracking_number = $validated['shipping_tracking_number'] ?? null;
        } else {
            // belum dipilih—biarkan sesuai input (jika ada)
            $submission->purchase_platform = $validated['purchase_platform'] ?? $submission->purchase_platform;
            $submission->purchase_price    = $validated['purchase_price'] ?? $submission->purchase_price;
            $submission->shipping_courier         = $validated['shipping_courier'] ?? $submission->shipping_courier;
            $submission->shipping_tracking_number = $validated['shipping_tracking_number'] ?? $submission->shipping_tracking_number;
        }

        // KPI lama
        $submission->yellow_cart  = $validated['yellow_cart']  ?? $submission->yellow_cart;
        $submission->product_sold = $validated['product_sold'] ?? $submission->product_sold;
        $submission->gmv          = $validated['gmv']          ?? $submission->gmv;

        // Path file (replace if new)
        if ($s1Path)  $submission->screenshot_1_path     = $s1Path;
        if ($s2Path)  $submission->screenshot_2_path     = $s2Path;
        if ($s3Path)  $submission->screenshot_3_path     = $s3Path;
        if ($s4Path)  $submission->screenshot_4_path     = $s4Path;
        if ($s5Path)  $submission->screenshot_5_path     = $s5Path;
        if ($invPath) $submission->invoice_file_path      = $invPath;
        if ($revPath) $submission->review_proof_file_path = $revPath;

        // Metrik (slot 1–2)
        $metricKeys = [
            'views_1','likes_1','comments_1','shares_1',
            'views_2','likes_2','comments_2','shares_2',
        ];
        $hasMetricPayload = false;
        foreach ($metricKeys as $m) {
            if (array_key_exists($m, $validated)) {
                $submission->$m = $validated[$m];
                $hasMetricPayload = true;
            }
        }
        if ($hasMetricPayload) {
            $submission->last_metrics_synced_at = now();
        }

        $submission->save();

        return response()->json([
            'message' => 'Submission berhasil disimpan.',
            'data'    => $submission->fresh()->loadMissing(['campaign:id,name,slug,brand_id','campaign.brand:id,name']),
        ], $submission->wasRecentlyCreated ? 201 : 200);
    }


    public function update(Request $request, $id)
    {
        $submission = InfluencerSubmission::findOrFail($id);

        // ---------- VALIDATION ----------
        $rules = [
            'tiktok_user_id'    => ['sometimes','string','max:100'],
            'campaign_id'       => ['sometimes','integer','exists:campaigns,id'],

            // slot 1
            'link_1'            => ['sometimes','nullable','url','max:2048'],
            'post_date_1'       => ['sometimes','nullable','date'],
            'screenshot_1'      => ['sometimes','file','mimes:jpg,jpeg,png,webp','max:5120'],

            // slot 2
            'link_2'            => ['sometimes','nullable','url','max:2048'],
            'post_date_2'       => ['sometimes','nullable','date'],
            'screenshot_2'      => ['sometimes','file','mimes:jpg,jpeg,png,webp','max:5120'],

            // slot 3–5
            'link_3'            => ['sometimes','nullable','url','max:2048'],
            'post_date_3'       => ['sometimes','nullable','date'],
            'screenshot_3'      => ['sometimes','file','mimes:jpg,jpeg,png,webp','max:5120'],

            'link_4'            => ['sometimes','nullable','url','max:2048'],
            'post_date_4'       => ['sometimes','nullable','date'],
            'screenshot_4'      => ['sometimes','file','mimes:jpg,jpeg,png,webp','max:5120'],

            'link_5'            => ['sometimes','nullable','url','max:2048'],
            'post_date_5'       => ['sometimes','nullable','date'],
            'screenshot_5'      => ['sometimes','file','mimes:jpg,jpeg,png,webp','max:5120'],

            // purchase & docs
            'purchase_platform' => ['sometimes','nullable', Rule::in(['tiktokshop','shopee'])],
            'invoice_file'      => ['sometimes','file','mimes:pdf,jpg,jpeg,png,webp','max:10240'],
            'review_proof_file' => ['sometimes','file','mimes:pdf,jpg,jpeg,png,webp','max:10240'],

            // KPI lama
            'yellow_cart'       => ['sometimes','nullable','integer','min:0'],
            'product_sold'      => ['sometimes','nullable','integer','min:0'],
            'gmv'               => ['sometimes','nullable','numeric','min:0'],

            // Metrik (slot 1–2)
            'views_1'           => ['sometimes','nullable','integer','min:0'],
            'likes_1'           => ['sometimes','nullable','integer','min:0'],
            'comments_1'        => ['sometimes','nullable','integer','min:0'],
            'shares_1'          => ['sometimes','nullable','integer','min:0'],
            'views_2'           => ['sometimes','nullable','integer','min:0'],
            'likes_2'           => ['sometimes','nullable','integer','min:0'],
            'comments_2'        => ['sometimes','nullable','integer','min:0'],
            'shares_2'          => ['sometimes','nullable','integer','min:0'],

            // ★ acquisition & shipping
            'acquisition_method'       => ['sometimes','nullable', Rule::in(['buy','sent_by_brand'])],
            'purchase_price'           => ['sometimes','nullable','numeric','min:0'],
            'shipping_courier'         => ['sometimes','nullable','string','max:100'],
            'shipping_tracking_number' => ['sometimes','nullable','string','max:100'],
        ];

        $v = Validator::make($request->all(), $rules);

        // BUY ⇒ wajib platform & price
        $v->sometimes(['purchase_platform','purchase_price'], 'required', function ($input) {
            return ($input->acquisition_method === 'buy');
        });
        // BUY ⇒ invoice wajib hanya bila belum ada sebelumnya
        $v->sometimes('invoice_file', 'required', function ($input) use ($submission) {
            return ($input->acquisition_method === 'buy') && !$submission->invoice_file_path;
        });
        // SENT_BY_BRAND ⇒ wajib shipping fields
        $v->sometimes(['shipping_courier','shipping_tracking_number'], 'required', function ($input) {
            return ($input->acquisition_method === 'sent_by_brand');
        });

        $validated = $v->validate();

        // Base dir (kalau campaign/user ganti, arahkan ke folder baru)
        $campaignId   = $validated['campaign_id']    ?? $submission->campaign_id;
        $tiktokUserId = $validated['tiktok_user_id'] ?? $submission->tiktok_user_id;
        $baseDir = "submissions/{$campaignId}/{$tiktokUserId}";

        $saveFile = function (? \Illuminate\Http\UploadedFile $file, string $prefix) use ($baseDir) {
            if (!$file) return null;
            $ext  = strtolower($file->getClientOriginalExtension() ?: $file->extension());
            $name = $prefix . '_' . Str::uuid() . '.' . $ext;
            return $file->storeAs($baseDir, $name, 'public');
        };

        // Replace file jika ada upload baru
        foreach ([
            'screenshot_1' => 'screenshot_1_path',
            'screenshot_2' => 'screenshot_2_path',
            'screenshot_3' => 'screenshot_3_path',
            'screenshot_4' => 'screenshot_4_path',
            'screenshot_5' => 'screenshot_5_path',
            'invoice_file' => 'invoice_file_path',
            'review_proof_file' => 'review_proof_file_path',
        ] as $inputName => $column) {
            if ($request->hasFile($inputName)) {
                if ($submission->$column) Storage::disk('public')->delete($submission->$column);
                $prefix = str_starts_with($inputName, 'screenshot_')
                    ? 's' . substr($inputName, -1) // screenshot_1 -> s1, dst
                    : ($inputName === 'invoice_file' ? 'invoice' : 'review');
                $submission->$column = $saveFile($request->file($inputName), $prefix);
            }
        }

        // Assign simple fields (termasuk slot 3–5 kalau ada di payload)
        foreach ([
            'tiktok_user_id','campaign_id',
            'link_1','post_date_1',
            'link_2','post_date_2',
            'link_3','post_date_3',
            'link_4','post_date_4',
            'link_5','post_date_5',
            'purchase_platform',
            'yellow_cart','product_sold','gmv',
            'views_1','likes_1','comments_1','shares_1',
            'views_2','likes_2','comments_2','shares_2',
            'acquisition_method','purchase_price',
            'shipping_courier','shipping_tracking_number',
        ] as $field) {
            if (array_key_exists($field, $validated)) {
                $submission->$field = $validated[$field];
            }
        }

        // Jika acquisition_method diubah, bersihkan kolom yang tidak relevan
        if (array_key_exists('acquisition_method', $validated)) {
            if ($validated['acquisition_method'] === 'buy') {
                $submission->shipping_courier = null;
                $submission->shipping_tracking_number = null;
            } elseif ($validated['acquisition_method'] === 'sent_by_brand') {
                $submission->purchase_platform = null;
                $submission->purchase_price    = null;
            }
        }

        // Update timestamp metrik bila ada metrik yang dikirim
        $metricTouched = collect([
            'views_1','likes_1','comments_1','shares_1',
            'views_2','likes_2','comments_2','shares_2',
        ])->some(fn($k) => array_key_exists($k, $validated));
        if ($metricTouched) {
            $submission->last_metrics_synced_at = now();
        }

        $submission->save();

        return response()->json([
            'message' => 'Submission berhasil diupdate.',
            'data'    => $submission->fresh()->loadMissing(['campaign:id,name,slug,brand_id','campaign.brand:id,name']),
        ]);
    }





    /**
     * DELETE /api/influencer-submissions/{id}
     * (opsional) ikut hapus file
     */
    public function destroy($id)
    {
        $submission = InfluencerSubmission::findOrFail($id);

        // Hapus file-file terkait (opsional)
        foreach (['screenshot_1_path','screenshot_2_path','invoice_file_path','review_proof_file_path'] as $col) {
            if ($submission->$col) {
                Storage::disk('public')->delete($submission->$col);
            }
        }

        $submission->delete();

        return response()->json(['message' => 'Submission berhasil dihapus']);
    }

    public function export(Request $request)
    {
        $data = $request->validate([
            'campaign_id' => ['required','integer','exists:campaigns,id'],
            'q'           => ['nullable','string','max:200'],
        ]);

        $campaignId = (int) $data['campaign_id'];
        $keyword    = $data['q'] ?? null;

        $campaignName = \App\Models\Campaign::whereKey($campaignId)->value('name') ?? 'campaign_'.$campaignId;
        $safeName     = Str::of($campaignName)->slug('_');
        $filename     = 'submissions_'.$safeName.'_'.now()->format('Ymd_His').'.xlsx';

        return Excel::download(new InfluencerSubmissionsExport($campaignId, $keyword), $filename);
    }

    public function submitDraft(Request $request)
    {
        // Validasi minimal: identitas + URL draft
        $data = $request->validate([
            'campaign_id'    => ['required','integer','exists:campaigns,id'],
            'tiktok_user_id' => ['required','string','max:100'],
            'draft_url'      => ['required','url','max:2048'],
            'draft_channel'  => ['sometimes','nullable','string','max:50'], // optional: 'tiktok', 'ig', dll
        ]);

        // Upsert berdasarkan (campaign_id, tiktok_user_id)
        $submission = \App\Models\InfluencerSubmission::firstOrNew([
            'campaign_id'    => (int) $data['campaign_id'],
            'tiktok_user_id' => (string) $data['tiktok_user_id'],
        ]);

        // Isi/replace field draft — set ke pending setiap kali ada kiriman/ganti URL
        $submission->draft_url           = $data['draft_url'];
        $submission->draft_channel       = $data['draft_channel'] ?? $submission->draft_channel;
        $submission->draft_status        = 'pending';
        $submission->draft_submitted_at  = now();
        $submission->draft_reviewed_by   = null;
        $submission->draft_reviewed_at   = null;
        $submission->draft_reviewer_note = null;

        // Pastikan key tetap terisi kalau row baru
        $submission->campaign_id    = (int) $data['campaign_id'];
        $submission->tiktok_user_id = (string) $data['tiktok_user_id'];

        $submission->save();

        return response()->json([
            'message' => 'Draft berhasil dikirim. Menunggu approval admin.',
            'data'    => $submission->fresh()->loadMissing(['campaign:id,name,slug,brand_id','campaign.brand:id,name']),
        ]);
    }

    public function approveDraft(Request $request, $id)
    {
        // (opsional) kalau pakai policy:
        // $this->authorize('approveDraft', InfluencerSubmission::class);

        $submission = InfluencerSubmission::findOrFail($id);

        // Pastikan user sudah submit draft dulu
        if (!filled($submission->draft_url)) {
            return response()->json([
                'message' => 'Draft belum dikirim oleh KOL.',
            ], 422);
        }

        $data = $request->validate([
            'draft_status' => ['required', 'string', Rule::in(['pending','approved','rejected'])],
            'draft_reviewer_note' => ['nullable', 'string', 'max:2000'],
        ]);

        $submission->draft_status = strtolower($data['draft_status']);

        // Catatan reviewer opsional: jika tidak dikirim, jangan overwrite jadi null tanpa alasan
        if ($request->has('draft_reviewer_note')) {
            $submission->draft_reviewer_note = $data['draft_reviewer_note'];
        }

        // Kalau kamu punya kolom timestamp khusus di DB seperti draft_reviewed_at / reviewed_by,
        // bisa set di sini. Kalau tidak ada, skip agar tidak error kolom.
        // $submission->draft_reviewed_at = now();
        // $submission->draft_reviewed_by = auth()->id();

        $submission->save();

        return response()->json([
            'message' => 'Status draft berhasil diperbarui.',
            'data' => [
                'id'                   => $submission->id,
                'campaign_id'          => $submission->campaign_id,
                'tiktok_user_id'       => $submission->tiktok_user_id,
                'draft_url'            => $submission->draft_url,
                'draft_status'         => $submission->draft_status,
                'draft_reviewer_note'  => $submission->draft_reviewer_note,
                'draft_submitted_at'   => $submission->draft_submitted_at,
                'updated_at'           => $submission->updated_at,
            ],
        ]);
    }




}
