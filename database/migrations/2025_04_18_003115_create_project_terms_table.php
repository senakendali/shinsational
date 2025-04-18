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
        Schema::create('project_terms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->onDelete('cascade');

            $table->string('title');                       // Nama termin (contoh: DP, Termin 1, Termin Akhir)
            $table->text('description')->nullable();       // Keterangan milestone
            $table->decimal('amount', 20, 2);              // Nilai tagihan termin
            $table->date('due_date')->nullable();          // Tanggal jatuh tempo
            $table->enum('status', ['belum_dibayar', 'dibayar'])->default('belum_dibayar');
            $table->date('paid_at')->nullable();           // Tanggal dibayar (jika sudah)
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_terms');
    }
};
