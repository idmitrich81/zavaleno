<?php

namespace Database\Seeders;

use App\Models\City;
use Illuminate\Database\Seeder;

class CitySeeder extends Seeder
{
    public function run(): void
    {
        City::updateOrCreate(
            ['slug' => 'tomsk'],
            ['name' => 'Томск', 'lat' => 56.4846, 'lng' => 84.9682, 'zoom' => 12],
        );
    }
}
