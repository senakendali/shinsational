<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('influencer_submissions', function (Blueprint $table) {
            // Metrik per slot (nullable biar bedain "belum diset")
            $table->unsignedBigInteger('views_1')->nullable()->after('post_date_2');
            $table->unsignedBigInteger('likes_1')->nullable()->after('views_1');
            $table->unsignedBigInteger('comments_1')->nullable()->after('likes_1');
            $table->unsignedBigInteger('shares_1')->nullable()->after('comments_1');

            $table->unsignedBigInteger('views_2')->nullable()->after('shares_1');
            $table->unsignedBigInteger('likes_2')->nullable()->after('views_2');
            $table->unsignedBigInteger('comments_2')->nullable()->after('likes_2');
            $table->unsignedBigInteger('shares_2')->nullable()->after('comments_2');

            // (opsional) jejak sync dari API TikTok nanti
            $table->timestamp('last_metrics_synced_at')->nullable()->after('shares_2');
        });
    }

    public function down(): void
    {
        Schema::table('influencer_submissions', function (Blueprint $table) {
            $table->dropColumn([
                'views_1','likes_1','comments_1','shares_1',
                'views_2','likes_2','comments_2','shares_2',
                'last_metrics_synced_at',
            ]);
        });
    }
};
