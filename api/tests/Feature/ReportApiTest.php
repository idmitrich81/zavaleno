<?php

namespace Tests\Feature;

use App\Enums\PointStatus;
use App\Models\City;
use App\Models\Point;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class ReportApiTest extends TestCase
{
    use RefreshDatabase;

    private City $city;

    /** @var array<string, string> */
    private array $device;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        $this->city = City::factory()->create(['slug' => 'tomsk', 'lat' => 56.4846, 'lng' => 84.9682]);
        $this->device = ['X-Device-Id' => (string) Str::uuid()];
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function report(array $overrides = []): array
    {
        return $overrides + [
            'photos' => [UploadedFile::fake()->image('yard.jpg', 3000, 2000)],
            'lat' => 56.47,
            'lng' => 84.95,
            'address' => 'пр. Ленина, 46',
            'type' => 'yard',
            'comment' => 'Не проехать к подъезду',
            'contact' => '@neighbour',
        ];
    }

    public function test_a_report_becomes_a_pending_point_with_a_resized_photo(): void
    {
        $response = $this->post('/api/tomsk/points', $this->report(), $this->device + ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.confirmations', 1)
            ->assertJsonPath('data.confirmedByMe', true)
            ->assertJsonPath('data.events.0.kind', 'submitted')
            ->assertJsonMissingPath('data.contact')
            ->assertJsonMissingPath('data.comment');

        $point = Point::sole();
        $this->assertSame('@neighbour', $point->contact);

        $photo = $point->photos()->sole();
        $this->assertSame('/storage/'.$photo->path, $response->json('data.photos.0.url'));
        [$width, $height] = getimagesizefromstring(Storage::disk('public')->get($photo->path));
        $this->assertSame([1600, 1067], [$width, $height]);
    }

    public function test_a_pending_point_is_visible_only_to_its_author(): void
    {
        $this->post('/api/tomsk/points', $this->report(), $this->device)->assertCreated();
        $id = Point::sole()->id;
        $stranger = ['X-Device-Id' => (string) Str::uuid()];

        $this->getJson('/api/tomsk/points', $this->device)->assertJsonPath('data.*.id', [$id]);
        $this->getJson("/api/tomsk/points/{$id}", $this->device)->assertOk();

        $this->getJson('/api/tomsk/points', $stranger)->assertJsonCount(0, 'data');
        $this->getJson('/api/tomsk/points')->assertJsonCount(0, 'data');
        $this->getJson("/api/tomsk/points/{$id}", $stranger)->assertNotFound();
    }

    public function test_a_report_next_to_an_open_point_is_offered_as_a_duplicate(): void
    {
        // ~30 м севернее новой отметки.
        $near = Point::factory()->for($this->city)->create(['lat' => 56.47027, 'lng' => 84.95]);
        Point::factory()->for($this->city)->create(['lat' => 56.47005, 'lng' => 84.95, 'status' => PointStatus::Cleared]);
        Point::factory()->for($this->city)->create(['lat' => 56.471, 'lng' => 84.95]);

        $this->post('/api/tomsk/points', $this->report(), $this->device)
            ->assertConflict()
            ->assertJsonPath('duplicate.id', $near->id);
        $this->assertSame(3, Point::count());

        $this->post('/api/tomsk/points', $this->report(['force' => '1']), $this->device)->assertCreated();
    }

    public function test_a_bad_report_is_rejected(): void
    {
        $json = $this->device + ['Accept' => 'application/json'];

        $this->post('/api/tomsk/points', $this->report(['photos' => []]), $json)->assertJsonValidationErrors('photos');
        $this->post('/api/tomsk/points', $this->report(['photos' => array_fill(0, 4, UploadedFile::fake()->image('a.jpg'))]), $json)
            ->assertJsonValidationErrors('photos');
        $this->post('/api/tomsk/points', $this->report(['photos' => [UploadedFile::fake()->create('a.pdf', 10)]]), $json)
            ->assertJsonValidationErrors('photos.0');
        $this->post('/api/tomsk/points', $this->report(['type' => 'castle']), $json)->assertJsonValidationErrors('type');
        // Москва.
        $this->post('/api/tomsk/points', $this->report(['lat' => 55.75, 'lng' => 37.62]), $json)->assertJsonValidationErrors('lat');
        $this->post('/api/tomsk/points', $this->report(), ['Accept' => 'application/json'])->assertForbidden();

        $this->assertSame(0, Point::count());
    }

    public function test_the_moderation_command_publishes_a_pending_point(): void
    {
        $this->post('/api/tomsk/points', $this->report(), $this->device);
        $id = Point::sole()->id;

        $this->artisan('points:moderate', ['point' => $id, 'decision' => 'approve'])->assertSuccessful();

        $this->getJson("/api/tomsk/points/{$id}")
            ->assertOk()
            ->assertJsonPath('data.status', 'snowed')
            ->assertJsonPath('data.events.0.kind', 'created');
    }
}
