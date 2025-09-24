<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Salin data lama users.brand_id (jika ada) ke brand_user
        // Abaikan user yang brand_id null
        $rows = DB::table('users')
            ->select('id as user_id', 'brand_id')
            ->whereNotNull('brand_id')
            ->get();

        foreach ($rows as $r) {
            // Insert ignore untuk aman kalau sudah pernah ada
            $exists = DB::table('brand_user')
                ->where('user_id', $r->user_id)
                ->where('brand_id', $r->brand_id)
                ->exists();

            if (!$exists) {
                DB::table('brand_user')->insert([
                    'user_id'     => $r->user_id,
                    'brand_id'    => $r->brand_id,
                    'assigned_at' => now(),
                    'created_at'  => now(),
                    'updated_at'  => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        // Rollback backfill tidak menghapus data pivot agar tidak hilang mapping
        // (Opsional: bisa hapus baris yang asalnya dari kolom lama, tapi biasanya tidak perlu)
    }
};
