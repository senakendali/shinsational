<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Project extends Model
{
    use HasFactory;

    protected $table = 'projects';

    protected $fillable = [
        'client_id',
        'name',
        'project_value',
        'start_date',
        'end_date',
        'status',
        'description',
        'notes',
    ];

    protected $casts = [
        'project_value' => 'decimal:2',
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function terms()
    {
        return $this->hasMany(ProjectTerm::class);
    }
}

