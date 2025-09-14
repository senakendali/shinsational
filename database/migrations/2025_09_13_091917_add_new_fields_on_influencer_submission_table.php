<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('influencer_submissions', function (Blueprint $table) {
            // Cara mendapatkan produk (buy / sent_by_brand)
            $table->enum('acquisition_method', ['buy', 'sent_by_brand'])
                  ->nullable()
                  ->after('screenshot_2_path')
                  ->comment('buy = beli sendiri, sent_by_brand = dikirim brand');

            // Jika BELI (terkait pembelian)
            // (asumsi kolom purchase_platform sudah ada)
            $table->decimal('purchase_price', 12, 2)
                  ->nullable()
                  ->after('purchase_platform')
                  ->comment('harga beli (jika beli sendiri)');

            // Jika DIKIRIM BRAND (terkait pengiriman)
            $table->string('shipping_courier', 100)
                  ->nullable()
                  ->after('purchase_price')
                  ->comment('nama ekspedisi (JNE/J&T/SiCepat, dll)');

            $table->string('shipping_tracking_number', 100)
                  ->nullable()
                  ->after('shipping_courier')
                  ->index()
                  ->comment('nomor resi');
        });
    }

    public function down(): void
    {
        Schema::table('influencer_submissions', function (Blueprint $table) {
            $table->dropColumn([
                'acquisition_method',
                'purchase_price',
                'shipping_courier',
                'shipping_tracking_number',
            ]);
        });
    }
};
