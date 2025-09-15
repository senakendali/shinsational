<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // pastikan tabel brands sudah ada
            $table->foreignId('brand_id')
                  ->nullable()
                  ->after('id')
                  ->constrained('brands')
                  ->nullOnDelete()
                  ->cascadeOnUpdate();

            $table->index('brand_id');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['brand_id']);
            $table->dropIndex(['brand_id']);
            $table->dropColumn('brand_id');
        });
    }
};
