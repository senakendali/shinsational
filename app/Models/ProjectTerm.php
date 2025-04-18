<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ProjectTerm extends Model
{
    use HasFactory;

    protected $table = 'project_terms';

    protected $fillable = [
        'project_id',
        'title',
        'description',
        'amount',
        'due_date',
        'status',
        'paid_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'due_date' => 'date',
        'paid_at' => 'date',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }
}

