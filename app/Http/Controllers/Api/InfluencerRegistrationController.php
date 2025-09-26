<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InfluencerRegistration;
use App\Models\InfluencerSubmission;
use App\Models\Campaign;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Session;
use App\Models\InfluencerAccount;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;


class InfluencerRegistrationController extends Controller
{
    public function index(Request $request)
    {
        $perPage = (int) $request->input('per_page', 10);
        $include = $request->input('include'); // contoh: "campaign" atau "campaign,brand"

        $query = InfluencerRegistration::query();

        // --- Filter utama: tiktok_user_id / tiktok_username (OR jika keduanya dikirim) ---
        $hasId   = $request->filled('tiktok_user_id');
        $hasUname= $request->filled('tiktok_username');

        if ($hasId && $hasUname) {
            $uname = ltrim((string) $request->input('tiktok_username'), '@');
            $tid   = (string) $request->input('tiktok_user_id');
            $query->where(function ($q) use ($tid, $uname) {
                $q->where('tiktok_user_id', $tid)
                ->orWhere('tiktok_username', $uname);
            });
        } elseif ($hasId) {
            $query->where('tiktok_user_id', (string) $request->input('tiktok_user_id'));
        } elseif ($hasUname) {
            $uname = ltrim((string) $request->input('tiktok_username'), '@');
            $query->where('tiktok_username', $uname);
        }

        // --- Filter campaign (opsional) ---
        if ($request->filled('campaign_id')) {
            $query->where('campaign_id', (int) $request->input('campaign_id'));
        }

        // --- Eager load relasi ---
        if ($include) {
            $parts = array_map('trim', explode(',', $include));

            if (in_array('campaign', $parts, true)) {
                if (in_array('brand', $parts, true)) {
                    $query->with(['campaign' => function ($q) {
                        $q->select('id','brand_id','name','slug','start_date','end_date','status','is_active','budget','currency')
                        ->with(['brand:id,name']);
                    }]);
                } else {
                    $query->with(['campaign' => function ($q) {
                        $q->select('id','brand_id','name','slug','start_date','end_date','status','is_active','budget','currency');
                    }]);
                }
            }
        }

        $query->latest();

        if ($perPage === 0) {
            // ambil semua
            $data = $query->get();
            return response()->json($data);
        }

        return response()->json(
            $query->paginate($perPage)
        );
    }


    /**
     * GET /api/influencers/{tiktok_user_id}/campaigns
     * Mengembalikan daftar distinct campaign yang diikuti influencer tsb.
     * Support per_page query untuk pagination, default 10, 0 = all
     */
    public function campaignsByTiktok(Request $request, string $tiktok_user_id)
    {
        $perPage = (int) $request->input('per_page', 10);

        $query = Campaign::query()
            ->select('campaigns.*')
            ->join('influencer_registrations as ir', 'ir.campaign_id', '=', 'campaigns.id')
            ->where('ir.tiktok_user_id', $tiktok_user_id)
            ->with(['brand:id,name'])
            ->distinct()
            ->latest('campaigns.created_at');

        if ($perPage === 0) {
            $data = $query->get();
            return response()->json($data);
        }

        return response()->json(
            $query->paginate($perPage)
        );
    }

    /**
     * GET /api/me/campaigns
     * (opsional) Ambil campaign berdasarkan session('tiktok_user_id')
     */
    public function myCampaigns(Request $request)
    {
        $openId = $request->session()->get('tiktok_user_id');
        if (!$openId) {
            return response()->json(['message' => 'Not connected to TikTok'], 401);
        }
        // Reuse logic di atas
        return $this->campaignsByTiktok($request, $openId);
    }

    /**
     * POST /api/influencer-registrations
     * Create registration; jika session punya token TikTok utk open_id yang sama → tempel token ke row baru.
     */

