<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    // php artisan make:migration add_shipment_status_to_influencer_submissions_table
    public function up(): void
    {
        Schema::table('influencer_submissions', function (Blueprint $table) {
            // pakai enum kalau MySQL/Postgres mendukung; tetap nullable (tidak mandatory)
            if (Schema::getColumnType('influencer_submissions', 'id')) {
                // kolom setelah tracking number (kalau mau diurutkan)
                try {
                    $table->string('shipment_status', 32)->nullable()->after('shipping_tracking_number');

                } catch (\Throwable $e) {
                    // fallback jika enum tidak didukung di sebagian driver: string + check constraint opsional
                    if (!Schema::hasColumn('influencer_submissions', 'shipment_status')) {
                        $table->string('shipment_status', 32)->nullable()->after('shipping_tracking_number');
                    }
                }
            }
        });

        // OPTIONAL (MySQL 8+/Postgres): tambahkan CHECK constraint jika tadi fallback ke string
        // Ini aman dilewati jika kolomnya bertipe enum (akan gagal-silent di try/catch berikut).
        try {
            DB::statement("ALTER TABLE influencer_submissions
                ADD CONSTRAINT chk_influencer_submissions_shipment_status
                CHECK (shipment_status IN ('on_the_way','received') OR shipment_status IS NULL)");
        } catch (\Throwable $e) {
            // abaikan jika DB tidak mendukung CHECK atau constraint sudah ada
        }
    }

    public function down(): void
    {
        // Hapus constraint jika pernah dibuat (abaikan error jika tidak ada)
        try {
            DB::statement("ALTER TABLE influencer_submissions
                DROP CONSTRAINT chk_influencer_submissions_shipment_status");
        } catch (\Throwable $e) {
            try {
                // MySQL nama constraint bisa auto-generate; jika gagal, lanjut saja
                DB::statement("ALTER TABLE influencer_submissions
                    DROP CHECK chk_influencer_submissions_shipment_status");
            } catch (\Throwable $e2) {}
        }

        Schema::table('influencer_submissions', function (Blueprint $table) {
            if (Schema::hasColumn('influencer_submissions', 'shipment_status')) {
                $table->dropColumn('shipment_status');
            }
        });
    }
};
