<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;
use Illuminate\Routing\Attributes\Middleware; // <-- penting untuk attribute middleware


#[Middleware('permission:user.viewAny', only: ['index','show'])]
#[Middleware('permission:user.create', only: ['store'])]
#[Middleware('permission:user.update', only: ['update','syncRoles','syncPermissions'])]
#[Middleware('permission:user.delete', only: ['destroy'])]
class UserController extends Controller
{
    /**
     * GET /api/users
     * Query:
     *  - q: keyword (name/email)
     *  - role: filter by role name
     *  - permission: filter by permission name
     *  - guard: guard name (default: web)
     *  - per_page: int (0 = all)
     *  - include: "roles,permissions"
     */
    public function index(Request $request)
    {
        $q        = trim((string) $request->input('q', ''));
        $perPage  = (int) $request->input('per_page', 15);
        $include  = (string) $request->input('include', '');
        $role     = (string) $request->input('role', '');
        $perm     = (string) $request->input('permission', '');
        $guard    = (string) $request->input('guard', 'web');

        $query = User::query();

        if ($q !== '') {
            $query->where(function ($x) use ($q) {
                $x->where('name', 'like', "%{$q}%")
                  ->orWhere('email', 'like', "%{$q}%");
            });
        }

        if ($role !== '') {
            $query->role($role, $guard);
        }
        if ($perm !== '') {
            $query->permission($perm, $guard);
        }

        // hitung direct permissions (kalau masih ada legacy direct perms)
        $query->withCount(['permissions']);

        // include roles (plus count permissions di tiap role)
        if (str_contains($include, 'roles')) {
            $query->with(['roles' => function ($r) {
                $r->select('id','name','guard_name')->withCount('permissions');
                // atau kalau mau lengkap:
                // $r->with('permissions:id,name,guard_name');
            }]);
        }

        if (str_contains($include, 'permissions')) {
            $query->with(['permissions:id,name,guard_name']);
        }

        $query->orderBy('name');

        if ($perPage === 0) {
            return response()->json($query->get());
        }
        return response()->json($query->paginate($perPage));
    }

    /**
     * POST /api/users
     * Body:
     *  - name, email(unique), password(confirmed)
     *  - role   (single, nama role)  ← rekomendasi
     *  - roles  (array, legacy/fallback)
     *  - permissions[] (opsional; UI kamu read-only → boleh kosong)
     */
    public function store(Request $request)
    {
        // helper: cek role keluarga brand
        $isBrandish = function (?string $name): bool {
            return in_array(strtolower((string) $name), [
                'brand', 'brand admin', 'brand super admin', 'brand owner',
            ], true);
        };

        // === Validasi dasar ===
        $validated = $request->validate([
            'name'         => ['required', 'string', 'max:150'],
            'email'        => ['required', 'email', 'max:255', 'unique:users,email'],
            'password'     => ['required', 'string', 'min:8', 'confirmed'],
            'role'         => ['nullable', 'string', 'max:150'], // single role (nama)
            'roles'        => ['nullable', 'array'],             // alternatif: array nama role
            'permissions'  => ['nullable', 'array'],

            // Legacy (fallback lama, opsional)
            'brand_id'     => ['nullable', 'integer', 'exists:brands,id'],

            // NEW: multi-brand
            'brand_ids'    => ['nullable', 'array'],
            'brand_ids.*'  => ['integer', 'distinct', 'exists:brands,id'],
        ]);

        $guard = 'web';

        // === Resolve target role (single) ===
        $rolesInput = $request->has('role')
            ? [ (string) $request->input('role') ]
            : (array) $request->input('roles', []);

        $resolvedRoles  = $this->resolveRoles($rolesInput, $guard)->take(1);
        $targetRoleName = optional($resolvedRoles->first())->name;

        // === Kumpulkan brand IDs (array) + legacy fallback ===
        $brandIds = collect((array) $request->input('brand_ids', []))
            ->filter(fn($v) => $v !== null && $v !== '')
            ->map(fn($v) => (int) $v)
            ->unique()
            ->values();

        $legacyBrandId = $request->filled('brand_id') ? (int) $request->input('brand_id') : null;
        if ($legacyBrandId && !$brandIds->contains($legacyBrandId)) {
            $brandIds->prepend($legacyBrandId); // jadikan elemen pertama sebagai fallback juga
        }

        // === Validasi khusus: role brandish -> butuh minimal 1 brand ===
        if ($targetRoleName && $isBrandish($targetRoleName) && $brandIds->isEmpty()) {
            return response()->json([
                'message' => 'Validasi gagal.',
                'errors'  => [
                    'brand_ids' => ['Minimal pilih 1 brand untuk role Brand/Brand Admin/Brand Super Admin/Brand Owner.'],
                ],
            ], 422);
        }

        // === Buat user + assign role/permission + pivot brand ===
        $user = \DB::transaction(function () use ($validated, $resolvedRoles, $request, $brandIds, $isBrandish, $targetRoleName) {
            $user = new User();
            $user->name     = $validated['name'];
            $user->email    = $validated['email'];
            $user->password = Hash::make($validated['password']);

            // Legacy: simpan brand_id = elemen pertama, hanya jika role brandish dan ada brand
            $user->brand_id = ($targetRoleName && $isBrandish($targetRoleName) && $brandIds->isNotEmpty())
                ? (int) $brandIds->first()
                : null;

            $user->save();

            // Assign single role (jika dikirim)
            if ($resolvedRoles->isNotEmpty()) {
                $user->syncRoles($resolvedRoles);
            }

            // Opsional: direct permissions (UI read-only tapi tetap aman kalau dikirim)
            if ($request->has('permissions')) {
                $items = (array) $request->input('permissions', []);
                $user->syncPermissions($this->resolvePermissions($items, $guard = 'web'));
            }

            // Sync pivot brand_user
            // Catatan: jika role bukan brandish tapi client kirim brand_ids, kita tetap simpan (tidak merugikan),
            // tapi tidak diwajibkan.
            if ($brandIds->isNotEmpty()) {
                $user->brands()->sync($brandIds->all());

                // pastikan legacy kolom ikut sinkron (jika ada minimal satu brand)
                if ($user->brand_id === null) {
                    $user->brand_id = (int) $brandIds->first();
                    $user->save();
                }
            } else {
                // kosongkan pivot jika tidak ada brand yang dipilih
                $user->brands()->sync([]);
                if ($user->brand_id !== null) {
                    $user->brand_id = null;
                    $user->save();
                }
            }

            return $user;
        });

        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        return response()->json([
            'message' => 'User berhasil dibuat.',
            'data'    => $user->load(
                'roles:id,name,guard_name',
                'permissions:id,name,guard_name',
                'brand:id,name',   // legacy single
                'brands:id,name'   // many-to-many baru
            ),
        ], 201);
    }



