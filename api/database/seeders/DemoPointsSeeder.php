<?php

namespace Database\Seeders;

use App\Models\City;
use Illuminate\Database\Seeder;

/**
 * Вымышленные отметки из прототипа, координаты примерные. Только для разработки.
 */
class DemoPointsSeeder extends Seeder
{
    public function run(): void
    {
        $city = City::where('slug', 'tomsk')->firstOrFail();
        $city->points()->delete();

        $rows = json_decode(file_get_contents(__DIR__.'/data/tomsk.json'), true, flags: JSON_THROW_ON_ERROR);

        foreach ($rows as $row) {
            $city->points()->create([
                'address' => $row['address'],
                'district' => $row['district'],
                'lat' => $row['lat'],
                'lng' => $row['lng'],
                'type' => $row['type'],
                'status' => $row['status'],
                'confirmations_count' => $row['confirmations'],
                'created_at' => now()->subDays($row['createdDaysAgo']),
                'status_changed_at' => $row['statusDaysAgo'] === null ? null : now()->subDays($row['statusDaysAgo']),
            ]);
        }
    }
}
