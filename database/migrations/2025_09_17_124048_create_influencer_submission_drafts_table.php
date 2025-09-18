<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB; // <— penting kalau pakai DB::statement di backfill

return new class extends Migration {
    public function up(): void
    {
        Schema::create('influencer_submission_drafts', function (Blueprint $table) {
            $table->id();

            $table->foreignId('influencer_submission_id')
                ->constrained('influencer_submissions') // fk name default masih <64 chars, aman
                ->cascadeOnDelete();

            $table->unsignedTinyInteger('slot');
            $table->string('url', 2048);
            $table->string('channel', 50)->nullable();

            $table->string('status', 20)->default('pending')->index('isd_status_idx');
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();

            $table->foreignId('reviewed_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->text('reviewer_note')->nullable();

            $table->unsignedInteger('revision')->default(1);
            $table->boolean('is_latest')->default(true)->index('isd_latest_idx');

            $table->timestamps();

            // ====== NAMA INDEX/UNIQUE DIPENDEKKAN DI SINI ======
            // unique (submission + slot + revision)
            $table->unique(
                ['influencer_submission_id', 'slot', 'revision'],
                'isd_sub_slot_rev_uq'
            );

            // composite index (submission + slot)
            $table->index(
                ['influencer_submission_id', 'slot'],
                'isd_sub_slot_idx'
            );

            // (opsional) index updated_at kalau sering di-ordering
            $table->index('updated_at', 'isd_updated_idx');
        });

        // (Opsional) backfill dari kolom lama di influencer_submissions
        if (Schema::hasColumn('influencer_submissions', 'draft_url')) {
            DB::statement("
                INSERT INTO influencer_submission_drafts
                    (influencer_submission_id, slot, url, channel, status, submitted_at, reviewed_at, reviewed_by, reviewer_note, revision, is_latest, created_at, updated_at)
                SELECT id, 1, draft_url, draft_channel, COALESCE(draft_status, 'pending'),
                       draft_submitted_at, draft_reviewed_at, draft_reviewed_by, draft_reviewer_note,
                       1, 1, NOW(), NOW()
                FROM influencer_submissions
                WHERE draft_url IS NOT NULL
            ");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('influencer_submission_drafts');
    }
};
