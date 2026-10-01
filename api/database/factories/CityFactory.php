<?php

namespace Database\Factories;

use App\Models\City;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<City>
 */
class CityFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'slug' => fake()->unique()->slug(1),
            'name' => fake()->city(),
            'lat' => 56.4846,
            'lng' => 84.9682,
            'zoom' => 12,
        ];
    }
}
