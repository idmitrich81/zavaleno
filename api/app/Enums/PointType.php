<?php

namespace App\Enums;

enum PointType: string
{
    case Yard = 'yard';
    case Parking = 'parking';
    case Street = 'street';
    case Sidewalk = 'sidewalk';
    case Roof = 'roof';
}
