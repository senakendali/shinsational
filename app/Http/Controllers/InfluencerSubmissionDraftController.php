<?php

namespace App\Http\Controllers;

use App\Models\InfluencerSubmission;
use App\Models\InfluencerSubmissionDraft;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;

class InfluencerSubmissionDraftController extends Controller
{
    // GET /api/influencer-submissions/draft?tiktok_user_id=&campaign_id=&per_page=&slot=
    public function index(Request $req)
    {
        $validated = $req->validate([
            'tiktok_user_id' => ['required','string','max:255'],
            'campaign_id'    => ['required','integer'],
            'per_page'       => ['nullable','integer','min:1','max:50'],
            'slot'           => ['nullable','integer','min:1','max:5'],
        ]);

        $subId = InfluencerSubmission::query()
            ->where('tiktok_user_id', $validated['tiktok_user_id'])
            ->where('campaign_id', $validated['campaign_id'])
            ->value('id');

        if (!$subId) {
            return response()->json(['data' => []]);
        }

        $q = InfluencerSubmissionDraft::query()
            ->where('influencer_submission_id', $subId)
            ->where('is_latest', true)
            ->when(isset($validated['slot']), fn($qq) => $qq->where('slot', (int)$validated['slot']))
            ->orderBy('slot')
            ->orderByDesc('updated_at');

        // Transform: tambah status_text (“Waiting for Feedback” utk pending)
        $transform = function (InfluencerSubmissionDraft $d) {
            $status = strtolower($d->status ?? '');
            $label  = $status === 'pending' ? 'Waiting for Feedback'
                   : ($status ? ucfirst($status) : '-');

            return [
                'id'            => $d->id,
                'slot'          => $d->slot,
                'url'           => $d->url,
                'channel'       => $d->channel,
                'status'        => $d->status,
                'status_text'   => $label,          // <<<<<<<<<<
                'submitted_at'  => $d->submitted_at,
                'reviewed_at'   => $d->reviewed_at,
                'reviewed_by'   => $d->reviewed_by,
                'reviewer_note' => $d->reviewer_note,
                'revision'      => $d->revision,
                'is_latest'     => $d->is_latest,
                'updated_at'    => $d->updated_at,
            ];
        };

        if ($per = $validated['per_page'] ?? null) {
            $p = $q->paginate((int)$per);
            $p->getCollection()->transform($transform);
            return $p;
        }

        $rows = $q->get()->map($transform);
        return response()->json(['data' => $rows]);
    }

    // GET /api/influencer-submissions/draft/with-influencer?campaign_id=&status=&slot=&q=&per_page=

