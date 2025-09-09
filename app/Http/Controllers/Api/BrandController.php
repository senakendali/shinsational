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
        $search = $request->input('search');

        $query = Brand::query();

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('slug', 'like', "%{$search}%")
                  ->orWhere('website_url', 'like', "%{$search}%");
            });
        }

        // Optional: filter status
        if ($request->filled('is_active')) {
            $query->where('is_active', filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        return response()->json($query->latest()->paginate(10));
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
