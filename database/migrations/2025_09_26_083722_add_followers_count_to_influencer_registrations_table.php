<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('influencer_registrations', function (Blueprint $table) {
            // Pakai BIGINT unsigned untuk aman (jutaan-puluhan juta followers)
            $table->unsignedBigInteger('followers_count')
                  ->nullable()
                  ->after('address'); // sesuaikan posisi kolom
        });

        // Optional: backfill dari influencer_accounts (jika ada dan DB mendukung JOIN)
        try {
            DB::statement("
                UPDATE influencer_registrations ir
                JOIN influencer_accounts ia
                  ON ia.tiktok_user_id = ir.tiktok_user_id
                SET ir.followers_count = ia.followers_count
                WHERE ir.followers_count IS NULL
                  AND ia.followers_count IS NOT NULL
            ");
        } catch (\Throwable $e) {
            // Silent fail kalau DB/engine tidak mendukung JOIN update (mis. SQLite di local)
            // Bisa lakukan backfill via job/command terpisah kalau perlu.
        }
    }

    public function down(): void
    {
        Schema::table('influencer_registrations', function (Blueprint $table) {
            $table->dropColumn('followers_count');
        });
    }
};
