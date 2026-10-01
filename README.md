# Завалено

Народная карта заваленных снегом мест Томска: zavaleno.ru/tomsk.

- `web/` — фронтенд: Vite + React + TypeScript, MapLibre GL с картой на данных OpenStreetMap, которая лежит на нашем же домене.
- `api/` — бэкенд: Laravel 12 (PHP 8.2+), локально SQLite, на хостинге reg.ru MySQL.
- `docs/prototype.html` — кликабельный прототип: эталон UX, статусов и текстов, но не основа кода.

## Запуск

Нужны PHP 8.2+ с Composer и Node.js 22.12+.

```bash
cd api
composer install
cp .env.example .env && php artisan key:generate
php artisan migrate --seed   # город Томск и демо-точки из прототипа
php artisan storage:link     # фото отметок отдаются из storage/app/public
php artisan serve            # http://127.0.0.1:8000
```

```bash
cd web
npm install
npm run dev                  # запросы /api проксируются на 127.0.0.1:8000
```

## Карта

Подложка — один файл `web/public/map/tomsk.pmtiles` (вырезка Томска из сборки [Protomaps](https://protomaps.com) на данных OpenStreetMap, около 15 МБ). Рядом лежат шрифты и значки. Ключей, лимитов и сторонних серверов нет; браузер запрашивает из файла только нужные фрагменты (HTTP Range).

Файл карты в git не хранится. Собрать его:

```bash
# утилита: https://github.com/protomaps/go-pmtiles/releases, положить в tools/pmtiles
# дата в адресе — любая свежая сборка со страницы https://maps.protomaps.com/builds/
tools/pmtiles extract https://build.protomaps.com/20260930.pmtiles web/public/map/tomsk.pmtiles \
  --bbox=84.70,56.33,85.30,56.64 --maxzoom=15
```

Границы вырезки совпадают с `bounds` города в `web/src/lib/cities.ts`. Для нового города нужен свой файл `{slug}.pmtiles`. При выкладке файл загружается на хостинг в `map/` отдельно от сборки фронтенда.

Подпись «© OpenStreetMap» на карте обязательна по лицензии данных.

Демо-точки (`api/database/seeders/data/tomsk.json`) вымышленные, координаты примерные; сидер добавляет их только в окружении `local`.

## Модерация

Пока нет Telegram-бота, отметки публикуются из консоли:

```bash
cd api
php artisan points:moderate              # очередь на проверке
php artisan points:moderate 17 approve   # опубликовать; reject — отклонить
```

Размытие лиц и номеров ещё не сделано: такие фото пока нужно отклонять.

## Проверки

```bash
cd api && php artisan test && vendor/bin/pint --test
cd web && npm run build && npm run lint
```
