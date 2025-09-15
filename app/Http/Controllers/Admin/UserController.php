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
        $validated = $request->validate([
            'name'        => ['required','string','max:150'],
            'email'       => ['required','email','max:255','unique:users,email'],
            'password'    => ['required','string','min:8','confirmed'],
            'role'        => ['nullable','string','max:150'],
            'roles'       => ['nullable','array'],
            'permissions' => ['nullable','array'],
            'brand_id'    => ['nullable','integer','exists:brands,id'], // NEW
        ]);

        $guard = 'web';

        // Tentukan target role (single)
        $rolesInput = $request->has('role')
            ? [ (string) $request->input('role') ]
            : (array) $request->input('roles', []);

        $resolvedRoles  = $this->resolveRoles($rolesInput, $guard)->take(1);
        $targetRoleName = optional($resolvedRoles->first())->name;

        // Validasi: jika role = Brand maka brand_id wajib
        $isBrandRole = $targetRoleName ? (strcasecmp($targetRoleName, 'brand') === 0) : false;
        if ($isBrandRole && !$request->filled('brand_id')) {
            return response()->json([
                'message' => 'Validasi gagal.',
                'errors'  => ['brand_id' => ['Brand wajib dipilih untuk role Brand.']],
            ], 422);
        }

        // Create user
        $user = new User();
        $user->name      = $validated['name'];
        $user->email     = $validated['email'];
        $user->password  = Hash::make($validated['password']);
        $user->brand_id  = $isBrandRole ? (int) $request->input('brand_id') : null; // NEW
        $user->save();

        // Assign single role (jika dikirim)
        if ($resolvedRoles->isNotEmpty()) {
            $user->syncRoles($resolvedRoles);
        }

        // Opsional: direct permissions (UI read-only tapi tetap aman kalau dikirim)
        if ($request->has('permissions')) {
            $items = (array) $request->input('permissions', []);
            $user->syncPermissions($this->resolvePermissions($items, $guard));
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return response()->json([
            'message' => 'User berhasil dibuat.',
            'data'    => $user->load(
                'roles:id,name,guard_name',
                'permissions:id,name,guard_name',
                'brand:id,name' // NEW: kirim brand di response
            ),
        ], 201);
    }


    /**
     * GET /api/users/{user}
     * Query: include=roles,permissions
     */
    public function show(Request $request, User $user)
    {
        $include = (string) $request->input('include', '');
        if (str_contains($include, 'roles')) {
            $user->load('roles:id,name,guard_name');
        }
        if (str_contains($include, 'permissions')) {
            $user->load('permissions:id,name,guard_name');
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
        $validated = $request->validate([
            'name'        => ['sometimes','required','string','max:150'],
            'email'       => ['sometimes','required','email','max:255', Rule::unique('users','email')->ignore($user->id)],
            'password'    => ['nullable','string','min:8','confirmed'],
            'role'        => ['nullable','string','max:150'],
            'roles'       => ['nullable','array'],
            'permissions' => ['nullable','array'],
            'brand_id'    => ['nullable','integer','exists:brands,id'], // NEW
        ]);

        $guard = 'web';

        // Tentukan target role setelah update:
        // - jika request mengirim role/roles → gunakan itu
        // - kalau tidak, gunakan role user saat ini
        $rolesInput = $request->has('role')
            ? [ (string) $request->input('role') ]
            : (array) $request->input('roles', []);

        $resolvedRoles  = $this->resolveRoles($rolesInput, $guard)->take(1);
        $targetRoleName = $resolvedRoles->isNotEmpty()
            ? $resolvedRoles->first()->name
            : optional($user->roles()->first())->name;

        $isBrandRole = $targetRoleName ? (strcasecmp($targetRoleName, 'brand') === 0) : false;

        // Jika role (target) adalah Brand → brand_id wajib (pakai request atau existing)
        if ($isBrandRole) {
            $incomingBrandId = $request->input('brand_id', $user->brand_id);
            if (empty($incomingBrandId)) {
                return response()->json([
                    'message' => 'Validasi gagal.',
                    'errors'  => ['brand_id' => ['Brand wajib dipilih untuk role Brand.']],
                ], 422);
            }
        }

        // Update basic fields
        if (array_key_exists('name', $validated))  $user->name  = $validated['name'];
        if (array_key_exists('email', $validated)) $user->email = $validated['email'];
        if (!empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
        }

        // Set brand_id sesuai role target
        if ($isBrandRole) {
            if ($request->has('brand_id')) {
                $user->brand_id = (int) $request->input('brand_id');
            }
            // kalau tidak dikirim, biarkan brand_id existing (sudah diverifikasi ada di check di atas)
        } else {
            // Jika bukan Brand, kosongkan supaya konsisten
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

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return response()->json([
            'message' => 'User berhasil diperbarui.',
            'data'    => $user->load(
                'roles:id,name,guard_name',
                'permissions:id,name,guard_name',
                'brand:id,name' // NEW: kirim brand di response
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
