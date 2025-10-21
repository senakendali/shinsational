<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('registrations', function (Blueprint $table) {
            $table->id();

            // Sesuai validasi di controller
            $table->string('name');                 // min 2 chars (divalidasi di controller)
            $table->enum('gender', ['male','female']);
            $table->string('age', 20);              // max:20 sesuai validasi

            // (Opsional tapi berguna buat audit/report)
            $table->string('source_ip', 45)->nullable();   // ipv4/ipv6
            $table->string('user_agent')->nullable();

            $table->timestamps();

            // Index ringan untuk report waktu
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('registrations');
    }
};
