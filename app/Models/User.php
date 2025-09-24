<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasRoles;

    protected $guard_name = 'web'; // pastikan guard yang dipakai

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'avatar_path',
        'brand_id',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $appends = ['avatar_url'];

    

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * Buat URL viewer aman: /files?p=...
     */
    protected function fileViewerUrl(?string $path): ?string
    {
        return $path ? url('/files?p=' . urlencode($path)) : null;
    }

    /**
     * Accessor: avatar_url
     * Contoh hasil: https://domainmu/files?p=avatars/abc.png
     */
    public function getAvatarUrlAttribute(): ?string
    {
        return $this->fileViewerUrl($this->avatar_path);
    }

    public function brand()
    {
        return $this->belongsTo(Brand::class);
    }

    public function brands()
    {
        return $this->belongsToMany(\App\Models\Brand::class, 'brand_user')
            ->withTimestamps()
            ->withPivot(['assigned_by', 'assigned_at']);
    }

    public function getBrandIdsAttribute(): array
    {
        static $cache = null;
        if ($cache !== null) return $cache;
        $cache = $this->brands()->pluck('brands.id')->map(fn($id) => (int) $id)->all();
        return $cache;
    }
}