    public function store(Request $request)
{   
    // --- Resolve campaign dari form/query (opsional) ---
    $campaignId   = $request->integer('campaign_id');
    $campaignSlug = (string) $request->input('campaign', '');

    if (!$campaignId && $campaignSlug) {
        $campaignId = Campaign::where('slug', $campaignSlug)->value('id');
    }

    // fallback: kalau query string raw hanya slug (tanpa "=")
    if (!$campaignId && !$campaignSlug) {
        $raw = $request->getQueryString();
        if ($raw && !str_contains($raw, '=')) {
            $campaignId = Campaign::where('slug', $raw)->value('id');
        }
    }

    // Ambil setting usia + gender dari campaign (kalau ada)
    $campaign = $campaignId
        ? Campaign::select('id','name','slug','min_age','max_age','gender')->find($campaignId)
        : null;

    // Bersihkan username dari awalan '@'
    $username = ltrim((string) $request->input('tiktok_username', ''), '@');

    // Normalisasi gender input (biar konsisten)
    $gRaw = strtolower((string) $request->input('gender', ''));
    $gMap = [
        'm' => 'male', 'male' => 'male',
        'f' => 'female','female' => 'female',
        'other' => 'other'
    ];
    $normGender = $gMap[$gRaw] ?? $gRaw;

    // Siapkan payload mentah utk validasi/penyimpanan
    $payload = $request->all();
    $payload['tiktok_username'] = $username;
    $payload['campaign_id']     = $campaignId ?: null; // opsional
    $payload['gender']          = $normGender;

    // ===== Idempotent check (by campaign jika ada; jika tidak, global) =====
    if ($request->filled('tiktok_user_id') || $username !== '') {
        $q = InfluencerRegistration::query();
        if ($campaignId) {
            $q->where('campaign_id', $campaignId);
        }
        $q->where(function ($q2) use ($request, $username) {
            $tid = (string) $request->input('tiktok_user_id', '');
            if ($tid !== '')      $q2->orWhere('tiktok_user_id', $tid);
            if ($username !== '') $q2->orWhere('tiktok_username', $username);
        });

        $existing = $q->latest('id')->first();

        if ($existing) {
            // Merge field penting yang kosong
            $fillable = ['full_name','phone','address','birth_date','profile_pic_url','gender','email','followers_count'];
            $update = [];
            foreach ($fillable as $f) {
                // followers_count: hanya isi kalau request kirim angka valid dan existing kosong
                if ($f === 'followers_count') {
                    $reqVal = $request->input('followers_count', null);
                    if (($existing->followers_count === null || (int)$existing->followers_count === 0) &&
                        $reqVal !== null && is_numeric($reqVal) && (int)$reqVal >= 0) {
                        $update['followers_count'] = (int) $reqVal;
                    }
                    continue;
                }

                if (empty($existing->$f) && $request->filled($f)) {
                    $update[$f] = $request->input($f);
                }
            }

            // Jika followers_count masih kosong, coba backfill dari influencer_accounts
            if (!array_key_exists('followers_count', $update) &&
                ($existing->followers_count === null || (int)$existing->followers_count === 0) &&
                $existing->tiktok_user_id) {
                $accFollowers = \DB::table('influencer_accounts')
                    ->where('tiktok_user_id', $existing->tiktok_user_id)
                    ->value('followers_count');
                if ($accFollowers !== null) {
                    $update['followers_count'] = (int) $accFollowers;
                }
            }

            if ($update) {
                $existing->fill($update)->save();
            }

            // Buat submission hanya jika ada campaign
            if ($existing->campaign_id) {
                try {
                    $this->ensureSubmissionFor($existing->campaign_id, $existing);
                } catch (\Throwable $e) {
                    \Log::warning('ensureSubmissionFor failed on existing registration', [
                        'registration_id' => $existing->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            return response()->json([
                'message' => 'Anda sudah terdaftar' . ($existing->campaign_id ? ' untuk campaign ini.' : '.'),
                'exists'  => true,
                'data'    => $existing->load('campaign:id,name,slug'),
            ], 200);
        }
    }

    // ===== Validasi (pakai batas usia & gender dari campaign jika ada) =====
    $birthDateRules = ['required','date'];
    $messages = [
        'tiktok_user_id.required'   => 'ID TikTok wajib diisi.',
        'full_name.required'        => 'Nama lengkap wajib diisi.',
        'tiktok_username.required'  => 'Username TikTok wajib diisi.',
        'tiktok_username.regex'     => 'Username hanya boleh huruf, angka, underscore, dan titik.',
        'phone.required'            => 'Nomor telepon wajib diisi.',
        'email.required'            => 'Email wajib diisi.',
        'email.email'               => 'Format email tidak valid.',
        'address.required'          => 'Alamat wajib diisi.',
        'birth_date.required'       => 'Tanggal lahir wajib diisi.',
        'birth_date.date'           => 'Tanggal lahir tidak valid.',
        'gender.required'           => 'Gender wajib diisi.',
        'gender.in'                 => 'Gender tidak valid.',
        'profile_pic_url.url'       => 'URL foto profil tidak valid.',
        'campaign_id.exists'        => 'Campaign tidak valid.',
        'tiktok_user_id.unique'     => 'Akun TikTok ini sudah terdaftar.',
        'tiktok_username.unique'    => 'Username TikTok ini sudah terdaftar.',
        'followers_count.integer'   => 'Followers harus angka.',
        'followers_count.min'       => 'Followers minimal 0.',
    ];

    if ($campaign) {
        if ($campaign->min_age !== null) {
            $minAgeCutoff = \Carbon\Carbon::today()->subYears((int)$campaign->min_age)->format('Y-m-d');
            $birthDateRules[] = 'before_or_equal:'.$minAgeCutoff;
            $messages['birth_date.before_or_equal'] = 'Umur minimal '.$campaign->min_age.' tahun.';
        }
        if ($campaign->max_age !== null) {
            $maxAgeCutoff = \Carbon\Carbon::today()->subYears((int)$campaign->max_age)->format('Y-m-d');
            $birthDateRules[] = 'after_or_equal:'.$maxAgeCutoff;
            $messages['birth_date.after_or_equal'] = 'Umur maksimal '.$campaign->max_age.' tahun.';
        }
    }

    $rules = [
        'tiktok_user_id'   => ['required','string','max:100'],
        'full_name'        => ['required','string','max:150'],
        'tiktok_username'  => ['required','string','max:100','regex:/^[A-Za-z0-9_.]+$/'],
        'phone'            => ['required','string','max:30'],
        'email'            => ['required','email','max:255'],
        'address'          => ['required','string','max:255'],
        'birth_date'       => $birthDateRules,
        'gender'           => ['required', \Illuminate\Validation\Rule::in(['male','female','other'])],
        'profile_pic_url'  => ['nullable','url','max:2048'],
        'campaign_id'      => ['nullable','exists:campaigns,id'], // <— opsional
        'followers_count'  => ['nullable','integer','min:0'],
    ];

    // Pembatasan gender sesuai campaign (jika campaign mengunci ke male/female)
    if ($campaign) {
        $cg = strtolower((string) $campaign->gender);
        if (in_array($cg, ['male','female'], true)) {
            $rules['gender'] = ['required', \Illuminate\Validation\Rule::in([$cg])];
            $messages['gender.in'] = 'Campaign ini hanya menerima KOL ' . ($cg === 'male' ? 'laki-laki.' : 'perempuan.');
        }
        // jika null / 'all' / 'any' / nilai lain -> pakai rule default (male|female|other)
    }

    // Unik PER CAMPAIGN kalau campaign_id ada; jika tidak, unik global
    if ($campaignId) {
        $rules['tiktok_user_id'][] = \Illuminate\Validation\Rule::unique('influencer_registrations', 'tiktok_user_id')
            ->where(fn($q) => $q->where('campaign_id', $campaignId));
        $rules['tiktok_username'][] = \Illuminate\Validation\Rule::unique('influencer_registrations', 'tiktok_username')
            ->where(fn($q) => $q->where('campaign_id', $campaignId));
        // Override message biar lebih spesifik
        $messages['tiktok_user_id.unique']  = 'Akun TikTok ini sudah terdaftar untuk campaign ini.';
        $messages['tiktok_username.unique'] = 'Username TikTok ini sudah terdaftar untuk campaign ini.';
    } else {
        $rules['tiktok_user_id'][]  = \Illuminate\Validation\Rule::unique('influencer_registrations', 'tiktok_user_id');
        $rules['tiktok_username'][] = \Illuminate\Validation\Rule::unique('influencer_registrations', 'tiktok_username');
    }

    $validated = validator($payload, $rules, $messages)->validate();

    // Simpan + link token + ensure submission (pakai transaksi)
    $reg = \DB::transaction(function () use ($validated, $campaignId) {
        $reg = InfluencerRegistration::create($validated);

        // Link token akun (optional) + backfill followers_count kalau belum ada
        if ($reg->tiktok_user_id) {
            $acc = InfluencerAccount::where('tiktok_user_id', $reg->tiktok_user_id)->first();
            if ($acc) {
                $reg->token_type        = $acc->token_type ?: ($reg->token_type ?: 'Bearer');
                $reg->access_token      = $acc->access_token;
                $reg->refresh_token     = $acc->refresh_token;
                $reg->expires_at        = $acc->expires_at ? \Carbon\Carbon::parse($acc->expires_at) : null;
                $reg->last_refreshed_at = $acc->last_refreshed_at ?: now();
                $reg->revoked_at        = null;
                $reg->scopes            = $acc->scopes ?? [];

                if (($reg->followers_count === null || (int)$reg->followers_count === 0) &&
                    $acc->followers_count !== null) {
                    $reg->followers_count = (int) $acc->followers_count;
                }

                $reg->save();
            }
        }

        // Pastikan submission row exists hanya kalau ada campaign
        if ($campaignId) {
            try {
                $this->ensureSubmissionFor($reg->campaign_id, $reg);
            } catch (\Throwable $e) {
                \Log::warning('ensureSubmissionFor failed on create registration', [
                    'registration_id' => $reg->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return $reg;
    });

    return response()->json([
        'message' => 'Registrasi berhasil disimpan.',
        'exists'  => false,
        'data'    => $reg->load('campaign:id,name,slug'),
    ], 201);
}



    /**
     * Pastikan ada 1 baris submission untuk (campaign_id, tiktok_user_id).
     * Tidak overwrite jika sudah ada. Inisialisasi angka ke 0 agar agregasi aman.
     */
    protected function ensureSubmissionFor($campaignId, $reg): void
    {
        if (!$campaignId || !$reg?->tiktok_user_id) return;

        $submission = InfluencerSubmission::where('campaign_id', $campaignId)
            ->where('tiktok_user_id', $reg->tiktok_user_id)
            ->first();

        if ($submission) return;

        $submission = new InfluencerSubmission();
        $submission->campaign_id     = $campaignId;
        $submission->tiktok_user_id  = $reg->tiktok_user_id;
        // simpan beberapa info bantu (jika kolom ada di tabel)
        if (Schema::hasColumn('influencer_submissions', 'tiktok_username')) {
            $submission->tiktok_username = $reg->tiktok_username ?? null;
        }
        if (Schema::hasColumn('influencer_submissions', 'influencer_id')) {
            $submission->influencer_id = $reg->id; // relasi balik ke registration kalau ada kolomnya
        }
        if (Schema::hasColumn('influencer_submissions', 'influencer_name')) {
            $submission->influencer_name = $reg->full_name ?? null;
        }

        // Inisialisasi metric ke 0 agar perhitungan tidak NaN
        foreach ([1,2,3,4,5] as $i) {
            foreach (['views','likes','comments','shares'] as $m) {
                $col = "{$m}_{$i}";
                if (Schema::hasColumn('influencer_submissions', $col)) {
                    $submission->{$col} = 0;
                }
            }
            $linkCol = "link_{$i}";
            if (Schema::hasColumn('influencer_submissions', $linkCol)) {
                $submission->{$linkCol} = null;
            }
        }

        $submission->save();
    }


    



    public function update(Request $request, $id)
    {
        try {
            /** @var \App\Models\InfluencerRegistration $reg */
            $reg = InfluencerRegistration::findOrFail($id);

            // --- Normalisasi input ringan ---
            $usernameRaw = $request->has('tiktok_username')
                ? ltrim((string) $request->input('tiktok_username'), '@')
                : null;

            $gRaw = $request->has('gender')
                ? strtolower((string) $request->input('gender'))
                : null;

            $gMap = ['m' => 'male', 'male' => 'male', 'f' => 'female', 'female' => 'female', 'other' => 'other'];
            $normGender = $gRaw !== null ? ($gMap[$gRaw] ?? $gRaw) : null;

            // campaign_id boleh null (opsional). Jika dikirim string kosong → treat as null
            $incomingCampaignId = $request->has('campaign_id')
                ? ($request->input('campaign_id') === '' ? null : (int) $request->input('campaign_id'))
                : null;

            // --- Build rules dinamis (semua opsional, hanya yang dikirim divalidasi) ---
            $rules = [
                'full_name'        => ['sometimes','nullable','string','max:150'],
                'tiktok_username'  => ['sometimes','nullable','string','max:100','regex:/^[A-Za-z0-9_.]+$/'],
                'phone'            => ['sometimes','nullable','string','max:100'],
                'email'            => ['sometimes','nullable','email','max:191'],
                'address'          => ['sometimes','nullable','string','max:1000'],
                'birth_date'       => ['sometimes','nullable','date'],
                'gender'           => ['sometimes','nullable', Rule::in(['male','female','other'])],
                'followers_count'  => ['sometimes','nullable','integer','min:0'],
                'campaign_id'      => ['sometimes','nullable','integer','exists:campaigns,id'],
                'profile_pic_url'  => ['sometimes','nullable','url','max:2048'],
            ];

            $messages = [
                'tiktok_username.regex' => 'Username hanya boleh huruf, angka, underscore, dan titik.',
            ];

            // Validasi unik username per campaign (kalau username/campaign dikirim)
            // - Jika campaign_id tidak dikirim, gunakan campaign_id existing untuk cek unik.
            $effectiveCampaignId = $incomingCampaignId !== null ? $incomingCampaignId : $reg->campaign_id;

            if ($request->has('tiktok_username')) {
                $rules['tiktok_username'][] = Rule::unique('influencer_registrations', 'tiktok_username')
                    ->ignore($reg->id)
                    ->where(function ($q) use ($effectiveCampaignId) {
                        // Unik per campaign; kalau campaign NULL → unik global di scope NULL
                        if (is_null($effectiveCampaignId)) {
                            $q->whereNull('campaign_id');
                        } else {
                            $q->where('campaign_id', $effectiveCampaignId);
                        }
                    });
                $messages['tiktok_username.unique'] = is_null($effectiveCampaignId)
                    ? 'Username TikTok ini sudah terdaftar.'
                    : 'Username TikTok ini sudah terdaftar untuk campaign ini.';
            }

            // Kalau gender campaign dikunci, batasi pilihan
            if ($request->has('campaign_id') && $effectiveCampaignId) {
                $camp = Campaign::select('id','gender')->find($effectiveCampaignId);
                if ($camp) {
                    $cg = strtolower((string) $camp->gender);
                    if (in_array($cg, ['male','female'], true)) {
                        $rules['gender'] = ['sometimes','nullable', Rule::in([$cg])];
                        $messages['gender.in'] = 'Campaign ini hanya menerima KOL ' . ($cg === 'male' ? 'laki-laki.' : 'perempuan.');
                    }
                }
            }

            // Validasi
            $validated = $request->validate($rules, $messages);

            // Overwrite hasil normalisasi ke $validated (kalau ada)
            if ($request->has('tiktok_username')) {
                $validated['tiktok_username'] = $usernameRaw ?? null;
            }
            if ($request->has('gender')) {
                $validated['gender'] = $normGender ?? null;
            }
            if ($request->has('campaign_id')) {
                $validated['campaign_id'] = $incomingCampaignId; // bisa null
            }

            // Simpan dalam transaksi
            $updated = DB::transaction(function () use ($reg, $validated, $effectiveCampaignId) {
                $oldCampaignId = $reg->campaign_id;

                // Assign hanya key yang ada di $validated
                foreach ($validated as $k => $v) {
                    $reg->{$k} = $v === '' ? null : $v; // kosong → null
                }

                $reg->save();

                // Jika ada/menjadi campaign → ensure submission
                $newCampaignId = array_key_exists('campaign_id', $validated) ? $validated['campaign_id'] : $oldCampaignId;
                if ($newCampaignId) {
                    // Pastikan kolom tiktok_user_id ada & terisi; jika row lama pseudo/punya open_id ya sudah
                    if ($reg->tiktok_user_id) {
                        $this->ensureSubmissionFor($newCampaignId, $reg);
                    }
                }

                return $reg->fresh(['campaign:id,name,slug']);
            });

            return response()->json([
                'message' => 'KOL berhasil diperbarui.',
                'data'    => $updated,
            ], 200);

        } catch (\Illuminate\Validation\ValidationException $ve) {
            // biarkan Laravel kirim 422 JSON standar
            throw $ve;
        } catch (\Throwable $e) {
            Log::error('Update InfluencerRegistration failed', [
                'id'  => $id,
                'err' => $e->getMessage(),
            ]);
            return response()->json(['message' => 'Terjadi kesalahan saat update KOL.'], 500);
        }
    }



    /**
     * GET /api/influencer-registrations/check
     * params: tiktok_user_id, campaign_id? | campaign (slug)?
     */
    public function check(Request $request)
    {
        $validated = $request->validate([
            'tiktok_user_id' => ['required','string','max:100'],
            'campaign_id'    => ['nullable','integer','exists:campaigns,id'],
            'campaign'       => ['nullable','string','max:160'], // slug
        ]);

        $campaignId = $validated['campaign_id'] ?? null;

        // Kalau tidak ada campaign_id tapi ada slug → resolve
        if (!$campaignId && !empty($validated['campaign'])) {
            $c = Campaign::where('slug', $validated['campaign'])->first();
            if ($c) $campaignId = $c->id;
        }

        $q = InfluencerRegistration::query()
            ->where('tiktok_user_id', $validated['tiktok_user_id']);

        if (!is_null($campaignId)) {
            $q->where('campaign_id', $campaignId);
        }

        $reg = $q->with(['campaign:id,name,slug,brand_id', 'campaign.brand:id,name'])
                 ->latest() // ambil registrasi terbaru untuk open_id tsb
                 ->first();

        return response()->json([
            'exists'      => (bool) $reg,
            'data'        => $reg,
            'campaign_id' => $campaignId,
        ]);
    }

    public function show(Request $request, $id)
    {
        $include = $request->input('include'); // contoh: "campaign" atau "campaign,brand"

        $q = InfluencerRegistration::query();

        if ($include) {
            $parts = array_map('trim', explode(',', $include));
            if (in_array('campaign', $parts, true)) {
                if (in_array('brand', $parts, true)) {
                    $q->with(['campaign' => function ($q2) {
                        $q2->select('id','brand_id','name','slug','start_date','end_date','status','is_active','budget','currency')
                        ->with(['brand:id,name']);
                    }]);
                } else {
                    $q->with(['campaign' => function ($q2) {
                        $q2->select('id','brand_id','name','slug','start_date','end_date','status','is_active','budget','currency');
                    }]);
                }
            }
        }

        $reg = $q->findOrFail($id);

        return response()->json($reg, 200);
    }

    public function destroy($id)
    {
        try {
            $deleted = \DB::transaction(function () use ($id) {
                /** @var \App\Models\InfluencerRegistration $reg */
                $reg = InfluencerRegistration::lockForUpdate()->findOrFail($id);

                // Hapus submission yg terkait campaign+open_id (kalau ada)
                if ($reg->campaign_id && $reg->tiktok_user_id) {
                    InfluencerSubmission::where('campaign_id', $reg->campaign_id)
                        ->where('tiktok_user_id', $reg->tiktok_user_id)
                        ->delete();
                }

                // Hapus registrasinya
                $reg->delete();

                return $reg;
            });

            return response()->json([
                'message' => 'Registrasi KOL berhasil dihapus.',
                'data'    => ['id' => $deleted->id]
            ], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Data tidak ditemukan.'], 404);
        } catch (\Throwable $e) {
            \Log::error('Delete InfluencerRegistration failed', [
                'id'  => $id,
                'err' => $e->getMessage(),
            ]);
            return response()->json(['message' => 'Gagal menghapus registrasi.'], 500);
        }
    }

}
