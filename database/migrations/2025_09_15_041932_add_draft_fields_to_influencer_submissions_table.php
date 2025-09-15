<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('influencer_submissions', function (Blueprint $table) {
            // URL draft (Google Drive / lainnya)
            $table->string('draft_url', 2048)->nullable()->after('review_proof_file_path');

            // opsional channel (tiktok, ig, dll — bebas string)
            $table->string('draft_channel', 50)->nullable()->after('draft_url');

            // status approval: pending/approved/rejected (pakai string biar fleksibel)
            $table->string('draft_status', 20)->nullable()->index()->after('draft_channel');

            // waktu submit & review
            $table->timestamp('draft_submitted_at')->nullable()->after('draft_status');
            $table->timestamp('draft_reviewed_at')->nullable()->after('draft_submitted_at');

            // reviewer & catatan (oleh admin)
            $table->foreignId('draft_reviewed_by')
                ->nullable()
                ->after('draft_reviewed_at')
                ->constrained('users')
                ->nullOnDelete();

            $table->text('draft_reviewer_note')->nullable()->after('draft_reviewed_by');
        });
    }

    public function down(): void
    {
        Schema::table('influencer_submissions', function (Blueprint $table) {
            if (Schema::hasColumn('influencer_submissions', 'draft_reviewed_by')) {
                $table->dropForeign(['draft_reviewed_by']);
            }
            $table->dropColumn([
                'draft_url',
                'draft_channel',
                'draft_status',
                'draft_submitted_at',
                'draft_reviewed_at',
                'draft_reviewed_by',
                'draft_reviewer_note',
            ]);
        });
    }
};
