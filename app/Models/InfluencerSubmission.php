<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InfluencerSubmission extends Model
{
    protected $fillable = [
        'campaign_id','tiktok_user_id',
        'link_1','post_date_1','screenshot_1_path',
        'link_2','post_date_2','screenshot_2_path',
        'purchase_platform',
        'invoice_file_path','review_proof_file_path',
        'yellow_cart','product_sold','gmv',
    ];

    public function campaign()
    {
        return $this->belongsTo(Campaign::class);
    }

    public function getScreenshot1UrlAttribute()
    {
        return $this->screenshot_1_path ? Storage::disk('public')->url($this->screenshot_1_path) : null;
    }
    public function getScreenshot2UrlAttribute()
    {
        return $this->screenshot_2_path ? Storage::disk('public')->url($this->screenshot_2_path) : null;
    }
    public function getInvoiceFileUrlAttribute()
    {
        return $this->invoice_file_path ? Storage::disk('public')->url($this->invoice_file_path) : null;
    }
    public function getReviewProofFileUrlAttribute()
    {
        return $this->review_proof_file_path ? Storage::disk('public')->url($this->review_proof_file_path) : null;
    }
}
