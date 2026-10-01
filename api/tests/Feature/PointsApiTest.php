<?php

namespace Tests\Feature;

use App\Enums\PointStatus;
use App\Models\City;
use App\Models\Point;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PointsApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_lists_only_public_points_of_the_city(): void
    {
        $tomsk = City::factory()->create(['slug' => 'tomsk']);
        $other = City::factory()->create(['slug' => 'omsk']);

        $visible = collect(PointStatus::public())
            ->map(fn (PointStatus $status) => Point::factory()->for($tomsk)->create(['status' => $status]));
        foreach ([PointStatus::Pending, PointStatus::Rejected, PointStatus::Archived] as $status) {
            Point::factory()->for($tomsk)->create(['status' => $status]);
        }
        Point::factory()->for($other)->create();

        $response = $this->getJson('/api/tomsk/points')->assertOk();

        $this->assertEqualsCanonicalizing($visible->pluck('id')->all(), $response->json('data.*.id'));
    }

    public function test_a_point_has_the_shape_the_map_expects(): void
    {
        $point = Point::factory()->for(City::factory()->create(['slug' => 'tomsk']))->create([
            'address' => 'пр. Ленина, 46',
            'district' => 'Советский',
            'lat' => 56.47,
            'lng' => 84.948,
            'status' => PointStatus::InWork,
            'status_changed_at' => now(),
            'confirmations_count' => 11,
        ]);

        $this->getJson('/api/tomsk/points')->assertOk()->assertExactJson(['data' => [[
            'id' => $point->id,
            'address' => 'пр. Ленина, 46',
            'district' => 'Советский',
            'lat' => 56.47,
            'lng' => 84.948,
            'type' => 'yard',
            'status' => 'in_work',
            'createdAt' => $point->created_at->toJSON(),
            'statusChangedAt' => $point->status_changed_at->toJSON(),
            'confirmations' => 11,
        ]]]);
    }

    public function test_an_unknown_city_is_not_found(): void
    {
        $this->getJson('/api/atlantis/points')->assertNotFound();
    }
}
