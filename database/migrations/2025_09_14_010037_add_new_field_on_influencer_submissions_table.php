<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('influencer_submissions', function (Blueprint $table) {
            // Kurangi beban row: ubah kolom panjang jadi TEXT
            $table->text('link_1')->nullable()->change();
            $table->text('link_2')->nullable()->change();
            $table->text('screenshot_1_path')->nullable()->change();
            $table->text('screenshot_2_path')->nullable()->change();
            $table->text('invoice_file_path')->nullable()->change();
            $table->text('review_proof_file_path')->nullable()->change();

            // Tambah slot 3
            $table->text('link_3')->nullable()->after('shipping_tracking_number');
            $table->date('post_date_3')->nullable()->after('link_3');
            $table->text('screenshot_3_path')->nullable()->after('post_date_3');

            // Tambah slot 4
            $table->text('link_4')->nullable()->after('screenshot_3_path');
            $table->date('post_date_4')->nullable()->after('link_4');
            $table->text('screenshot_4_path')->nullable()->after('post_date_4');

            // Tambah slot 5
            $table->text('link_5')->nullable()->after('screenshot_4_path');
            $table->date('post_date_5')->nullable()->after('link_5');
            $table->text('screenshot_5_path')->nullable()->after('post_date_5');
        });
    }

    public function down(): void
    {
        Schema::table('influencer_submissions', function (Blueprint $table) {
            // Kembalikan tipe awal (hati-hati: bisa kena limit lagi)
            $table->string('link_1', 2048)->nullable()->change();
            $table->string('link_2', 2048)->nullable()->change();
            $table->string('screenshot_1_path', 2048)->nullable()->change();
            $table->string('screenshot_2_path', 2048)->nullable()->change();
            $table->string('invoice_file_path', 2048)->nullable()->change();
            $table->string('review_proof_file_path', 2048)->nullable()->change();

            $table->dropColumn([
                'link_3','post_date_3','screenshot_3_path',
                'link_4','post_date_4','screenshot_4_path',
                'link_5','post_date_5','screenshot_5_path',
            ]);
        });
    }
};
