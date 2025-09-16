<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            // umur pakai smallint unsigned (0–65535) sudah cukup
            $table->unsignedSmallInteger('min_age')->nullable()->after('currency');
            $table->unsignedSmallInteger('max_age')->nullable()->after('min_age');

            // total konten wajib
            $table->unsignedInteger('content_quota')->nullable()->after('max_age');

            // pastikan kolom JSON kpi_targets ada (kalau sebelumnya belum dibuat)
            if (!Schema::hasColumn('campaigns', 'kpi_targets')) {
                $table->json('kpi_targets')->nullable()->after('content_quota');
            }
        });

        // (Opsional) CHECK constraint untuk min_age <= max_age (MySQL 8.0.16+ saja yang benar-benar enforce)
        try {
            DB::statement("
                ALTER TABLE campaigns
                ADD CONSTRAINT campaigns_age_range_chk
                CHECK (
                    min_age IS NULL
                    OR max_age IS NULL
                    OR min_age <= max_age
                )
            ");
        } catch (\Throwable $e) {
            // Abaikan kalau DB tidak mendukung CHECK atau constraint sudah ada
        }
    }

    public function down(): void
    {
        // Drop CHECK kalau ada
        try {
            DB::statement("ALTER TABLE campaigns DROP CONSTRAINT campaigns_age_range_chk");
        } catch (\Throwable $e) {
            // Abaikan jika tidak ada/DB tidak support
        }

        Schema::table('campaigns', function (Blueprint $table) {
            if (Schema::hasColumn('campaigns', 'content_quota')) {
                $table->dropColumn('content_quota');
            }
            if (Schema::hasColumn('campaigns', 'max_age')) {
                $table->dropColumn('max_age');
            }
            if (Schema::hasColumn('campaigns', 'min_age')) {
                $table->dropColumn('min_age');
            }
            // kpi_targets jangan di-drop saat rollback karena bisa sudah dipakai fitur lain.
            // Kalau mau drop juga, uncomment:
            // if (Schema::hasColumn('campaigns', 'kpi_targets')) {
            //     $table->dropColumn('kpi_targets');
            // }
        });
    }
};
