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
            // URL foto profil TikTok
            $table->string('profile_pic_url', 2048)->nullable()->after('tiktok_username');

            // Relasi ke campaigns
            $table->foreignId('campaign_id')
                ->nullable()
                ->after('id')
                ->constrained('campaigns')
                ->cascadeOnUpdate()
                ->nullOnDelete();

            // (Opsional tapi direkomendasikan) — cegah duplicate per campaign
            // Hapus unique lama di tiktok_username (kalau ada), karena bikin influencer
            // gak bisa daftar di campaign lain.
            $table->dropUnique('influencer_registrations_tiktok_username_unique');

            // Unik per campaign (pilih salah satu; saran: pakai open_id yang stabil)
            $table->unique(['tiktok_user_id', 'campaign_id'], 'uniq_tiktok_user_campaign');
            // Atau kalau mau pakai username:
            // $table->unique(['tiktok_username', 'campaign_id'], 'uniq_tiktok_username_campaign');

            // Tambahan index kalau mau query cepat
            $table->index('campaign_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('influencer_registrations', function (Blueprint $table) {
            $table->dropIndex(['campaign_id']);
            $table->dropUnique('uniq_tiktok_user_campaign');
            // Kalau down, pasang balik unique lama (sesuaikan kebutuhan)
            $table->unique('tiktok_username');

            $table->dropConstrainedForeignId('campaign_id');
            $table->dropColumn('profile_pic_url');
        });
    }
};
