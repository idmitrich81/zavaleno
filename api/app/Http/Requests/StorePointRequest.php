<?php

namespace App\Http\Requests;

use App\Enums\PointType;
use App\Models\City;
use App\Support\Geo;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StorePointRequest extends FormRequest
{
    /** Отметки дальше от центра города считаем ошибкой или мусором. */
    private const CITY_RADIUS_M = 40_000;

    public function authorize(): bool
    {
        return Str::isUuid($this->device());
    }

    public function device(): string
    {
        return (string) $this->header('X-Device-Id');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'photos' => ['required', 'array', 'min:1', 'max:3'],
            'photos.*' => ['image', 'mimes:jpeg,png,webp', 'max:10240'],
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
            'address' => ['required', 'string', 'max:255'],
            'district' => ['nullable', 'string', 'max:100'],
            'type' => ['required', Rule::enum(PointType::class)],
            'comment' => ['nullable', 'string', 'max:1000'],
            'contact' => ['nullable', 'string', 'max:100'],
            'force' => ['boolean'],
        ];
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [function (Validator $validator) {
            /** @var City $city */
            $city = $this->route('city');
            if ($validator->errors()->hasAny(['lat', 'lng'])) {
                return;
            }
            if (Geo::distanceMeters($city->lat, $city->lng, (float) $this->lat, (float) $this->lng) > self::CITY_RADIUS_M) {
                $validator->errors()->add('lat', 'Точка слишком далеко от города.');
            }
        }];
    }
}
