<?php

namespace Database\Seeders;

use App\Enums\EventKind;
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
            $point = $city->points()->create([
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

            $point->events()->createMany($this->events($row));
        }
    }

    /**
     * @param  array<string, mixed>  $row
     * @return list<array<string, mixed>>
     */
    private function events(array $row): array
    {
        $created = now()->subDays($row['createdDaysAgo']);
        $events = [['kind' => EventKind::Created, 'text' => 'Отметку добавили, фото проверено', 'created_at' => $created]];

        if ($row['confirmations'] > 1) {
            $others = $row['confirmations'] - 1;
            $events[] = [
                'kind' => EventKind::Confirmed,
                'text' => "Подтвердили ещё {$others} ".$this->people($others),
                'created_at' => $created->copy()->addHours(20)->min(now()),
            ];
        }

        $changed = $row['statusDaysAgo'] === null ? null : now()->subDays($row['statusDaysAgo']);
        if ($row['status'] === 'in_work') {
            $events[] = ['kind' => EventKind::InWork, 'text' => 'Уборку заказали, техника назначена', 'created_at' => $changed];
        }
        if ($row['status'] === 'cleared') {
            $events[] = ['kind' => EventKind::Cleared, 'text' => 'Убрано, фото «после» проверено', 'created_at' => $changed];
        }

        return $events;
    }

    private function people(int $n): string
    {
        $tens = $n % 100;
        $ones = $n % 10;

        return $ones >= 2 && $ones <= 4 && ($tens < 12 || $tens > 14) ? 'человека' : 'человек';
    }
}
