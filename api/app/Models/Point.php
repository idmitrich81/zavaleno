<?php

namespace App\Models;

use App\Enums\PointStatus;
use App\Enums\PointType;
use Database\Factories\PointFactory;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Point extends Model
{
    /** @use HasFactory<PointFactory> */
    use HasFactory;

    protected $fillable = [
        'address', 'district', 'lat', 'lng', 'type', 'status',
        'status_changed_at', 'confirmations_count', 'pledges_count',
        'created_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'lat' => 'float',
            'lng' => 'float',
            'type' => PointType::class,
            'status' => PointStatus::class,
            'status_changed_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<City, $this>
     */
    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }

    /**
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function public(Builder $query): void
    {
        $query->whereIn('status', PointStatus::public());
    }
}
