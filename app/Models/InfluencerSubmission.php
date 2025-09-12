<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class InfluencerSubmission extends Model
{
    
    protected $fillable = [
        'tiktok_user_id','campaign_id',
        'link_1','post_date_1','screenshot_1_path',
        'link_2','post_date_2','screenshot_2_path',
        'purchase_platform','invoice_file_path','review_proof_file_path',
        // KPI lama (kalau ada)
        'yellow_cart','product_sold','gmv',
        // 🔽 metrik baru
        'views_1','likes_1','comments_1','shares_1',
        'views_2','likes_2','comments_2','shares_2',
        'last_metrics_synced_at',
    ];

    protected $casts = [
        'post_date_1' => 'date',
        'post_date_2' => 'date',
        // 🔽 metrik baru
        'views_1' => 'integer',
        'likes_1' => 'integer',
        'comments_1' => 'integer',
        'shares_1' => 'integer',
        'views_2' => 'integer',
        'likes_2' => 'integer',
        'comments_2' => 'integer',
        'shares_2' => 'integer',
        'last_metrics_synced_at' => 'datetime',
    ];

    protected $appends = [
        'screenshot_1_url',
        'screenshot_2_url',
        'invoice_file_url',
        'review_proof_file_url',
    ];

    public function campaign()
    {
        return $this->belongsTo(Campaign::class);
    }

    public function getScreenshot1UrlAttribute()
    {
        return $this->screenshot_1_path
            ? url('/files?p='.urlencode($this->screenshot_1_path))
            : null;
    }
    public function getScreenshot2UrlAttribute()
    {
        return $this->screenshot_2_path
            ? url('/files?p='.urlencode($this->screenshot_2_path))
            : null;
    }
    public function getInvoiceFileUrlAttribute()
    {
        return $this->invoice_file_path
            ? url('/files?p='.urlencode($this->invoice_file_path))
            : null;
    }
    public function getReviewProofFileUrlAttribute()
    {
        return $this->review_proof_file_path
            ? url('/files?p='.urlencode($this->review_proof_file_path))
            : null;
    }
}
