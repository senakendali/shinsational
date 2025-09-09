<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('brands', function (Blueprint $table) {
            $table->id();

            $table->string('name', 150);
            $table->string('slug', 160)->unique();

            $table->string('logo_path')->nullable();
            $table->string('website_url', 2048)->nullable();
            $table->boolean('is_active')->default(true);

            $table->json('socials')->nullable(); // { "tiktok":"@brand", "instagram":"@brand", ... }
            $table->text('notes')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index('name'); // bantu pencarian
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('brands');
    }
};
