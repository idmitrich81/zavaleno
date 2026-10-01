<?php

namespace App\Models;

use Database\Factories\CityFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class City extends Model
{
    /** @use HasFactory<CityFactory> */
    use HasFactory;

    protected $fillable = ['slug', 'name', 'lat', 'lng', 'zoom'];

    /**
     * @return HasMany<Point, $this>
     */
    public function points(): HasMany
    {
        return $this->hasMany(Point::class);
    }
}