    /**
     * GET /api/users/{user}
     * Query: include=roles,permissions
     */
    public function show(Request $request, User $user)
    {
        // Support ?include=roles,permissions,brand,brands,brand_ids (CSV)
        // - roles          → eager load roles (id, name, guard_name)
        // - permissions    → eager load permissions (id, name, guard_name)
        // - brand          → legacy single brand (id, name)
        // - brands         → many-to-many brands (id, name)
        // - brand_ids      → append array of brand IDs on the response (from pivot)
        // Also accept "all" / "*" to include everything above (kecuali brand_ids yang tetap explicit)

        $includeRaw = (string) $request->input('include', '');
        $inc = collect(explode(',', $includeRaw))
            ->map(fn($s) => strtolower(trim($s)))
            ->filter(fn($s) => $s !== '')
            ->unique()
            ->values();

        $includeAll = $inc->contains('all') || $inc->contains('*');

        $relations = [];

        if ($includeAll || $inc->contains('roles')) {
            $relations['roles'] = function ($q) {
                $q->select('id', 'name', 'guard_name');
            };
        }

        if ($includeAll || $inc->contains('permissions')) {
            $relations['permissions'] = function ($q) {
                $q->select('id', 'name', 'guard_name');
            };
        }

        if ($includeAll || $inc->contains('brand')) {
            $relations['brand'] = function ($q) {
                $q->select('id', 'name');
            };
        }

        if ($includeAll || $inc->contains('brands')) {
            $relations['brands'] = function ($q) {
                // pastikan kolom dari tabel brands yang diperlukan saja
                $q->select('brands.id', 'brands.name');
            };
        }

        if (!empty($relations)) {
            $user->load($relations);
        }

        // Append brand_ids jika diminta
        if ($inc->contains('brand_ids')) {
            // pakai relasi jika sudah diload, kalau belum pluck dari relation
            $brandIds = $user->relationLoaded('brands')
                ? $user->brands->pluck('id')->map(fn($v) => (int) $v)->values()
                : $user->brands()->pluck('brands.id')->map(fn($v) => (int) $v)->values();

            $user->setAttribute('brand_ids', $brandIds);
        }

        return response()->json($user);
    }


