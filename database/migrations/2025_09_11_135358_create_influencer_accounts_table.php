<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('influencer_accounts', function (Blueprint $table) {
            $table->id();

            $table->string('tiktok_user_id', 100)->unique();
            $table->string('tiktok_username', 100)->nullable();
            $table->string('full_name', 150)->nullable();
            $table->string('avatar_url', 2048)->nullable();

            $table->string('token_type', 20)->default('Bearer');
            $table->text('access_token')->nullable();
            $table->text('refresh_token')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('last_refreshed_at')->nullable();
            $table->timestamp('revoked_at')->nullable();

            $table->json('scopes')->nullable();

            $table->timestamps();

            $table->index(['expires_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('influencer_accounts');
    }
};
