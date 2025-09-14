<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Simpan path relatif di storage (mis. "avatars/12345.jpg")
            // 2048 biar aman utk path panjang; nullable karena opsional
            $table->string('avatar_path', 2048)->nullable()->after('email');
            // (opsional) kalau mau: versi/cache-buster
            // $table->unsignedInteger('avatar_version')->default(0)->after('avatar_path');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['avatar_path'/*, 'avatar_version'*/]);
        });
    }
};
