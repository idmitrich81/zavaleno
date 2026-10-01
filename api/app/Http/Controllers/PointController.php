<?php

namespace App\Http\Controllers;

use App\Http\Resources\PointResource;
use App\Models\City;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PointController extends Controller
{
    public function index(City $city): AnonymousResourceCollection
    {
        return PointResource::collection($city->points()->public()->latest()->get());
    }
}
