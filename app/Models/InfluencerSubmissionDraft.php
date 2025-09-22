<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InfluencerSubmissionDraft extends Model
{
    protected $fillable = [
        'influencer_submission_id',
        'slot',
        'url',
        'channel',
        'status',
        'submitted_at',
        'reviewed_at',
        'reviewed_by',
        'reviewer_note',
        'reviewer_note_1',
        'reviewer_note_2',
        'revision',
        'is_latest',
    ];

    protected $casts = [
        'submitted_at' => 'datetime',
        'reviewed_at'  => 'datetime',
        'is_latest'    => 'boolean',
    ];

    public function submission(): BelongsTo
    {
        return $this->belongsTo(InfluencerSubmission::class, 'influencer_submission_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
