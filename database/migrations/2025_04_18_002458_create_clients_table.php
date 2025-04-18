<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->string('name');                    // Nama klien / perusahaan
            $table->string('email')->nullable();       // Email
            $table->string('phone')->nullable();       // Nomor HP / WhatsApp
            $table->text('address')->nullable();       // Alamat
            $table->string('pic_name')->nullable();    // Nama PIC
            $table->string('pic_email')->nullable();   // Email PIC
            $table->string('pic_phone')->nullable();   // Nomor HP PIC
            $table->string('pic_position')->nullable();// Jabatan PIC
            $table->text('notes')->nullable();         // Catatan internal
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clients');
    }
};

