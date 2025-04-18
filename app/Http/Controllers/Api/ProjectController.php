<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ProjectController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search');
        $query = Project::with('client'); // include relasi

        if ($search) {
            $query->where('name', 'like', "%{$search}%")
                  ->orWhereHas('client', function ($q) use ($search) {
                      $q->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                  });
        }

        return response()->json($query->latest()->paginate(10));
    }

    public function show($id)
    {
        $project = Project::with('client')->findOrFail($id);
        return response()->json($project);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'client_id'    => 'required|exists:clients,id',
            'name'         => 'required|string|max:255',
            'start_date'   => 'nullable|date',
            'end_date'     => 'nullable|date|after_or_equal:start_date',
            'status'       => 'required|in:pending,berjalan,selesai,batal',
            'description'  => 'nullable|string',
            'notes'        => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validasi gagal',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $project = Project::create($request->all());

        return response()->json([
            'message' => 'Proyek berhasil ditambahkan',
            'data'    => $project->load('client'),
        ]);
    }

    public function update(Request $request, $id)
    {
        $project = Project::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'client_id'    => 'required|exists:clients,id',
            'name'         => 'required|string|max:255',
            'start_date'   => 'nullable|date',
            'end_date'     => 'nullable|date|after_or_equal:start_date',
            'status'       => 'required|in:pending,berjalan,selesai,batal',
            'description'  => 'nullable|string',
            'notes'        => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validasi gagal',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $project->update($request->all());

        return response()->json([
            'message' => 'Proyek berhasil diperbarui',
            'data'    => $project->load('client'),
        ]);
    }

    public function destroy($id)
    {
        $project = Project::findOrFail($id);
        $project->delete();

        return response()->json(['message' => 'Proyek berhasil dihapus']);
    }
}
