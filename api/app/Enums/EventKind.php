<?php

namespace App\Enums;

enum EventKind: string
{
    case Submitted = 'submitted';
    case Created = 'created';
    case Confirmed = 'confirmed';
    case InWork = 'in_work';
    case Cleared = 'cleared';
    case Reopened = 'reopened';
}
