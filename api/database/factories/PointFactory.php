<?php

namespace Database\Factories;

use App\Enums\PointStatus;
use App\Enums\PointType;
use App\Models\City;
use App\Models\Point;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Point>
 */
class PointFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'city_id' => City::factory(),
            'address' => fake()->streetAddress(),
            'district' => null,
            'lat' => fake()->latitude(56.45, 56.52),
            'lng' => fake()->longitude(84.93, 85.05),
            'type' => PointType::Yard,
            'status' => PointStatus::Snowed,
        ];
    }
}