    /**
     * PATCH /api/users/{user}
     * Body:
     *  - name, email(unique:ignore), password(optional, confirmed)
     *  - role   (single, nama role)  ← rekomendasi
     *  - roles  (array, legacy/fallback; hanya 1 yang dipakai)
     *  - permissions[] (opsional)
     */
    public function update(Request $request, User $user)
    {
        // helper role keluarga brand
        $isBrandish = function (?string $name): bool {
            return in_array(strtolower((string) $name), [
                'brand', 'brand admin', 'brand super admin', 'brand owner',
            ], true);
        };

        // === Validasi dasar ===
        $validated = $request->validate([
            'name'         => ['sometimes','required','string','max:150'],
            'email'        => ['sometimes','required','email','max:255', Rule::unique('users','email')->ignore($user->id)],
            'password'     => ['nullable','string','min:8','confirmed'],
            'role'         => ['nullable','string','max:150'], // single role (nama)
            'roles'        => ['nullable','array'],            // alternatif: array nama role
            'permissions'  => ['nullable','array'],

            // Legacy (fallback lama, opsional)
            'brand_id'     => ['nullable','integer','exists:brands,id'],

            // NEW: multi-brand
            'brand_ids'    => ['nullable','array'],
            'brand_ids.*'  => ['integer','distinct','exists:brands,id'],
        ]);

        $guard = 'web';

        // === Resolve target role setelah update ===
        // - jika request mengirim role/roles → gunakan itu
        // - jika tidak, gunakan role user saat ini
        $rolesInput = $request->has('role')
            ? [ (string) $request->input('role') ]
            : (array) $request->input('roles', []);

        $resolvedRoles  = $this->resolveRoles($rolesInput, $guard)->take(1);
        $targetRoleName = $resolvedRoles->isNotEmpty()
            ? $resolvedRoles->first()->name
            : optional($user->roles()->first())->name;

        // === Kumpulkan brand IDs dari request (jika ada) + legacy fallback ===
        $brandIdsFromRequest = collect((array) $request->input('brand_ids', []))
            ->filter(fn($v) => $v !== null && $v !== '')
            ->map(fn($v) => (int) $v)
            ->unique()
            ->values();

        $legacyBrandId = $request->filled('brand_id') ? (int) $request->input('brand_id') : null;
        if ($legacyBrandId && !$brandIdsFromRequest->contains($legacyBrandId)) {
            $brandIdsFromRequest->prepend($legacyBrandId);
        }

        $explicitBrandsProvided = $request->has('brand_ids') || $request->has('brand_id');

        // === Effective brand IDs (kalau tidak dikirim, pakai existing) ===
        $effectiveBrandIds = $brandIdsFromRequest->isNotEmpty()
            ? $brandIdsFromRequest->values()
            : collect($user->brands()->pluck('brands.id')->all())->map(fn($v) => (int) $v)->values();

        // === Validasi khusus: jika role brandish → harus ada minimal 1 brand
        if ($targetRoleName && $isBrandish($targetRoleName) && $effectiveBrandIds->isEmpty()) {
            return response()->json([
                'message' => 'Validasi gagal.',
                'errors'  => [
                    'brand_ids' => ['Minimal pilih 1 brand untuk role Brand/Brand Admin/Brand Super Admin/Brand Owner.'],
                ],
            ], 422);
        }

        // === Update user (transaction) ===
        $user = \DB::transaction(function () use (
            $validated, $request, $user, $resolvedRoles, $guard,
            $isBrandish, $targetRoleName, $explicitBrandsProvided, $brandIdsFromRequest, $effectiveBrandIds
        ) {
            // Basic fields
            if (array_key_exists('name', $validated))  $user->name  = $validated['name'];
            if (array_key_exists('email', $validated)) $user->email = $validated['email'];
            if (!empty($validated['password'])) {
                $user->password = Hash::make($validated['password']);
            }

            // Legacy brand_id behavior:
            if ($targetRoleName && $isBrandish($targetRoleName)) {
                // Jika brand dikirim → set brand_id = first of request
                if ($explicitBrandsProvided && $brandIdsFromRequest->isNotEmpty()) {
                    $user->brand_id = (int) $brandIdsFromRequest->first();
                } elseif ($effectiveBrandIds->isNotEmpty()) {
                    // Tidak dikirim, pakai existing pivot (jika ada)
                    $user->brand_id = (int) $effectiveBrandIds->first();
                } else {
                    // Safety: tidak mungkin sampai sini karena sudah divalidasi
                    $user->brand_id = null;
                }
            } else {
                // Bukan role brandish → kosongkan legacy
                $user->brand_id = null;
            }

            $user->save();

            // Sync role kalau dikirim
            if ($resolvedRoles->isNotEmpty()) {
                $user->syncRoles($resolvedRoles);
            }

            // Sync direct permissions kalau dikirim
            if ($request->has('permissions')) {
                $items = (array) $request->input('permissions', []);
                $user->syncPermissions($this->resolvePermissions($items, $guard));
            }

            // === Sync pivot brand_user ===
            if ($explicitBrandsProvided) {
                // Jika client mengirim brand_ids/brand_id, jadikan sumber kebenaran
                if ($brandIdsFromRequest->isNotEmpty()) {
                    $user->brands()->sync($brandIdsFromRequest->all());
                } else {
                    // dikirim kosong → kosongkan pivot
                    $user->brands()->sync([]);
                }
            } else {
                // tidak ada input brand → biarkan pivot existing apa adanya
                // (opsional: enforce clear jika bukan brandish)
                if (!$targetRoleName || !$isBrandish($targetRoleName)) {
                    $user->brands()->sync([]); // jaga konsistensi kalau mau strict
                }
            }

            // Pastikan legacy ikut sinkron kalau ada set minimal satu brand
            $hasAnyBrand = $user->brands()->exists();
            if ($hasAnyBrand && $user->brand_id === null) {
                $user->brand_id = (int) $user->brands()->pluck('brands.id')->first();
                $user->save();
            }
            if (!$hasAnyBrand && $user->brand_id !== null) {
                $user->brand_id = null;
                $user->save();
            }

            return $user;
        });

        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        return response()->json([
            'message' => 'User berhasil diperbarui.',
            'data'    => $user->load(
                'roles:id,name,guard_name',
                'permissions:id,name,guard_name',
                'brand:id,name',   // legacy single
                'brands:id,name'   // many-to-many baru
            ),
        ]);
    }



