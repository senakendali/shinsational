<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;
use Illuminate\Routing\Attributes\Middleware; // <-- penting

#[Middleware('permission:permission.viewAny', only: ['index','show'])]
#[Middleware('permission:permission.create',  only: ['store'])]
#[Middleware('permission:permission.update',  only: ['update'])]
#[Middleware('permission:permission.delete',  only: ['destroy'])]
class PermissionController extends Controller
{
    /**
     * GET /api/permissions
     * q, per_page(0=all), include=roles, guard (default web)
     */
    public function index(Request $request)
    {
        $q       = trim((string) $request->input('q', ''));
        $perPage = (int) $request->input('per_page', 15);
        $include = (string) $request->input('include', '');
        $guard   = (string) $request->input('guard', 'web');

        $query = Permission::query()->where('guard_name', $guard);

        if ($q !== '') {
            $query->where('name', 'like', "%{$q}%");
        }

        if (str_contains($include, 'roles')) {
            $query->with('roles:id,name,guard_name');
        }

        $query->orderBy('name');

        if ($perPage === 0) {
            return response()->json($query->get());
        }
        return response()->json($query->paginate($perPage));
    }

    /**
     * POST /api/permissions
     * name (unique per guard), guard_name (default web)
     */
    public function store(Request $request)
    {
        $guard = $request->input('guard_name', 'web');

        $validated = $request->validate([
            'name'       => ['required','string','max:150',
                Rule::unique('permissions', 'name')->where(fn($q) => $q->where('guard_name', $guard))
            ],
            'guard_name' => ['nullable','string','max:50'],
        ]);

        $perm = Permission::create([
            'name'       => $validated['name'],
            'guard_name' => $guard,
        ]);

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return response()->json([
            'message' => 'Permission berhasil dibuat.',
            'data'    => $perm,
        ], 201);
    }

    /**
     * GET /api/permissions/{permission}
     * include=roles
     */
    public function show(Request $request, Permission $permission)
    {
        $include = (string) $request->input('include', '');
        if (str_contains($include, 'roles')) {
            $permission->load('roles:id,name,guard_name');
        }
        return response()->json($permission);
    }

    /**
     * PATCH /api/permissions/{permission}
     */
    public function update(Request $request, Permission $permission)
    {
        $guard = $request->input('guard_name', $permission->guard_name);

        $validated = $request->validate([
            'name'       => ['sometimes','required','string','max:150',
                Rule::unique('permissions', 'name')
                    ->where(fn($q) => $q->where('guard_name', $guard))
                    ->ignore($permission->id)
            ],
            'guard_name' => ['nullable','string','max:50'],
        ]);

        if (array_key_exists('name', $validated)) {
            $permission->name = $validated['name'];
        }
        if (array_key_exists('guard_name', $validated) && $validated['guard_name']) {
            $permission->guard_name = $validated['guard_name'];
        }

        $permission->save();
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return response()->json([
            'message' => 'Permission berhasil diperbarui.',
            'data'    => $permission,
        ]);
    }

    /**
     * DELETE /api/permissions/{permission}
     */
    public function destroy(Permission $permission)
    {
        $permission->delete();
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return response()->json(['message' => 'Permission berhasil dihapus.']);
    }
}
