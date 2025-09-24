<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class BrandController extends Controller
{
    public function index(Request $request)
    {
        $authUser = $request->user(); // sudah lewat middleware web+auth
        $search   = (string) $request->input('search', '');
        $perPage  = (int) $request->input('per_page', 10);

        // --- Filter brand dari request (support brand_id & brand_ids[]) ---
        $requestedBrandIds = collect((array) $request->input('brand_ids', []))
            ->when($request->filled('brand_id'), fn ($c) => $c->prepend((int) $request->input('brand_id')))
            ->filter(fn ($v) => $v !== null && $v !== '')
            ->map(fn ($v) => (int) $v)
            ->unique()
            ->values();

        // --- Brand yang dimiliki user (pivot + fallback legacy users.brand_id) ---
        $assignedBrandIds = collect();
        if ($authUser) {
            if (method_exists($authUser, 'brands')) {
                $assignedBrandIds = $authUser->brands()->pluck('brands.id');
            }
            if ($assignedBrandIds->isEmpty() && !empty($authUser->brand_id)) {
                $assignedBrandIds = collect([(int) $authUser->brand_id]);
            }
            $assignedBrandIds = $assignedBrandIds->map(fn ($v) => (int) $v)->unique()->values();
        }

        // --- Tentukan filter efektif ---
        $forceEmpty = false;
        if ($assignedBrandIds->isNotEmpty()) {
            // User dibatasi ke brand miliknya; kalau request ada → intersect
            $effectiveBrandIds = $requestedBrandIds->isNotEmpty()
                ? $requestedBrandIds->intersect($assignedBrandIds)->values()
                : $assignedBrandIds;

            if ($requestedBrandIds->isNotEmpty() && $effectiveBrandIds->isEmpty()) {
                // minta brand di luar hak → kosongkan hasil
                $forceEmpty = true;
            }
        } else {
            // Admin/tanpa assignment → pakai filter request apa adanya
            $effectiveBrandIds = $requestedBrandIds;
        }

        // --- Query utama ---
        $query = \App\Models\Brand::query();

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                ->orWhere('slug', 'like', "%{$search}%")
                ->orWhere('website_url', 'like', "%{$search}%");
            });
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        // Terapkan pembatasan brand
        if ($forceEmpty) {
            $query->whereRaw('1=0');
        } elseif ($effectiveBrandIds->isNotEmpty()) {
            $query->whereIn('id', $effectiveBrandIds->all());
        }
        // Kalau user admin (tanpa assignment) dan tidak ada filter → tidak dibatasi.

        return response()->json($query->latest()->paginate($perPage));
    }


    public function show($id)
    {
        $brand = Brand::findOrFail($id);
        return response()->json($brand);
    }

    public function store(Request $request)
    {
        // Terima array atau JSON string untuk socials
        $payload = $request->all();
        if (isset($payload['socials']) && is_string($payload['socials'])) {
            $decoded = json_decode($payload['socials'], true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $payload['socials'] = $decoded;
            }
        }

        $validator = Validator::make($payload, [
            'name'        => 'required|string|max:150',
            'slug'        => 'nullable|string|max:160|unique:brands,slug',
            'logo_path'   => 'nullable|string|max:2048',
            'website_url' => 'nullable|url|max:2048',
            'is_active'   => 'sometimes|boolean',
            'socials'     => 'nullable|array',
            'notes'       => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validasi gagal',
                'errors'  => $validator->errors(),
            ], 422);
        }

        // slug otomatis jika kosong
        $payload['slug'] = $payload['slug'] ?? $this->makeUniqueSlug($payload['name']);

        $brand = Brand::create($payload);

        return response()->json([
            'message' => 'Brand berhasil ditambahkan',
            'data'    => $brand,
        ]);
    }

    public function update(Request $request, $id)
    {
        $brand = Brand::findOrFail($id);

        $payload = $request->all();
        if (isset($payload['socials']) && is_string($payload['socials'])) {
            $decoded = json_decode($payload['socials'], true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $payload['socials'] = $decoded;
            }
        }

        $validator = Validator::make($payload, [
            'name'        => 'required|string|max:150',
            'slug'        => [
                'nullable',
                'string',
                'max:160',
                Rule::unique('brands', 'slug')->ignore($brand->id),
            ],
            'logo_path'   => 'nullable|string|max:2048',
            'website_url' => 'nullable|url|max:2048',
            'is_active'   => 'sometimes|boolean',
            'socials'     => 'nullable|array',
            'notes'       => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validasi gagal',
                'errors'  => $validator->errors(),
            ], 422);
        }

        // slug otomatis jika tidak dikirim
        if (!isset($payload['slug']) && isset($payload['name'])) {
            $payload['slug'] = $this->makeUniqueSlug($payload['name'], $brand->id);
        }

        $brand->update($payload);

        return response()->json([
            'message' => 'Brand berhasil diperbarui',
            'data'    => $brand,
        ]);
    }

    public function destroy($id)
    {
        $brand = Brand::findOrFail($id);
        $brand->delete(); // soft delete

        return response()->json(['message' => 'Brand berhasil dihapus']);
    }

    private function makeUniqueSlug(string $name, ?int $ignoreId = null): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $i = 1;

        while (
            Brand::where('slug', $slug)
                ->when($ignoreId, fn($q) => $q->where('id', '!=', $ignoreId))
                ->exists()
        ) {
            $slug = $base . '-' . $i++;
        }

        return $slug;
    }
}