    /**
     * DELETE /api/users/{user}
     */
    public function destroy(Request $request, User $user)
    {
        if ((int) $request->user()->id === (int) $user->id) {
            return response()->json(['message' => 'Tidak bisa menghapus akun sendiri.'], 422);
        }

        $user->delete();
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return response()->json(['message' => 'User berhasil dihapus.']);
    }

    // ===== Optional: endpoints khusus sync =====

    public function syncRoles(Request $request, User $user)
    {
        $data = $request->validate(['roles' => ['required','array']]);
        $user->syncRoles($this->resolveRoles($data['roles'], 'web'));
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return response()->json([
            'message' => 'Roles berhasil di-sync.',
            'data'    => $user->load('roles:id,name,guard_name'),
        ]);
    }

    public function syncPermissions(Request $request, User $user)
    {
        $data = $request->validate(['permissions' => ['required','array']]);
        $user->syncPermissions($this->resolvePermissions($data['permissions'], 'web'));
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return response()->json([
            'message' => 'Permissions berhasil di-sync.',
            'data'    => $user->load('permissions:id,name,guard_name'),
        ]);
    }

    // ===== Helpers =====

    protected function resolveRoles(array $items, string $guard = 'web')
    {
        $ids = []; $names = [];
        foreach ($items as $x) {
            if (is_numeric($x)) $ids[] = (int) $x;
            elseif (is_string($x) && trim($x) !== '') $names[] = trim($x);
        }
        $q = Role::query()->where('guard_name', $guard);
        if ($ids && $names) return $q->where(function($qq) use ($ids,$names){
            $qq->whereIn('id',$ids)->orWhereIn('name',$names);
        })->get();
        if ($ids)   return $q->whereIn('id',$ids)->get();
        if ($names) return $q->whereIn('name',$names)->get();
        return collect();
    }

    protected function resolvePermissions(array $items, string $guard = 'web')
    {
        $ids = []; $names = [];
        foreach ($items as $x) {
            if (is_numeric($x)) $ids[] = (int) $x;
            elseif (is_string($x) && trim($x) !== '') $names[] = trim($x);
        }
        $q = Permission::query()->where('guard_name', $guard);
        if ($ids && $names) return $q->where(function($qq) use ($ids,$names){
            $qq->whereIn('id',$ids)->orWhereIn('name',$names);
        })->get();
        if ($ids)   return $q->whereIn('id',$ids)->get();
        if ($names) return $q->whereIn('name',$names)->get();
        return collect();
    }
}
