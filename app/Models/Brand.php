<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Brand extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'slug',
        'logo_path',
        'website_url',
        'is_active',
        'socials',
        'notes',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'socials'   => 'array',
    ];

    
    public function campaigns()
    {
        return $this->hasMany(Campaign::class);
    }

    /*public function users()
    {
        return $this->hasMany(User::class);
    }*/

    public function users()
    {
        return $this->belongsToMany(\App\Models\User::class, 'brand_user')
            ->withTimestamps()
            ->withPivot(['assigned_by', 'assigned_at']);
    }


}
