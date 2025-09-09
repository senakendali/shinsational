<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('campaigns', function (Blueprint $table) {
            $table->id();

            // Relasi ke brands
            $table->foreignId('brand_id')
                  ->constrained('brands')
                  ->cascadeOnUpdate()
                  ->restrictOnDelete(); // hindari terhapus massal kalau brand dihapus

            // Identitas campaign
            $table->string('name', 150);
            $table->string('slug', 160);                 // unik per brand
            $table->string('code', 50)->nullable();      // optional human code (CMP-2025-001)

            // Informasi umum
            $table->string('objective', 50)->nullable(); // mis. awareness/engagement/conversion
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();

            // Status & kontrol
            $table->enum('status', ['draft', 'scheduled', 'active', 'paused', 'completed', 'archived'])
                  ->default('draft');
            $table->boolean('is_active')->default(true);

            // Finansial
            $table->decimal('budget', 15, 2)->nullable();
            $table->char('currency', 3)->default('IDR');

            // Metadata fleksibel
            $table->json('kpi_targets')->nullable(); // contoh: {"views":100000,"likes":5000}
            $table->json('hashtags')->nullable();    // contoh: ["#ramadan","..."]
            $table->text('notes')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->unique(['brand_id', 'slug']); // slug unik dalam 1 brand
            $table->index(['brand_id', 'status']);
            $table->index('start_date');
            $table->index('end_date');
            $table->index('name');
            $table->unique('code'); // kalau dipakai, unik secara global
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campaigns');
    }
};
