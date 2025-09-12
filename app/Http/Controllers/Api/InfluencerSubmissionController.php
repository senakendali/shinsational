<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InfluencerSubmission;
use App\Models\Campaign;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Carbon;


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

    // === Endpoint utama: refresh metrics ===
    public function refreshMetrics(Request $request, $id)
    {
        $submission = InfluencerSubmission::findOrFail($id);

        // Ambil video_id dari link_1 & link_2
        $mapSlotToId = [];
        $vid1 = $this->extractVideoId($submission->link_1);
        $vid2 = $this->extractVideoId($submission->link_2);
        if ($vid1) $mapSlotToId[1] = $vid1;
        if ($vid2) $mapSlotToId[2] = $vid2;

        if (!$mapSlotToId) {
            return response()->json([
                'message' => 'Tidak ada link valid untuk di-refresh.',
            ], 400);
        }

        // Ambil token si KOL (berdasarkan open_id)
        $openId = $submission->tiktok_user_id;
        if (!$openId) {
            return response()->json(['message' => 'Submission tidak memiliki tiktok_user_id/open_id.'], 422);
        }

        $src = $this->getTokenSourceForOpenId($openId);
        if (!$src || !$src->access_token) {
            return response()->json([
                'message'     => 'Access token tidak ditemukan. Minta KOL untuk connect TikTok.',
                'reauth_url'  => url('/auth/tiktok/redirect'),
            ], 409);
        }

        // Pastikan token valid (refresh bila perlu)
        $bundle = $this->ensureValidAccessToken($src);
        if (!$bundle || !$bundle['access_token']) {
            return response()->json([
                'message'     => 'Access token tidak valid. Silakan connect ulang TikTok.',
                'reauth_url'  => url('/auth/tiktok/redirect'),
            ], 401);
        }

        // Tarik metrik dari TikTok
        $statsById = $this->fetchStatsForVideoIds($bundle['access_token'], array_values($mapSlotToId));

        // Update kolom slot yang ditemukan
        $updated = [];
        foreach ($mapSlotToId as $slot => $vid) {
            $st = $statsById[$vid] ?? null;
            if (!$st) continue;

            if ($slot === 1) {
                $submission->views_1    = is_numeric($st['views'])    ? (int)$st['views']    : null;
                $submission->likes_1    = is_numeric($st['likes'])    ? (int)$st['likes']    : null;
                $submission->comments_1 = is_numeric($st['comments']) ? (int)$st['comments'] : null;
                $submission->shares_1   = is_numeric($st['shares'])   ? (int)$st['shares']   : null;
            } else {
                $submission->views_2    = is_numeric($st['views'])    ? (int)$st['views']    : null;
                $submission->likes_2    = is_numeric($st['likes'])    ? (int)$st['likes']    : null;
                $submission->comments_2 = is_numeric($st['comments']) ? (int)$st['comments'] : null;
                $submission->shares_2   = is_numeric($st['shares'])   ? (int)$st['shares']   : null;
            }

            $updated[$slot] = $st;
        }

        if ($updated) {
            $submission->last_metrics_synced_at = now();
            $submission->save();
        }

        $notFound = [];
        foreach ($mapSlotToId as $slot => $vid) {
            if (!isset($updated[$slot])) $notFound[$slot] = $vid;
        }

        return response()->json([
            'message'      => $updated ? 'Metrik berhasil di-refresh.' : 'Tidak ada metrik yang ditemukan untuk link ini.',
            'updated'      => $updated,
            'not_found'    => $notFound,
            'data'         => $submission->fresh(),
        ], $updated ? 200 : 404);
    }

    public function index(Request $request)
    {
        $query = InfluencerSubmission::query();

        if ($request->filled('tiktok_user_id')) {
            $query->where('tiktok_user_id', $request->string('tiktok_user_id'));
        }
        if ($request->filled('campaign_id')) {
            $query->where('campaign_id', $request->integer('campaign_id'));
        }

        if ($request->get('include') === 'campaign') {
            $query->with(['campaign:id,name,slug,brand_id', 'campaign.brand:id,name']);
        }

        $perPage = (int) $request->get('per_page', 15);
        $data = $query->latest()->paginate($perPage);

        return response()->json($data);
    }

    /**
     * GET /api/influencer-submissions/{id}
     */
    public function show($id)
    {
        $submission = InfluencerSubmission::with(['campaign:id,name,slug,brand_id', 'campaign.brand:id,name'])->findOrFail($id);
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
        // Validasi dasar + METRIK
        $validated = $request->validate(
            [
                'tiktok_user_id'  => ['required','string','max:100'],
                'campaign_id'     => ['required','integer','exists:campaigns,id'],

                'link_1'          => ['required','url','max:2048'],
                'post_date_1'     => ['nullable','date'],
                'screenshot_1'    => ['nullable','file','mimes:jpg,jpeg,png,webp','max:5120'],

                'link_2'          => ['nullable','url','max:2048'],
                'post_date_2'     => ['nullable','date'],
                'screenshot_2'    => ['nullable','file','mimes:jpg,jpeg,png,webp','max:5120'],

                'purchase_platform'   => ['nullable', Rule::in(['tiktokshop','shopee'])],
                'invoice_file'        => ['nullable','file','mimes:pdf,jpg,jpeg,png,webp','max:10240'],
                'review_proof_file'   => ['nullable','file','mimes:pdf,jpg,jpeg,png,webp','max:10240'],

                // KPI lama (opsional)
                'yellow_cart'     => ['nullable','integer','min:0'],
                'product_sold'    => ['nullable','integer','min:0'],
                'gmv'             => ['nullable','numeric','min:0'],

                // 🔽 METRIK BARU per slot (opsional)
                'views_1'         => ['nullable','integer','min:0'],
                'likes_1'         => ['nullable','integer','min:0'],
                'comments_1'      => ['nullable','integer','min:0'],
                'shares_1'        => ['nullable','integer','min:0'],

                'views_2'         => ['nullable','integer','min:0'],
                'likes_2'         => ['nullable','integer','min:0'],
                'comments_2'      => ['nullable','integer','min:0'],
                'shares_2'        => ['nullable','integer','min:0'],
            ],
            [
                'tiktok_user_id.required' => 'ID TikTok wajib diisi.',
                'campaign_id.required'    => 'Campaign wajib dipilih.',
                'link_1.required'         => 'Link postingan 1 wajib diisi.',
                // 'link_2.required'      => 'Link postingan 2 wajib diisi.', // opsional
            ]
        );

        // Pastikan campaign ada (optional double-check)
        $campaign = Campaign::findOrFail($validated['campaign_id']);

        // Idempotent: satu submission per (campaign_id, tiktok_user_id)
        $submission = InfluencerSubmission::firstOrNew([
            'campaign_id'    => $validated['campaign_id'],
            'tiktok_user_id' => $validated['tiktok_user_id'],
        ]);

        // Helper simpan file
        $baseDir = "submissions/{$validated['campaign_id']}/{$validated['tiktok_user_id']}";
        $saveFile = function (? \Illuminate\Http\UploadedFile $file, string $prefix) use ($baseDir) {
            if (!$file) return null;
            $ext = strtolower($file->getClientOriginalExtension() ?: $file->extension());
            $name = $prefix . '_' . Str::uuid() . '.' . $ext;
            return $file->storeAs($baseDir, $name, 'public'); // path relatif di disk 'public'
        };

        // Jika update & ada file baru → hapus file lama
        if ($request->hasFile('screenshot_1') && $submission->screenshot_1_path) {
            Storage::disk('public')->delete($submission->screenshot_1_path);
        }
        if ($request->hasFile('screenshot_2') && $submission->screenshot_2_path) {
            Storage::disk('public')->delete($submission->screenshot_2_path);
        }
        if ($request->hasFile('invoice_file') && $submission->invoice_file_path) {
            Storage::disk('public')->delete($submission->invoice_file_path);
        }
        if ($request->hasFile('review_proof_file') && $submission->review_proof_file_path) {
            Storage::disk('public')->delete($submission->review_proof_file_path);
        }

        // Simpan file baru (jika ada)
        $s1Path = $saveFile($request->file('screenshot_1'), 's1');
        $s2Path = $saveFile($request->file('screenshot_2'), 's2');
        $invPath = $saveFile($request->file('invoice_file'), 'invoice');
        $revPath = $saveFile($request->file('review_proof_file'), 'review');

        // Set kolom-kolom utama
        $submission->link_1              = $validated['link_1'];
        $submission->post_date_1         = $validated['post_date_1'] ?? null;
        $submission->link_2              = $validated['link_2'] ?? null;
        $submission->post_date_2         = $validated['post_date_2'] ?? null;
        $submission->purchase_platform   = $validated['purchase_platform'] ?? null;

        // Optional KPI lama
        $submission->yellow_cart   = $validated['yellow_cart']  ?? $submission->yellow_cart;
        $submission->product_sold  = $validated['product_sold'] ?? $submission->product_sold;
        $submission->gmv           = $validated['gmv']          ?? $submission->gmv;

        // Path file (overwrite jika ada file baru)
        if ($s1Path)  $submission->screenshot_1_path     = $s1Path;
        if ($s2Path)  $submission->screenshot_2_path     = $s2Path;
        if ($invPath) $submission->invoice_file_path      = $invPath;
        if ($revPath) $submission->review_proof_file_path = $revPath;

        // 🔽 Set METRIK per slot (jika dikirim)
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
            'data'    => $submission->fresh(),
        ], $submission->wasRecentlyCreated ? 201 : 200);
    }


    // App\Http\Controllers\Api\InfluencerSubmissionController.php

    public function update(Request $request, $id)
    {
        $submission = InfluencerSubmission::findOrFail($id);

        // Validasi (semua optional/sometimes)
        $validated = $request->validate([
            'tiktok_user_id'    => ['sometimes','string','max:100'],
            'campaign_id'       => ['sometimes','integer','exists:campaigns,id'],

            'link_1'            => ['sometimes','nullable','url','max:2048'],
            'post_date_1'       => ['sometimes','nullable','date'],
            'screenshot_1'      => ['sometimes','file','mimes:jpg,jpeg,png,webp','max:5120'],

            'link_2'            => ['sometimes','nullable','url','max:2048'],
            'post_date_2'       => ['sometimes','nullable','date'],
            'screenshot_2'      => ['sometimes','file','mimes:jpg,jpeg,png,webp','max:5120'],

            'purchase_platform' => ['sometimes','nullable', \Illuminate\Validation\Rule::in(['tiktokshop','shopee'])],
            'invoice_file'      => ['sometimes','file','mimes:pdf,jpg,jpeg,png,webp','max:10240'],
            'review_proof_file' => ['sometimes','file','mimes:pdf,jpg,jpeg,png,webp','max:10240'],

            // KPI lama (opsional)
            'yellow_cart'       => ['sometimes','nullable','integer','min:0'],
            'product_sold'      => ['sometimes','nullable','integer','min:0'],
            'gmv'               => ['sometimes','nullable','numeric','min:0'],

            // 🔽 METRIK BARU per slot
            'views_1'           => ['sometimes','nullable','integer','min:0'],
            'likes_1'           => ['sometimes','nullable','integer','min:0'],
            'comments_1'        => ['sometimes','nullable','integer','min:0'],
            'shares_1'          => ['sometimes','nullable','integer','min:0'],

            'views_2'           => ['sometimes','nullable','integer','min:0'],
            'likes_2'           => ['sometimes','nullable','integer','min:0'],
            'comments_2'        => ['sometimes','nullable','integer','min:0'],
            'shares_2'          => ['sometimes','nullable','integer','min:0'],
        ]);

        // Base dir bisa berubah kalau campaign_id/tiktok_user_id ikut diupdate
        $campaignId   = $validated['campaign_id']    ?? $submission->campaign_id;
        $tiktokUserId = $validated['tiktok_user_id'] ?? $submission->tiktok_user_id;
        $baseDir = "submissions/{$campaignId}/{$tiktokUserId}";

        $saveFile = function (? \Illuminate\Http\UploadedFile $file, string $prefix) use ($baseDir) {
            if (!$file) return null;
            $ext  = strtolower($file->getClientOriginalExtension() ?: $file->extension());
            $name = $prefix . '_' . \Illuminate\Support\Str::uuid() . '.' . $ext;
            return $file->storeAs($baseDir, $name, 'public');
        };

        // Ganti file jika ada upload baru
        if ($request->hasFile('screenshot_1')) {
            if ($submission->screenshot_1_path) \Storage::disk('public')->delete($submission->screenshot_1_path);
            $submission->screenshot_1_path = $saveFile($request->file('screenshot_1'), 's1');
        }
        if ($request->hasFile('screenshot_2')) {
            if ($submission->screenshot_2_path) \Storage::disk('public')->delete($submission->screenshot_2_path);
            $submission->screenshot_2_path = $saveFile($request->file('screenshot_2'), 's2');
        }
        if ($request->hasFile('invoice_file')) {
            if ($submission->invoice_file_path) \Storage::disk('public')->delete($submission->invoice_file_path);
            $submission->invoice_file_path = $saveFile($request->file('invoice_file'), 'invoice');
        }
        if ($request->hasFile('review_proof_file')) {
            if ($submission->review_proof_file_path) \Storage::disk('public')->delete($submission->review_proof_file_path);
            $submission->review_proof_file_path = $saveFile($request->file('review_proof_file'), 'review');
        }

        // Assign field biasa
        foreach ([
            'tiktok_user_id','campaign_id',
            'link_1','post_date_1',
            'link_2','post_date_2',
            'purchase_platform',
            'yellow_cart','product_sold','gmv',
            // 🔽 metrik
            'views_1','likes_1','comments_1','shares_1',
            'views_2','likes_2','comments_2','shares_2',
        ] as $field) {
            if (array_key_exists($field, $validated)) {
                $submission->$field = $validated[$field];
            }
        }

        // Set last_metrics_synced_at kalau ada metrik ikut diupdate
        if (collect([
            'views_1','likes_1','comments_1','shares_1',
            'views_2','likes_2','comments_2','shares_2',
        ])->some(fn($k) => array_key_exists($k, $validated))) {
            $submission->last_metrics_synced_at = now();
        }

        $submission->save();

        return response()->json([
            'message' => 'Submission berhasil diupdate.',
            'data'    => $submission->fresh()->loadMissing(['campaign:id,name,slug,brand_id','campaign.brand:id,name']),
        ]);
    }


    public function update__(Request $request, $id)
    {
        // sementara di awal update():
        \Log::info('UPDATE payload', [
        'all' => $request->all(),
        'files' => array_map(fn($f) => $f?->getClientOriginalName(), $request->allFiles())
        ]);

        $submission = InfluencerSubmission::findOrFail($id);

        // =======================
        // 1) Validasi (PATCH-friendly)
        // =======================
        $validated = $request->validate([
            'tiktok_user_id'    => ['sometimes','string','max:100'],
            'campaign_id'       => ['sometimes','integer','exists:campaigns,id'],

            'link_1'            => ['sometimes','nullable','url','max:2048'],
            'post_date_1'       => ['sometimes','nullable','date'],
            'screenshot_1'      => ['sometimes','file','mimes:jpg,jpeg,png,webp','max:5120'],

            'link_2'            => ['sometimes','nullable','url','max:2048'],
            'post_date_2'       => ['sometimes','nullable','date'],
            'screenshot_2'      => ['sometimes','file','mimes:jpg,jpeg,png,webp','max:5120'],

            'purchase_platform' => ['sometimes','nullable', Rule::in(['tiktokshop','shopee'])],
            'invoice_file'      => ['sometimes','file','mimes:pdf,jpg,jpeg,png,webp','max:10240'],
            'review_proof_file' => ['sometimes','file','mimes:pdf,jpg,jpeg,png,webp','max:10240'],

            'yellow_cart'       => ['sometimes','nullable','integer','min:0'],
            'product_sold'      => ['sometimes','nullable','integer','min:0'],
            'gmv'               => ['sometimes','nullable','numeric','min:0'],
        ]);

        // =======================
        // 2) Normalisasi nilai kosong → null (supaya bisa “hapus” nilai)
        // =======================
        foreach (['link_1','link_2','purchase_platform','post_date_1','post_date_2'] as $k) {
            if ($request->has($k) && $request->input($k) === '') {
                $validated[$k] = null;
            }
        }

        // =======================
        // 3) Setup penyimpanan file
        // =======================
        $campaignId   = $validated['campaign_id']    ?? $submission->campaign_id;
        $tiktokUserId = $validated['tiktok_user_id'] ?? $submission->tiktok_user_id;
        $baseDir = "submissions/{$campaignId}/{$tiktokUserId}";

        $saveFile = function (? \Illuminate\Http\UploadedFile $file, string $prefix) use ($baseDir) {
            if (!$file) return null;
            $ext  = strtolower($file->getClientOriginalExtension() ?: $file->extension());
            $name = $prefix . '_' . \Illuminate\Support\Str::uuid() . '.' . $ext;
            return $file->storeAs($baseDir, $name, 'public'); // simpan di disk 'public'
        };

        // =======================
        // 4) Ganti file (hapus lama jika ada upload baru)
        // =======================
        if ($request->hasFile('screenshot_1')) {
            if ($submission->screenshot_1_path) Storage::disk('public')->delete($submission->screenshot_1_path);
            $submission->screenshot_1_path = $saveFile($request->file('screenshot_1'), 's1');
        }
        if ($request->hasFile('screenshot_2')) {
            if ($submission->screenshot_2_path) Storage::disk('public')->delete($submission->screenshot_2_path);
            $submission->screenshot_2_path = $saveFile($request->file('screenshot_2'), 's2');
        }
        if ($request->hasFile('invoice_file')) {
            if ($submission->invoice_file_path) Storage::disk('public')->delete($submission->invoice_file_path);
            $submission->invoice_file_path = $saveFile($request->file('invoice_file'), 'invoice');
        }
        if ($request->hasFile('review_proof_file')) {
            if ($submission->review_proof_file_path) Storage::disk('public')->delete($submission->review_proof_file_path);
            $submission->review_proof_file_path = $saveFile($request->file('review_proof_file'), 'review');
        }

        // =======================
        // 5) Assign field non-file hanya jika ada di $validated (PATCH semantics)
        // =======================
        foreach ([
            'tiktok_user_id','campaign_id',
            'link_1','post_date_1',
            'link_2','post_date_2',
            'purchase_platform',
            'yellow_cart','product_sold','gmv',
        ] as $field) {
            if (array_key_exists($field, $validated)) {
                $submission->$field = $validated[$field];
            }
        }

        // Cek apa yang berubah (sebelum save)
        $dirty = $submission->getDirty();

        // Kalau benar-benar tidak ada apa pun yang berubah DAN tidak ada file baru, kasih respon khusus
        $hasNewFile = $request->hasFile('screenshot_1') || $request->hasFile('screenshot_2') || $request->hasFile('invoice_file') || $request->hasFile('review_proof_file');
        if (empty($dirty) && !$hasNewFile) {
            return response()->json([
                'message' => 'Tidak ada perubahan data.',
                'received_fields' => array_keys($validated),
                'updated_fields'  => [],
                'data'    => $submission->fresh()->loadMissing(['campaign:id,name,slug,brand_id','campaign.brand:id,name']),
            ], 200);
        }

        $submission->save();

        return response()->json([
            'message' => 'Submission berhasil diupdate.',
            'received_fields' => array_keys($validated),
            'updated_fields'  => array_keys($dirty), // ini field yg benar2 berubah
            'data'    => $submission->fresh()->loadMissing(['campaign:id,name,slug,brand_id','campaign.brand:id,name']),
        ], 200);
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
}
