<?php

namespace App\Models;

use App\Enums\EventKind;
use Illuminate\Database\Eloquent\Model;

class PointEvent extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'events';

    protected $fillable = ['kind', 'text', 'created_at'];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['kind' => EventKind::class];
    }
}
