<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('influencer_submissions', function (Blueprint $table) {
            $table->id();

            // Relasi campaign & identitas influencer TikTok
            $table->foreignId('campaign_id')
                ->constrained('campaigns')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();
            $table->string('tiktok_user_id', 100)->index();

            // Postingan 1 & 2
            $table->string('link_1', 2048)->nullable();
            $table->date('post_date_1')->nullable();
            $table->string('screenshot_1_path', 2048)->nullable();

            $table->string('link_2', 2048)->nullable();
            $table->date('post_date_2')->nullable();
            $table->string('screenshot_2_path', 2048)->nullable();

            // Pembelian & bukti
            $table->enum('purchase_platform', ['tiktokshop','shopee'])->nullable();
            $table->string('invoice_file_path', 2048)->nullable();
            $table->string('review_proof_file_path', 2048)->nullable();

            // KPI tambahan (opsional)
            $table->unsignedInteger('yellow_cart')->nullable();
            $table->unsignedInteger('product_sold')->nullable();
            $table->decimal('gmv', 14, 2)->nullable();

            $table->timestamps();

            // Kalau 1 influencer hanya boleh 1 submission per campaign:
            // $table->unique(['campaign_id','tiktok_user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('influencer_submissions');
    }
};
