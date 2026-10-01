<?php

namespace App\Http\Controllers;

use App\Enums\EventKind;
use App\Enums\PointStatus;
use App\Http\Requests\StorePointRequest;
use App\Http\Resources\PointResource;
use App\Models\City;
use App\Models\Point;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\ImageManager;

class PointController extends Controller
{
    /** Длинная сторона сохранённого фото, px. */
    private const PHOTO_SIZE = 1600;

    public function index(Request $request, City $city): AnonymousResourceCollection
    {
        return PointResource::collection(
            $city->points()->visibleTo($this->device($request))->latest()->get(),
        );
    }

    public function show(Request $request, City $city, Point $point): PointResource
    {
        $device = $this->device($request);
        abort_unless($point->isVisibleTo($device), 404);

        return new PointResource($this->detail($point, $device));
    }

    public function store(StorePointRequest $request, City $city): JsonResponse
    {
        $device = $request->device();
        $lat = (float) $request->lat;
        $lng = (float) $request->lng;

        if (! $request->boolean('force') && $duplicate = Point::duplicateNear($city, $lat, $lng)) {
            return response()->json([
                'message' => 'Похоже, это место уже отмечено.',
                'duplicate' => new PointResource($duplicate),
            ], 409);
        }

        // Картинки готовим до транзакции: битый файл не должен оставить точку без фото.
        $images = array_map($this->encode(...), $request->file('photos'));

        $point = DB::transaction(function () use ($request, $city, $device, $lat, $lng, $images) {
            $point = $city->points()->create([
                'address' => $request->address,
                'district' => $request->district,
                'lat' => $lat,
                'lng' => $lng,
                'type' => $request->type,
                'status' => PointStatus::Pending,
                'author_device_id' => $device,
                'comment' => $request->comment,
                'contact' => $request->contact,
            ]);
            // Автор уже учтён в счётчике: вторым голосом он свою отметку не подтвердит.
            $point->confirmations()->create(['device_id' => $device]);
            $point->events()->create(['kind' => EventKind::Submitted, 'text' => 'Отметка отправлена на проверку']);

            foreach ($images as $jpeg) {
                $path = "points/{$point->id}/".Str::uuid().'.jpg';
                Storage::disk('public')->put($path, $jpeg);
                $point->photos()->create(['path' => $path]);
            }

            // refresh подтягивает значения по умолчанию из базы, например счётчик подтверждений.
            return $point->refresh();
        });

        return (new PointResource($this->detail($point, $device)))->response()->setStatusCode(201);
    }

    private function device(Request $request): string
    {
        return (string) $request->header('X-Device-Id');
    }

    private function detail(Point $point, string $device): Point
    {
        return $point->load('events', 'photos')->loadExists([
            'confirmations as confirmed_by_me' => fn ($query) => $query->where('device_id', $device),
        ]);
    }

    /**
     * Уменьшает фото и пересохраняет в JPEG: вместе с этим пропадает EXIF с геометкой.
     */
    private function encode(UploadedFile $file): string
    {
        return (string) ImageManager::gd()
            ->read($file->getRealPath())
            ->scaleDown(self::PHOTO_SIZE, self::PHOTO_SIZE)
            ->toJpeg(82);
    }
}
