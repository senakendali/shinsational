<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProjectTerm;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ProjectTermController extends Controller
{
    // List termin per project (paginated)
    public function index(Request $request)
    {
        $projectId = $request->input('project_id');
        $perPage = $request->input('per_page', 10);

        $query = ProjectTerm::with('project'); // ← ini penting

        if ($projectId) {
            $query->where('project_id', $projectId);
        }

        $terms = $query->orderBy('due_date')->paginate($perPage);

        return response()->json($terms);
    }



    public function show($id)
    {
        $term = ProjectTerm::with(['project.client'])->findOrFail($id);
        return response()->json($term);
    }


    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'project_id'  => 'required|exists:projects,id',
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
            'amount'      => 'required|numeric|min:0',
            'due_date'    => 'nullable|date',
            'status'      => 'in:belum_dibayar,dibayar',
            'paid_at'     => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validasi gagal',
                'errors'  => $validator->errors()
            ], 422);
        }

        $term = ProjectTerm::create($request->all());

        return response()->json([
            'message' => 'Termin berhasil ditambahkan',
            'data'    => $term
        ]);
    }

    public function update(Request $request, $id)
    {
        $term = ProjectTerm::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
            'amount'      => 'required|numeric|min:0',
            'due_date'    => 'nullable|date',
            'status'      => 'in:belum_dibayar,dibayar',
            'paid_at'     => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validasi gagal',
                'errors'  => $validator->errors()
            ], 422);
        }

        $term->update($request->all());

        return response()->json([
            'message' => 'Termin berhasil diperbarui',
            'data'    => $term
        ]);
    }

    public function destroy($id)
    {
        $term = ProjectTerm::findOrFail($id);
        $term->delete();

        return response()->json(['message' => 'Termin berhasil dihapus']);
    }
}