    public function indexWithInfluencer(Request $req)
    {
        $v = $req->validate([
            'campaign_id' => ['required','integer'],
            'status'      => ['nullable', Rule::in(['pending','approved','rejected'])],
            'slot'        => ['nullable','integer','min:1','max:5'],
            'q'           => ['nullable','string','max:255'],
            'per_page'    => ['nullable','integer','min:1','max:50'],
        ]);

        // helper bikin COALESCE hanya dari kolom yg beneran ada
        $coalesce = function (string $table, array $cands, string $alias) {
            $exist = array_values(array_filter($cands, fn($c) => Schema::hasColumn($table, $c)));
            if (count($exist) === 0) {
                return DB::raw("NULL as `{$alias}`");
            }
            $expr = implode(', ', array_map(fn($c) => "r.`{$c}`", $exist));
            return DB::raw("COALESCE({$expr}) as `{$alias}`");
        };

        $q = \App\Models\InfluencerSubmissionDraft::query()
            ->from('influencer_submission_drafts as d')
            ->join('influencer_submissions as s', 's.id', '=', 'd.influencer_submission_id')
            ->leftJoin('influencer_registrations as r', function ($j) {
                $j->on('r.campaign_id', '=', 's.campaign_id')
                ->on('r.tiktok_user_id', '=', 's.tiktok_user_id');
            })
            ->where('d.is_latest', true)
            ->where('s.campaign_id', $v['campaign_id'])
            ->when(isset($v['status']), fn($qq) => $qq->where('d.status', $v['status']))
            ->when(isset($v['slot']),   fn($qq) => $qq->where('d.slot', (int)$v['slot']))
            ->when($v['q'] ?? null, function ($qq) use ($v) {
                $term = '%'.trim($v['q']).'%';
                $qq->where(function ($w) use ($term) {
                    $w->orWhere('r.tiktok_username', 'like', $term)
                    ->orWhere('r.username', 'like', $term)
                    ->orWhere('r.full_name', 'like', $term)
                    ->orWhere('r.name', 'like', $term)
                    ->orWhere('s.tiktok_user_id', 'like', $term)
                    ->orWhere('d.url', 'like', $term);
                });
            })
            ->orderBy('d.slot')
            ->orderByDesc('d.updated_at');

        // ===== SELECT aman (dinamis) =====
        $selects = [
            // draft
            'd.id','d.slot','d.url','d.channel','d.status','d.submitted_at','d.reviewed_at',
            'd.reviewed_by','d.reviewer_note','d.revision','d.is_latest','d.updated_at',
            // submission
            's.id as submission_id','s.tiktok_user_id','s.campaign_id',
            // id registration (boleh null)
            'r.id as registration_id',
        ];

        // reviewer notes (baru) + fallback
        if (Schema::hasColumn('influencer_submission_drafts', 'reviewer_note_1')) {
            $selects[] = 'd.reviewer_note_1';
        } elseif (Schema::hasColumn('influencer_submission_drafts', 'reviewer_note')) {
            $selects[] = DB::raw('d.reviewer_note as reviewer_note_1');
        } else {
            $selects[] = DB::raw('NULL as reviewer_note_1');
        }

        if (Schema::hasColumn('influencer_submission_drafts', 'reviewer_note_2')) {
            $selects[] = 'd.reviewer_note_2';
        } else {
            $selects[] = DB::raw('NULL as reviewer_note_2');
        }

        // username
        if (Schema::hasColumn('influencer_registrations', 'tiktok_username')) {
            $selects[] = 'r.tiktok_username';
        } elseif (Schema::hasColumn('influencer_registrations', 'username')) {
            $selects[] = DB::raw('r.username as tiktok_username');
        } else {
            $selects[] = DB::raw('NULL as tiktok_username');
        }

        // full name (pakai coalesce ke beberapa kandidat)
        $selects[] = $coalesce('influencer_registrations',
            ['tiktok_full_name','full_name','name','display_name'],
            'tiktok_full_name'
        );

        // avatar url
        $selects[] = $coalesce('influencer_registrations',
            ['tiktok_avatar_url','avatar_url','profile_pic_url','photo_url'],
            'tiktok_avatar_url'
        );

        // email / phone / address (opsional)
        $selects[] = Schema::hasColumn('influencer_registrations','email')
            ? DB::raw('r.email as influencer_email') : DB::raw('NULL as influencer_email');

        $selects[] = Schema::hasColumn('influencer_registrations','phone')
            ? DB::raw('r.phone as influencer_phone') : DB::raw('NULL as influencer_phone');

        $selects[] = $coalesce('influencer_registrations',
            ['address','full_address','shipping_address','alamat','address_line_1'],
            'influencer_address'
        );

        $q->select($selects);

        // mapper status -> label UI baru
        $statusText = fn(?string $status) => match (strtolower($status ?? '')) {
            'pending'  => 'Waiting for Approval',
            'rejected' => 'Need to Revise',
            'approved' => 'Approve',
            default    => '-',
        };

        $transform = function ($row) use ($statusText) {
            return [
                'id'              => $row->id,
                'slot'            => (int) $row->slot,
                'url'             => $row->url,
                'channel'         => $row->channel,
                'status'          => $row->status,
                'status_text'     => $statusText($row->status),
                'submitted_at'    => $row->submitted_at,
                'reviewed_at'     => $row->reviewed_at,
                'reviewed_by'     => $row->reviewed_by,
                // NEW: dual notes + BC field
                'reviewer_note_1' => $row->reviewer_note_1 ?? $row->reviewer_note,
                'reviewer_note_2' => $row->reviewer_note_2,
                'reviewer_note'   => $row->reviewer_note, // tetap kirim utk klien lama
                'revision'        => (int) $row->revision,
                'is_latest'       => (bool) $row->is_latest,
                'updated_at'      => $row->updated_at,
                'submission'      => [
                    'id'             => $row->submission_id,
                    'tiktok_user_id' => $row->tiktok_user_id,
                    'campaign_id'    => (int) $row->campaign_id,
                ],
                'influencer'      => [
                    'registration_id'  => $row->registration_id,
                    'tiktok_username'  => $row->tiktok_username,
                    'tiktok_full_name' => $row->tiktok_full_name,
                    'tiktok_avatar_url'=> $row->tiktok_avatar_url,
                    'email'            => $row->influencer_email,
                    'phone'            => $row->influencer_phone,
                    'address'          => $row->influencer_address,
                    'open_id'          => $row->tiktok_user_id,
                ],
            ];
        };

        if ($per = $v['per_page'] ?? null) {
            $p = $q->paginate((int)$per);
            $p->getCollection()->transform($transform);
            return $p;
        }

        $rows = $q->get()->map($transform);
        return response()->json(['data' => $rows]);
    }




