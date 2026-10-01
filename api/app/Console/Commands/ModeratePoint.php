<?php

namespace App\Console\Commands;

use App\Enums\EventKind;
use App\Enums\PointStatus;
use App\Models\Point;
use Illuminate\Console\Command;

/**
 * Временная модерация из консоли, пока нет Telegram-бота.
 */
class ModeratePoint extends Command
{
    protected $signature = 'points:moderate {point? : id отметки} {decision? : approve или reject}';

    protected $description = 'Показать очередь отметок на проверке, опубликовать или отклонить отметку';

    public function handle(): int
    {
        if (! $this->argument('point')) {
            $this->table(
                ['id', 'адрес', 'тип', 'фото', 'комментарий', 'контакт', 'отправлена'],
                Point::where('status', PointStatus::Pending)->withCount('photos')->oldest()->get()
                    ->map(fn (Point $p) => [$p->id, $p->address, $p->type->value, $p->photos_count, $p->comment, $p->contact, $p->created_at]),
            );

            return self::SUCCESS;
        }

        $point = Point::find($this->argument('point'));
        if (! $point || $point->status !== PointStatus::Pending) {
            $this->error('Отметки на проверке с таким id нет.');

            return self::FAILURE;
        }

        match ($this->argument('decision')) {
            'approve' => $this->approve($point),
            'reject' => $point->update(['status' => PointStatus::Rejected, 'status_changed_at' => now()]),
            default => $this->error('Решение: approve или reject.'),
        };

        $this->info("Отметка {$point->id}: {$point->refresh()->status->value}");

        return self::SUCCESS;
    }

    private function approve(Point $point): void
    {
        $point->update(['status' => PointStatus::Snowed, 'status_changed_at' => now()]);
        $point->events()->create(['kind' => EventKind::Created, 'text' => 'Отметку добавили, фото проверено']);
    }
}
