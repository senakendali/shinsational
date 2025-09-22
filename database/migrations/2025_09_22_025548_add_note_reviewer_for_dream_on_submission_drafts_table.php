<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('influencer_submission_drafts', function (Blueprint $table) {
            // Tambah dua kolom baru; biarkan kolom reviewer_note lama tetap ada untuk kompatibilitas
            $table->text('reviewer_note_1')->nullable()->after('reviewer_note');
            $table->text('reviewer_note_2')->nullable()->after('reviewer_note_1');
        });

        // Backfill data lama -> note_1
        // MySQL/Postgres aman; jika pakai driver lain sesuaikan syntax COALESCE/IFNULL
        DB::table('influencer_submission_drafts')
            ->whereNotNull('reviewer_note')
            ->whereNull('reviewer_note_1')
            ->update([
                'reviewer_note_1' => DB::raw('reviewer_note'),
            ]);
    }

    public function down(): void
    {
        // Saat rollback, isi reviewer_note (lama) dari gabungan note_1 / note_2 jika kosong
        // reviewer_note := COALESCE(reviewer_note_1, reviewer_note_2, reviewer_note)
        DB::table('influencer_submission_drafts')->update([
            'reviewer_note' => DB::raw('COALESCE(reviewer_note_1, reviewer_note_2, reviewer_note)'),
        ]);

        Schema::table('influencer_submission_drafts', function (Blueprint $table) {
            $table->dropColumn(['reviewer_note_1', 'reviewer_note_2']);
        });
    }
};
