<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InfluencerSubmission;
use App\Models\Campaign;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class InfluencerSubmissionController extends Controller
{
    /**
     * GET /api/influencer-submissions
     * Filter opsional: tiktok_user_id, campaign_id; include=campaign; per_page
     */
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
        // Validasi dasar
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

                // Kalau kamu sudah tambahkan kolom KPI ini dan mau terima:
                'yellow_cart'     => ['nullable','integer','min:0'],
                'product_sold'    => ['nullable','integer','min:0'],
                'gmv'             => ['nullable','numeric','min:0'],
            ],
            [
                'tiktok_user_id.required' => 'ID TikTok wajib diisi.',
                'campaign_id.required'    => 'Campaign wajib dipilih.',
                'link_1.required'         => 'Link postingan 1 wajib diisi.',
                'link_2.required'         => 'Link postingan 2 wajib diisi.',
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
        $submission->link_2              = $validated['link_2'];
        $submission->post_date_2         = $validated['post_date_2'] ?? null;
        $submission->purchase_platform   = $validated['purchase_platform'] ?? null;

        // Optional KPI
        $submission->yellow_cart   = $validated['yellow_cart']  ?? $submission->yellow_cart;
        $submission->product_sold  = $validated['product_sold'] ?? $submission->product_sold;
        $submission->gmv           = $validated['gmv']          ?? $submission->gmv;

        // Path file (overwrite jika ada file baru)
        if ($s1Path)  $submission->screenshot_1_path     = $s1Path;
        if ($s2Path)  $submission->screenshot_2_path     = $s2Path;
        if ($invPath) $submission->invoice_file_path      = $invPath;
        if ($revPath) $submission->review_proof_file_path = $revPath;

        $submission->save();

        return response()->json([
            'message' => 'Submission berhasil disimpan.',
            'data'    => $submission->fresh(),
        ], $submission->wasRecentlyCreated ? 201 : 200);
    }

    // App\Http\Controllers\Api\InfluencerSubmissionController.php

    public function update(Request $request, $id)
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
