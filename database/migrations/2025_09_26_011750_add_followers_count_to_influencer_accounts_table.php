<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('influencer_accounts', function (Blueprint $table) {
            // pakai BIGINT biar aman untuk angka besar
            $table->unsignedBigInteger('followers_count')
                  ->nullable()
                  ->after('avatar_url');
        });
    }

    public function down(): void
    {
        Schema::table('influencer_accounts', function (Blueprint $table) {
            $table->dropColumn('followers_count');
        });
    }
};
