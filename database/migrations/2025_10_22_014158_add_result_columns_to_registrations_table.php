<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('registrations', function (Blueprint $table) {
            // opsi pemenang (A/B/C/D) atau label lain
            $table->string('result_option', 16)->nullable()->after('age');

            // hitungan per opsi, disimpan sebagai JSON: {"A":2,"B":1,"C":0,"D":2}
            $table->json('result_counts')->nullable()->after('result_option');

            // path gambar hasil komposit (mis. 'storage/results/123-20251022_090102.png')
            $table->string('result_image', 512)->nullable()->after('result_counts');

            // optional index biar query by result_option lebih cepat
            $table->index('result_option');
        });
    }

    public function down(): void
    {
        Schema::table('registrations', function (Blueprint $table) {
            $table->dropIndex(['result_option']);
            $table->dropColumn(['result_option', 'result_counts', 'result_image']);
        });
    }
};
