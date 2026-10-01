<?php

namespace App\Enums;

enum PointStatus: string
{
    case Pending = 'pending';
    case Snowed = 'snowed';
    case InWork = 'in_work';
    case Cleared = 'cleared';
    case Rejected = 'rejected';
    case Archived = 'archived';

    /**
     * Статусы, которые видны на карте всем. Остальные видит только автор или модератор.
     *
     * @return list<self>
     */
    public static function public(): array
    {
        return [self::Snowed, self::InWork, self::Cleared];
    }
}
