<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ClientController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search');
        $query = Client::query();

        if ($search) {
            $query->where('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")
                ->orWhere('phone', 'like', "%{$search}%");
        }

        return response()->json($query->latest()->paginate(10));
    }


    public function show($id)
    {
        $client = Client::findOrFail($id);
        return response()->json($client);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name'         => 'required|string|max:255',
            'email'        => 'nullable|email|max:255',
            'phone'        => 'nullable|string|max:20',
            'address'      => 'nullable|string',
            'pic_name'     => 'nullable|string|max:255',
            'pic_email'    => 'nullable|email|max:255',
            'pic_phone'    => 'nullable|string|max:20',
            'pic_position' => 'nullable|string|max:255',
            'notes'        => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validasi gagal',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $client = Client::create($request->all());

        return response()->json([
            'message' => 'Klien berhasil ditambahkan',
            'data'    => $client,
        ]);
    }

    public function update(Request $request, $id)
    {
        $client = Client::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name'         => 'required|string|max:255',
            'email'        => 'nullable|email|max:255',
            'phone'        => 'nullable|string|max:20',
            'address'      => 'nullable|string',
            'pic_name'     => 'nullable|string|max:255',
            'pic_email'    => 'nullable|email|max:255',
            'pic_phone'    => 'nullable|string|max:20',
            'pic_position' => 'nullable|string|max:255',
            'notes'        => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validasi gagal',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $client->update($request->all());

        return response()->json([
            'message' => 'Klien berhasil diperbarui',
            'data'    => $client,
        ]);
    }

    public function destroy($id)
    {
        $client = Client::findOrFail($id);
        $client->delete();

        return response()->json(['message' => 'Klien berhasil dihapus']);
    }
}
