<?php

namespace App\Http\Resources;

use App\Models\Point;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Point
 */
class PointResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'address' => $this->address,
            'district' => $this->district,
            'lat' => $this->lat,
            'lng' => $this->lng,
            'type' => $this->type,
            'status' => $this->status,
            'createdAt' => $this->created_at,
            'statusChangedAt' => $this->status_changed_at,
            'confirmations' => $this->confirmations_count,
        ];
    }
}
