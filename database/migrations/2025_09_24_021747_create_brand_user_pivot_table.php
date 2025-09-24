<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Pastikan brands & users sudah ada
        Schema::create('brand_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('brand_id')->constrained('brands')->cascadeOnUpdate()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnUpdate()->cascadeOnDelete();

            // Metadata opsional
            $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('assigned_at')->nullable();

            $table->timestamps();

            $table->unique(['brand_id', 'user_id']); // 1 user tidak dobel di brand yang sama
            $table->index(['user_id', 'brand_id']);  // akses cepat filter by user/brand
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('brand_user');
    }
};
