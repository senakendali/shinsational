<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Campaign;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;

class CampaignController extends Controller
{
    public function index(Request $request)
    {
        $query = Campaign::with('brand')
            ->ofBrand($request->brand_id)
            ->search($request->search)
            ->status($request->status);

        if ($request->filled('is_active')) {
            $query->where('is_active', filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        // filter campaign yang sedang berjalan pada tanggal tertentu
        if ($request->filled('ongoing_at')) {
            $query->ongoingAt($request->input('ongoing_at'));
        }

        return response()->json($query->latest()->paginate(10));
    }

    public function show(Campaign $campaign)
    {
        $campaign->load('brand');
        return response()->json($campaign);
    }

    public function store(Request $request)
    {
        $payload = $this->normalizePayload($request);

        $validator = Validator::make($payload, $this->rules($payload));
        if ($validator->fails()) {
            return response()->json(['message' => 'Validasi gagal', 'errors' => $validator->errors()], 422);
        }

        // slug otomatis unik per brand kalau kosong
        $payload['slug'] = $payload['slug'] ?? $this->makeUniqueSlug($payload['name'], $payload['brand_id']);

        $payload = Arr::only($payload, [
            'brand_id','name','slug','code','objective','start_date','end_date',
            'status','is_active','budget','currency','kpi_targets','hashtags','notes'
        ]);

        $campaign = Campaign::create($payload)->load('brand');

        return response()->json([
            'message' => 'Campaign berhasil ditambahkan',
            'data'    => $campaign,
        ]);
    }

    public function update(Request $request, Campaign $campaign)
    {
        $payload = $this->normalizePayload($request, $campaign);

        $validator = Validator::make($payload, $this->rules($payload, $campaign->id));
        if ($validator->fails()) {
            return response()->json(['message' => 'Validasi gagal', 'errors' => $validator->errors()], 422);
        }

        // slug otomatis jika tidak dikirim
        if (!isset($payload['slug']) && isset($payload['name'])) {
            $payload['slug'] = $this->makeUniqueSlug($payload['name'], $payload['brand_id'] ?? $campaign->brand_id, $campaign->id);
        }

        $payload = Arr::only($payload, [
            'brand_id','name','slug','code','objective','start_date','end_date',
            'status','is_active','budget','currency','kpi_targets','hashtags','notes'
        ]);

        $campaign->update($payload);
        $campaign->refresh()->load('brand');

        return response()->json([
            'message' => 'Campaign berhasil diperbarui',
            'data'    => $campaign,
        ]);
    }

    public function destroy(Campaign $campaign)
    {
        $campaign->delete();
        return response()->json(['message' => 'Campaign berhasil dihapus']);
    }

    /* ================== Helpers ================== */

    private function rules(array $payload, ?int $ignoreId = null): array
    {
        $brandId = $payload['brand_id'] ?? null;

        return [
            'brand_id'    => ['required','integer','exists:brands,id'],
            'name'        => ['required','string','max:150'],
            'slug'        => [
                'nullable','string','max:160',
                Rule::unique('campaigns')->where(fn($q) => $q->where('brand_id', $brandId))
                    ->ignore($ignoreId),
            ],
            'code'        => ['nullable','string','max:50', Rule::unique('campaigns','code')->ignore($ignoreId)],
            'objective'   => ['nullable','string','max:50'],
            'start_date'  => ['nullable','date'],
            'end_date'    => ['nullable','date','after_or_equal:start_date'],
            'status'      => ['nullable','in:draft,scheduled,active,paused,completed,archived'],
            'is_active'   => ['sometimes','boolean'],
            'budget'      => ['nullable','numeric','min:0'],
            'currency'    => ['nullable','string','size:3'],
            'kpi_targets' => ['nullable','array'],
            'hashtags'    => ['nullable','array'],
            'notes'       => ['nullable','string'],
        ];
    }

    private function normalizePayload(Request $request, ?Campaign $existing = null): array
    {
        $payload = $request->all();

        // Booleans
        if ($request->has('is_active')) {
            $payload['is_active'] = filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN);
        }

        // Decode kpi_targets (JSON string/array) & bersihkan nilai kosong
        if ($request->has('kpi_targets')) {
            $kt = $request->input('kpi_targets');
            if (is_string($kt)) {
                $decoded = json_decode($kt, true);
                $kt = json_last_error() === JSON_ERROR_NONE ? $decoded : [];
            }
            $payload['kpi_targets'] = is_array($kt) ? array_filter($kt, fn($v) => $v !== null && $v !== '') : [];
        }

        // Decode hashtags: terima JSON array atau string dipisah koma
        if ($request->has('hashtags')) {
            $tags = $request->input('hashtags');
            if (is_string($tags)) {
                // coba JSON dulu
                $decoded = json_decode($tags, true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                    $tags = $decoded;
                } else {
                    // fallback: split by koma
                    $tags = array_map(
                        fn($t) => trim($t),
                        array_filter(explode(',', $tags))
                    );
                }
            }
            // filter kosong & duplikat (case-insensitive)
            if (is_array($tags)) {
                $tags = array_values(array_unique(array_filter($tags, fn($t) => $t !== '')));
            } else {
                $tags = [];
            }
            $payload['hashtags'] = $tags;
        }

        // Dates: biarkan validator yang cek format; model cast akan mengubah ke Carbon
        // Currency default
        if (!isset($payload['currency']) || $payload['currency'] === '') {
            $payload['currency'] = $existing->currency ?? 'IDR';
        }

        return $payload;
    }

    private function makeUniqueSlug(string $name, int $brandId, ?int $ignoreId = null): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $i = 1;

        while (
            Campaign::where('brand_id', $brandId)
                ->where('slug', $slug)
                ->when($ignoreId, fn($q) => $q->where('id', '!=', $ignoreId))
                ->exists()
        ) {
            $slug = $base . '-' . $i++;
        }

        return $slug;
    }
}
