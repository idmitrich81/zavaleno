<?php

namespace Tests\Feature;

use App\Enums\PointStatus;
use App\Models\City;
use App\Models\Point;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class ConfirmationApiTest extends TestCase
{
    use RefreshDatabase;

    private Point $point;

    protected function setUp(): void
    {
        parent::setUp();

        $this->point = Point::factory()
            ->for(City::factory()->create(['slug' => 'tomsk']))
            ->create(['confirmations_count' => 5]);
    }

    private function url(): string
    {
        return "/api/tomsk/points/{$this->point->id}/confirmation";
    }

    public function test_a_device_confirms_a_point_only_once(): void
    {
        $device = ['X-Device-Id' => (string) Str::uuid()];

        $this->postJson($this->url(), [], $device)
            ->assertOk()
            ->assertExactJson(['data' => ['confirmations' => 6, 'confirmedByMe' => true]]);
        $this->postJson($this->url(), [], $device)->assertOk()->assertJsonPath('data.confirmations', 6);

        $this->postJson($this->url(), [], ['X-Device-Id' => (string) Str::uuid()])
            ->assertJsonPath('data.confirmations', 7);
    }

    public function test_a_device_can_take_its_confirmation_back(): void
    {
        $device = ['X-Device-Id' => (string) Str::uuid()];
        $this->postJson($this->url(), [], $device);

        $this->deleteJson($this->url(), [], $device)
            ->assertOk()
            ->assertExactJson(['data' => ['confirmations' => 5, 'confirmedByMe' => false]]);
        // Повторная отмена и отмена чужим устройством счётчик не трогают.
        $this->deleteJson($this->url(), [], $device)->assertJsonPath('data.confirmations', 5);
        $this->deleteJson($this->url(), [], ['X-Device-Id' => (string) Str::uuid()])->assertJsonPath('data.confirmations', 5);
    }

    public function test_the_point_tells_a_device_whether_it_has_confirmed(): void
    {
        $device = ['X-Device-Id' => (string) Str::uuid()];
        $show = "/api/tomsk/points/{$this->point->id}";

        $this->getJson($show, $device)->assertJsonPath('data.confirmedByMe', false);
        $this->postJson($this->url(), [], $device);

        $this->getJson($show, $device)->assertJsonPath('data.confirmedByMe', true);
        $this->getJson($show, ['X-Device-Id' => (string) Str::uuid()])->assertJsonPath('data.confirmedByMe', false);
        $this->getJson($show)->assertJsonPath('data.confirmedByMe', false);
    }

    public function test_a_request_without_a_valid_device_id_is_rejected(): void
    {
        $this->postJson($this->url())->assertUnprocessable();
        $this->postJson($this->url(), [], ['X-Device-Id' => 'not-a-uuid'])->assertUnprocessable();

        $this->assertSame(5, $this->point->refresh()->confirmations_count);
    }

    public function test_only_a_snowed_or_in_work_point_can_be_confirmed(): void
    {
        $device = ['X-Device-Id' => (string) Str::uuid()];

        $this->point->update(['status' => PointStatus::Cleared]);
        $this->postJson($this->url(), [], $device)->assertConflict();

        $this->point->update(['status' => PointStatus::Pending]);
        $this->postJson($this->url(), [], $device)->assertConflict();

        $this->point->update(['status' => PointStatus::InWork]);
        $this->postJson($this->url(), [], $device)->assertOk();
    }
}
