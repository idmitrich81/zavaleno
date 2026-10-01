<?php

namespace App\Models;

use App\Enums\PointStatus;
use App\Enums\PointType;
use App\Support\Geo;
use Database\Factories\PointFactory;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Point extends Model
{
    /** @use HasFactory<PointFactory> */
    use HasFactory;

    protected $fillable = [
        'address', 'district', 'lat', 'lng', 'type', 'status',
        'status_changed_at', 'confirmations_count', 'pledges_count',
        'created_at', 'author_device_id', 'comment', 'contact',
    ];

    protected $hidden = ['author_device_id', 'comment', 'contact'];

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
     * @return HasMany<PointEvent, $this>
     */
    public function events(): HasMany
    {
        return $this->hasMany(PointEvent::class)->latest()->latest('id');
    }

    /**
     * @return HasMany<Confirmation, $this>
     */
    public function confirmations(): HasMany
    {
        return $this->hasMany(Confirmation::class);
    }

    /**
     * @return HasMany<Photo, $this>
     */
    public function photos(): HasMany
    {
        return $this->hasMany(Photo::class);
    }

    /**
     * Точки, которые можно показать этому устройству: публичные и свои на проверке.
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function visibleTo(Builder $query, string $device): void
    {
        $query->where(fn (Builder $q) => $q
            ->whereIn('status', PointStatus::public())
            ->orWhere(fn (Builder $own) => $own
                ->where('status', PointStatus::Pending)
                ->where('author_device_id', $device)));
    }

    public function isVisibleTo(string $device): bool
    {
        return in_array($this->status, PointStatus::public(), true)
            || ($this->status === PointStatus::Pending && $this->author_device_id === $device);
    }

    /**
     * Незакрытая точка рядом с координатами: скорее всего, это то же место.
     */
    public static function duplicateNear(City $city, float $lat, float $lng, int $radiusMeters = 45): ?self
    {
        // Сначала грубый прямоугольник по индексу, потом точное расстояние.
        $dLat = $radiusMeters / 111_000;
        $dLng = $dLat / max(0.1, cos(deg2rad($lat)));

        return $city->points()
            ->whereIn('status', [PointStatus::Snowed, PointStatus::InWork])
            ->whereBetween('lat', [$lat - $dLat, $lat + $dLat])
            ->whereBetween('lng', [$lng - $dLng, $lng + $dLng])
            ->get()
            ->map(fn (self $p) => [$p, Geo::distanceMeters($lat, $lng, $p->lat, $p->lng)])
            ->filter(fn (array $pair) => $pair[1] <= $radiusMeters)
            ->sortBy(fn (array $pair) => $pair[1])
            ->first()[0] ?? null;
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
