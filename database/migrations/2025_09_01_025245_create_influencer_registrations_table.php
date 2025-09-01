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
        Schema::create('influencer_registrations', function (Blueprint $table) {
            $table->id();

            // ID user TikTok (open_id)
            $table->string('tiktok_user_id', 100)->index();

            $table->string('full_name', 150);
            $table->string('tiktok_username', 100)->unique();
            $table->string('phone', 30);
            $table->string('address', 255);
            $table->date('birth_date');

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('influencer_registrations');
    }
};
