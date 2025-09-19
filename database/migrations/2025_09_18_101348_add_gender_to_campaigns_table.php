<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            // Letakkan setelah max_age (atau sesuaikan kolom yang ada)
            if (Schema::hasColumn('campaigns', 'max_age')) {
                // MySQL/MariaDB: enum
                $table->enum('gender', ['all', 'male', 'female'])
                      ->default('all')
                      ->after('max_age');
            } else {
                $table->enum('gender', ['all', 'male', 'female'])
                      ->default('all');
            }
        });
    }

    public function down(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            if (Schema::hasColumn('campaigns', 'gender')) {
                $table->dropColumn('gender');
            }
        });
    }
};
