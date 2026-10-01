<?php

namespace App\Http\Resources;

use App\Models\PointEvent;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin PointEvent
 */
class PointEventResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'kind' => $this->kind,
            'text' => $this->text,
            'createdAt' => $this->created_at,
        ];
    }
}
