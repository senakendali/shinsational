<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;
use Illuminate\Routing\Attributes\Middleware; // <-- penting

#[Middleware('permission:role.viewAny', only: ['index','show'])]
#[Middleware('permission:role.create',  only: ['store'])]
#[Middleware('permission:role.update',  only: ['update','syncPermissions'])]
#[Middleware('permission:role.delete',  only: ['destroy'])]
class RoleController extends Controller
{
    /**
     * GET /api/roles
     * Query:
     *  - q: keyword (search by name)
     *  - guard: filter by guard_name (opsional)
     *  - per_page: int (0 = all)
     *  - include=permissions,users (opsional)
     */
    public function index(Request $request)
    {
        $q       = trim((string) $request->input('q', ''));
        $guard   = (string) $request->input('guard', ''); // opsional
        $perPage = (int) $request->input('per_page', 15);
        $include = (string) $request->input('include', '');

        $query = Role::query();

        if ($q !== '') {
            $query->where('name', 'like', "%{$q}%");
        }

        if ($guard !== '') {
            $query->where('guard_name', $guard);
        }

        // kirim counts agar FE bisa baca permissions_count & users_count
        $query->withCount(['permissions', 'users']);

        if (str_contains($include, 'permissions')) {
            $query->with(['permissions:id,name,guard_name']);
        }
        if (str_contains($include, 'users')) {
            $query->with(['users:id,name']); // opsional kalau mau kirim data users
        }

        $query->orderBy('name');

        if ($perPage === 0) {
            return response()->json($query->get());
        }
        return response()->json($query->paginate($perPage));
    }

    /**
     * POST /api/roles
     * Body:
     *  - name (required, unique per guard)
     *  - guard_name (optional, default 'web')
     *  - permissions (optional: array of IDs atau NAMA)
     */
    public function store(Request $request)
    {
        $guard = $request->input('guard_name', 'web');

        $validated = $request->validate([
            'name'        => ['required','string','max:150', Rule::unique('roles', 'name')->where(fn($q) => $q->where('guard_name', $guard))],
            'guard_name'  => ['nullable','string','max:50'],
            'permissions' => ['nullable','array'],
        ]);

        $role = Role::create([
            'name'       => $validated['name'],
            'guard_name' => $guard,
        ]);

        // gunakan has() supaya sync([]) tetap dieksekusi
        if ($request->has('permissions')) {
            $items = (array) $request->input('permissions', []);
            $perms = $this->resolvePermissions($items, $guard);
            $role->syncPermissions($perms);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return response()->json([
            'message' => 'Role berhasil dibuat.',
            'data'    => $role->load('permissions:id,name,guard_name'),
        ], 201);
    }

    /**
     * GET /api/roles/{role}
     * Query: include=permissions (opsional)
     */
    public function show(Request $request, Role $role)
    {
        $include = (string) $request->input('include', '');
        if (str_contains($include, 'permissions')) {
            $role->load('permissions:id,name,guard_name');
        }
        return response()->json($role);
    }

    /**
     * PATCH /api/roles/{role}
     * Body:
     *  - name (unique per guard, ignore current)
     *  - guard_name (opsional; hati-hati bila diubah)
     *  - permissions (opsional: array → langsung sync)
     */
    public function update(Request $request, Role $role)
    {
        $guard = $request->input('guard_name', $role->guard_name);

        $validated = $request->validate([
            'name'        => ['sometimes','required','string','max:150',
                Rule::unique('roles', 'name')
                    ->where(fn($q) => $q->where('guard_name', $guard))
                    ->ignore($role->id)
            ],
            'guard_name'  => ['nullable','string','max:50'],
            'permissions' => ['nullable','array'],
        ]);

        if (array_key_exists('name', $validated)) {
            $role->name = $validated['name'];
        }
        if (array_key_exists('guard_name', $validated) && $validated['guard_name']) {
            $role->guard_name = $validated['guard_name'];
        }
        $role->save();

        // gunakan has() agar sync kosong tetap jalan
        if ($request->has('permissions')) {
            $items = (array) $request->input('permissions', []);
            $perms = $this->resolvePermissions($items, $role->guard_name); // pakai guard terkini
            $role->syncPermissions($perms);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return response()->json([
            'message' => 'Role berhasil diperbarui.',
            'data'    => $role->load('permissions:id,name,guard_name'),
        ]);
    }

    /**
     * DELETE /api/roles/{role}
     */
    public function destroy(Role $role)
    {
        if (strtolower($role->name) === 'super admin') {
            return response()->json(['message' => 'Role ini tidak boleh dihapus.'], 422);
        }

        $role->delete();
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return response()->json(['message' => 'Role berhasil dihapus.']);
    }

    /**
     * POST /api/roles/{role}/sync-permissions
     * Body:
     *  - permissions: array (boleh campur ID & name)
     */
    public function syncPermissions(Request $request, Role $role)
    {
        $data = $request->validate([
            'permissions' => ['required','array','min:0'],
        ]);

        $perms = $this->resolvePermissions($data['permissions'], $role->guard_name);

        $role->syncPermissions($perms);
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return response()->json([
            'message' => 'Permissions berhasil di-sync.',
            'data'    => $role->load('permissions:id,name,guard_name'),
        ]);
    }

    /**
     * Helper: terima array campuran (id atau name) lalu kembalikan koleksi Permission
     */
    protected function resolvePermissions(array $items, string $guard)
    {
        $ids = [];
        $names = [];

        foreach ($items as $x) {
            if (is_numeric($x)) {
                $ids[] = (int) $x;
            } elseif (is_string($x) && trim($x) !== '') {
                $names[] = trim($x);
            }
        }

        $query = Permission::query()->where('guard_name', $guard);

        if ($ids && $names) {
            return $query->where(function ($q) use ($ids, $names) {
                $q->whereIn('id', $ids)->orWhereIn('name', $names);
            })->get();
        }
        if ($ids)   return $query->whereIn('id', $ids)->get();
        if ($names) return $query->whereIn('name', $names)->get();

        return collect();
    }
}
