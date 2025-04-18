<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Client extends Model
{
    use HasFactory;

    protected $table = 'clients';

    protected $fillable = [
        'name',
        'email',
        'phone',
        'address',
        'pic_name',
        'pic_email',
        'pic_phone',
        'pic_position',
        'notes',
    ];

    public function projects()
    {
        return $this->hasMany(Project::class);
    }
}