    // POST /api/influencer-submissions/draft
    public function store(Request $req)
    {
        $data = $req->validate([
            'tiktok_user_id' => ['required', 'string', 'max:255'],
            'campaign_id'    => ['required', 'integer'],
            'slot'           => ['required', 'integer', 'min:1', 'max:5'],
            'draft_url'      => ['required', 'string', 'max:2048'],
            'draft_channel'  => ['nullable', 'string', 'max:50'],
        ]);

        $draft = DB::transaction(function () use ($data) {
            $submission = InfluencerSubmission::firstOrCreate(
                ['tiktok_user_id' => $data['tiktok_user_id'], 'campaign_id' => $data['campaign_id']],
                []
            );

            $slot = (int)$data['slot'];

            InfluencerSubmissionDraft::where('influencer_submission_id', $submission->id)
                ->where('slot', $slot)
                ->where('is_latest', true)
                ->update(['is_latest' => false]);

            $maxRev = (int) InfluencerSubmissionDraft::where('influencer_submission_id', $submission->id)
                ->where('slot', $slot)
                ->max('revision');
            $nextRev = $maxRev ? $maxRev + 1 : 1;

            $draft = InfluencerSubmissionDraft::create([
                'influencer_submission_id' => $submission->id,
                'slot'         => $slot,
                'url'          => $data['draft_url'],
                'channel'      => $data['draft_channel'] ?? null,
                'status'       => 'pending',
                'submitted_at' => now(),
                'revision'     => $nextRev,
                'is_latest'    => true,
            ]);

            return $draft->fresh();
        });

        return response()->json($draft, 201);
    }

    // PATCH /api/influencer-submissions/draft/{id}
    public function update(Request $req, $id)
    {
        $draft = InfluencerSubmissionDraft::findOrFail($id);

        // Terima field baru + fallback lama
        $validated = $req->validate([
            'status'            => ['required', Rule::in(['pending', 'approved', 'rejected'])],
            'reviewer_note'     => ['nullable', 'string'], // legacy (optional)
            'reviewer_note_1'   => ['nullable', 'string'],
            'reviewer_note_2'   => ['nullable', 'string'],
        ]);

        // Deteksi mana yang dikirim (agar tidak menimpa tanpa sengaja)
        $hasNote1   = $req->has('reviewer_note_1'); // true jika key ada, meski ''
        $hasNote2   = $req->has('reviewer_note_2');
        $hasLegacy  = $req->has('reviewer_note');

        // Normalisasi nilai ('' -> null, trim spasi)
        $note1 = $hasNote1 ? trim((string)$req->input('reviewer_note_1')) : null;
        $note2 = $hasNote2 ? trim((string)$req->input('reviewer_note_2')) : null;

        if (!$hasNote1 && $hasLegacy) {
            // fallback: legacy ditaruh ke note_1 jika note_1 tidak dikirim
            $note1 = trim((string)$req->input('reviewer_note'));
        }

        if ($hasNote1 && $note1 === '') $note1 = null;
        if ($hasNote2 && $note2 === '') $note2 = null;
        if (!$hasNote1 && !$hasNote2 && $hasLegacy && $note1 === '') $note1 = null;

        $payload = [
            'status'      => $validated['status'],
            'reviewed_at' => now(),
            'reviewed_by' => optional($req->user())->id,
        ];

        // Hanya set kolom note yang memang dikirim (atau via fallback),
        // supaya nilai lama tidak tertimpa ketika field tak dikirim.
        if ($hasNote1 || $hasLegacy) {
            $payload['reviewer_note_1'] = $note1;
        }
        if ($hasNote2) {
            $payload['reviewer_note_2'] = $note2;
        }

        // Sinkronkan kolom legacy jika ada di schema (untuk kompat lama)
        try {
            if (Schema::hasColumn('influencer_submission_drafts', 'reviewer_note')
                && ($hasNote1 || $hasNote2 || $hasLegacy)) {
                $payload['reviewer_note'] = $note1 ?? $note2 ?? null;
            }
        } catch (\Throwable $e) {
            // abaikan jika cek schema gagal (mis. saat testing)
        }

        $draft->fill($payload)->save();

        return response()->json($draft->fresh(), 200);
    }
}
