<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Campaign extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'brand_id',
        'name',
        'slug',
        'code',
        'objective',
        'start_date',
        'end_date',
        'status',
        'is_active',
        'budget',
        'currency',
        'kpi_targets',
        'hashtags',
        'notes',
        'min_age', 'max_age', 'content_quota', 'kpi_targets',
    ];

    protected $casts = [
        'start_date'  => 'date',
        'end_date'    => 'date',
        'is_active'   => 'boolean',
        'budget'      => 'decimal:2',
        'kpi_targets' => 'array',   // contoh: {"views":100000,"likes":5000}
        'hashtags'    => 'array',   // contoh: ["#ramadan","#promo"]
    ];

    /* ========= RELATIONSHIPS ========= */

    public function brand()
    {
        return $this->belongsTo(Brand::class);
    }

    /* ========= SCOPES UTAMA ========= */

    // Cari cepat
    public function scopeSearch($q, ?string $term)
    {
        if (!$term) return $q;
        return $q->where(function ($qq) use ($term) {
            $qq->where('name', 'like', "%{$term}%")
               ->orWhere('code', 'like', "%{$term}%")
               ->orWhere('slug', 'like', "%{$term}%");
        });
    }

    // Filter status
    public function scopeStatus($q, ?string $status)
    {
        if (!$status) return $q;
        return $q->where('status', $status);
    }

    // Hanya yang aktif
    public function scopeActive($q)
    {
        return $q->where('is_active', true);
    }

    // Filter per brand
    public function scopeOfBrand($q, $brandId)
    {
        if (!$brandId) return $q;
        return $q->where('brand_id', $brandId);
    }

    // Campaign yang sedang berjalan pada sebuah tanggal (default: hari ini)
    public function scopeOngoingAt($q, $date = null)
    {
        $date = $date ?: now()->toDateString();
        return $q->where(function ($qq) use ($date) {
            $qq->whereNull('start_date')->orWhereDate('start_date', '<=', $date);
        })->where(function ($qq) use ($date) {
            $qq->whereNull('end_date')->orWhereDate('end_date', '>=', $date);
        });
    }

    /* ========= ACCESSORS (opsional) ========= */

    // Durasi (hari) kalau start & end ada
    public function getDurationDaysAttribute(): ?int
    {
        if (!$this->start_date || !$this->end_date) return null;
        return $this->start_date->diffInDays($this->end_date) + 1;
    }

    // Apakah sedang berjalan hari ini
    public function getIsOngoingAttribute(): bool
    {
        $today = now()->toDateString();
        $startOk = !$this->start_date || $this->start_date->toDateString() <= $today;
        $endOk   = !$this->end_date   || $this->end_date->toDateString()   >= $today;
        return $startOk && endOk;
    }

    public function influencerRegistrations()
    {
        return $this->hasMany(InfluencerRegistration::class);
    }

    

}
