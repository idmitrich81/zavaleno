<?php

namespace App\Http\Controllers;

use App\Enums\PointStatus;
use App\Models\City;
use App\Models\Point;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * «Я тоже вижу»: житель без регистрации подтверждает, что место завалено.
 */
class ConfirmationController extends Controller
{
    public function store(Request $request, City $city, Point $point): JsonResponse
    {
        $device = $this->device($request);
        // Убранное место подтверждать нечем: для него будет «Снова завалило».
        abort_unless(in_array($point->status, [PointStatus::Snowed, PointStatus::InWork], true), 409);

        DB::transaction(function () use ($point, $device) {
            if ($point->confirmations()->firstOrCreate(['device_id' => $device])->wasRecentlyCreated) {
                $point->increment('confirmations_count');
            }
        });

        return $this->state($point, true);
    }

    public function destroy(Request $request, City $city, Point $point): JsonResponse
    {
        $device = $this->device($request);

        DB::transaction(function () use ($point, $device) {
            if ($point->confirmations()->where('device_id', $device)->delete()) {
                $point->decrement('confirmations_count');
            }
        });

        return $this->state($point, false);
    }

    private function device(Request $request): string
    {
        $device = (string) $request->header('X-Device-Id');
        abort_unless(Str::isUuid($device), 422, 'Нужен заголовок X-Device-Id с UUID устройства.');

        return $device;
    }

    private function state(Point $point, bool $confirmed): JsonResponse
    {
        return response()->json(['data' => [
            'confirmations' => $point->refresh()->confirmations_count,
            'confirmedByMe' => $confirmed,
        ]]);
    }
}
