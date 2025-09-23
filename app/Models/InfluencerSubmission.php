<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InfluencerSubmission extends Model
{
    protected $fillable = [
        'tiktok_user_id',
        'campaign_id',

        // Post 1
        'link_1',
        'post_date_1',
        'screenshot_1_path',

        // Post 2 (opsional)
        'link_2',
        'post_date_2',
        'screenshot_2_path',

        // Post 3–5 (opsional)
        'link_3',
        'post_date_3',
        'screenshot_3_path',

        'link_4',
        'post_date_4',
        'screenshot_4_path',

        'link_5',
        'post_date_5',
        'screenshot_5_path',

        // Pembelian / bukti
        'purchase_platform',       // tiktokshop/shopee/...
        'invoice_file_path',
        'review_proof_file_path',

        // KPI lama
        'yellow_cart',
        'product_sold',
        'gmv',

        // Metrik baru
        'views_1','likes_1','comments_1','shares_1',
        'views_2','likes_2','comments_2','shares_2',
        'last_metrics_synced_at',

        // ★ Field baru (acquisition & shipping)
        'acquisition_method',          // buy / sent_by_brand
        'purchase_price',              // decimal(12,2)
        'shipping_courier',            // JNE/J&T/...
        'shipping_tracking_number',    // resi
        'shipment_status',             // dikirim / belum dikirim

        // Draft
        'draft_url',
        'draft_channel',
        'draft_status',
        'draft_submitted_at',
        'draft_reviewed_at',
        'draft_reviewed_by',
        'draft_reviewer_note',
    ];

    protected $casts = [
        'post_date_1' => 'date',
        'post_date_2' => 'date',
        'post_date_3' => 'date',
        'post_date_4' => 'date',
        'post_date_5' => 'date',

        // Metrik baru
        'views_1' => 'integer',
        'likes_1' => 'integer',
        'comments_1' => 'integer',
        'shares_1' => 'integer',
        'views_2' => 'integer',
        'likes_2' => 'integer',
        'comments_2' => 'integer',
        'shares_2' => 'integer',
        'last_metrics_synced_at' => 'datetime',

        // ★ Cast baru
        'purchase_price' => 'decimal:2',

        // Draft
        'draft_submitted_at' => 'datetime',
        'draft_reviewed_at'  => 'datetime',
    ];

    protected $appends = [
        'screenshot_1_url',
        'screenshot_2_url',
        'screenshot_3_url',
        'screenshot_4_url',
        'screenshot_5_url',
        'invoice_file_url',
        'review_proof_file_url',
    ];

    public function draftReviewer()
    {
        return $this->belongsTo(\App\Models\User::class, 'draft_reviewed_by');
    }

    // Relations
    public function campaign()
    {
        return $this->belongsTo(Campaign::class);
    }

    // ==== Helpers
    protected function fileViewerUrl(?string $path): ?string
    {
        return $path ? url('/files?p=' . urlencode($path)) : null;
    }

    // ==== Accessors (viewer url /files?p=...)
    public function getScreenshot1UrlAttribute(): ?string
    {
        return $this->fileViewerUrl($this->screenshot_1_path);
    }

    public function getScreenshot2UrlAttribute(): ?string
    {
        return $this->fileViewerUrl($this->screenshot_2_path);
    }

    public function getScreenshot3UrlAttribute(): ?string
    {
        return $this->fileViewerUrl($this->screenshot_3_path);
    }

    public function getScreenshot4UrlAttribute(): ?string
    {
        return $this->fileViewerUrl($this->screenshot_4_path);
    }

    public function getScreenshot5UrlAttribute(): ?string
    {
        return $this->fileViewerUrl($this->screenshot_5_path);
    }

    public function getInvoiceFileUrlAttribute(): ?string
    {
        return $this->fileViewerUrl($this->invoice_file_path);
    }

    public function getReviewProofFileUrlAttribute(): ?string
    {
        return $this->fileViewerUrl($this->review_proof_file_path);
    }

    public function drafts()
    {
        return $this->hasMany(InfluencerSubmissionDraft::class, 'influencer_submission_id');
    }

    public function latestDrafts()
    {
        return $this->drafts()->where('is_latest', true);
    }

    public function draftForSlot(int $slot)
    {
        return $this->latestDrafts()->where('slot', $slot)->first();
    }

}
