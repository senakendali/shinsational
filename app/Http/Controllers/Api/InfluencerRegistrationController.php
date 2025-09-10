<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InfluencerRegistration;
use App\Models\Campaign; // ← tambahkan
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Carbon;

class InfluencerRegistrationController extends Controller
{
    public function index(Request $request)
    {
        $perPage = (int) $request->input('per_page', 10);
        $include = $request->input('include'); // contoh: "campaign" atau "campaign,brand"

        $query = InfluencerRegistration::query();

        if ($request->filled('tiktok_user_id')) {
            $query->where('tiktok_user_id', $request->input('tiktok_user_id'));
        }
        if ($request->filled('campaign_id')) {
            $query->where('campaign_id', $request->input('campaign_id'));
        }

        // Eager load relasi
        if ($include) {
            $parts = array_map('trim', explode(',', $include));

            if (in_array('campaign', $parts, true)) {
                // with brand sekalian jika diminta
                if (in_array('brand', $parts, true)) {
                    $query->with(['campaign' => function ($q) {
                        $q->select('id','brand_id','name','slug','start_date','end_date','status','is_active','budget','currency');
                        $q->with(['brand:id,name']);
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
     * Store a newly created registration.
     */
    public function store(Request $request)
    {
        // --- Resolve campaign dari form/query ---
        $campaignId   = $request->integer('campaign_id');
        $campaignSlug = $request->string('campaign')->toString();

        if (!$campaignId && $campaignSlug) {
            $campaignId = Campaign::where('slug', $campaignSlug)->value('id');
        }

        // (opsional) fallback format lama: ?my-campaign-slug (tanpa key) → biasanya dipakai di GET, bukan POST
        if (!$campaignId && !$campaignSlug) {
            $raw = $request->getQueryString();
            if ($raw && !str_contains($raw, '=')) {
                $campaignId = Campaign::where('slug', $raw)->value('id');
            }
        }

        // Bersihkan username dari awalan '@'
        $username = ltrim((string) $request->input('tiktok_username', ''), '@');

        // Siapkan payload untuk divalidasi & disimpan
        $payload = $request->all();
        $payload['tiktok_username'] = $username;
        $payload['campaign_id']     = $campaignId; // bisa null → validasi akan fail kalau kosong
        // profile_pic_url dikirim dari frontend via hidden input (prefill dari session)
        // $payload['profile_pic_url'] sudah ada jika dikirim

        // Rules dasar
        $rules = [
            'tiktok_user_id'   => ['required','string','max:100'],
            'full_name'        => ['required','string','max:150'],
            'tiktok_username'  => ['required','string','max:100','regex:/^[A-Za-z0-9_.]+$/'],
            'phone'            => ['required','string','max:30'],
            'address'          => ['required','string','max:255'],
            'birth_date'       => [
                'required','date',
                'before_or_equal:'.Carbon::now()->subYears(18)->format('Y-m-d'),
            ],
            'profile_pic_url'  => ['nullable','url','max:2048'],
            'campaign_id'      => ['required','exists:campaigns,id'],
        ];

        // Unik PER CAMPAIGN
        if ($campaignId) {
            $rules['tiktok_user_id'][] = Rule::unique('influencer_registrations', 'tiktok_user_id')
                ->where(fn($q) => $q->where('campaign_id', $campaignId));

            // (opsional) kalau ingin username juga unik per campaign:
            $rules['tiktok_username'][] = Rule::unique('influencer_registrations', 'tiktok_username')
                ->where(fn($q) => $q->where('campaign_id', $campaignId));
        }

        $messages = [
            'tiktok_user_id.required'     => 'ID TikTok wajib diisi.',
            'full_name.required'          => 'Nama lengkap wajib diisi.',
            'tiktok_username.required'    => 'Username TikTok wajib diisi.',
            'tiktok_username.regex'       => 'Username hanya boleh huruf, angka, underscore, dan titik.',
            'phone.required'              => 'Nomor telepon wajib diisi.',
            'address.required'            => 'Alamat wajib diisi.',
            'birth_date.required'         => 'Tanggal lahir wajib diisi.',
            'birth_date.date'             => 'Tanggal lahir tidak valid.',
            'birth_date.before_or_equal'  => 'Umur minimal harus 18 tahun.',
            'profile_pic_url.url'         => 'URL foto profil tidak valid.',
            'campaign_id.required'        => 'Campaign tidak ditemukan.',
            'campaign_id.exists'          => 'Campaign tidak valid.',
            'tiktok_user_id.unique'       => 'Akun TikTok ini sudah terdaftar untuk campaign ini.',
            'tiktok_username.unique'      => 'Username TikTok ini sudah terdaftar untuk campaign ini.',
        ];

        $validated = validator($payload, $rules, $messages)->validate();

        // Simpan
        $reg = InfluencerRegistration::create($validated);

        return response()->json([
            'message' => 'Registrasi berhasil disimpan.',
            'data'    => $reg->load('campaign:id,name,slug'),
        ], 201);
    }

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

        //$reg = $q->with(['campaign:id,name,slug,brand_id', 'campaign.brand:id,name'])->first();
        $reg = $q->with(['campaign:id,name,slug,brand_id', 'campaign.brand:id,name'])
         ->latest() // ambil registrasi terbaru untuk open_id tsb
         ->first();

        return response()->json([
            'exists'      => (bool) $reg,
            'data'        => $reg,
            'campaign_id' => $campaignId,
        ]);
    }
}
