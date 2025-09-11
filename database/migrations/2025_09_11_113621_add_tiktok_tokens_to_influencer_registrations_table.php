<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('influencer_registrations', function (Blueprint $table) {
            // OAuth token fields
            if (!Schema::hasColumn('influencer_registrations', 'token_type')) {
                $table->string('token_type', 40)->default('Bearer')->after('tiktok_username');
            }
            if (!Schema::hasColumn('influencer_registrations', 'access_token')) {
                $table->text('access_token')->nullable()->after('token_type');
            }
            if (!Schema::hasColumn('influencer_registrations', 'refresh_token')) {
                $table->text('refresh_token')->nullable()->after('access_token');
            }
            if (!Schema::hasColumn('influencer_registrations', 'expires_at')) {
                $table->timestamp('expires_at')->nullable()->after('refresh_token');
            }
            if (!Schema::hasColumn('influencer_registrations', 'last_refreshed_at')) {
                $table->timestamp('last_refreshed_at')->nullable()->after('expires_at');
            }
            if (!Schema::hasColumn('influencer_registrations', 'revoked_at')) {
                $table->timestamp('revoked_at')->nullable()->after('last_refreshed_at');
            }
            if (!Schema::hasColumn('influencer_registrations', 'scopes')) {
                $table->json('scopes')->nullable()->after('revoked_at');
            }

            // Index tambahan (opsional tapi berguna)
            if (!Schema::hasColumn('influencer_registrations', 'tiktok_user_id')) {
                // kalau belum ada kolomnya, tambahkan dulu string(100) -> lalu index
                $table->string('tiktok_user_id', 100)->nullable()->after('campaign_id');
            }
            $table->index('tiktok_user_id', 'ir_tiktok_user_id_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('influencer_registrations', function (Blueprint $table) {
            // Hapus kolom2 baru (abaikan error jika environment tak mendukung drop multiple)
            foreach ([
                'token_type','access_token','refresh_token','expires_at',
                'last_refreshed_at','revoked_at','scopes',
            ] as $col) {
                if (Schema::hasColumn('influencer_registrations', $col)) {
                    $table->dropColumn($col);
                }
            }
            // index
            try { $table->dropIndex('ir_tiktok_user_id_idx'); } catch (\Throwable $e) {}
        });
    }
};
