# Завалено

Народная карта заваленных снегом мест Томска: zavaleno.ru/tomsk.

- `web/` — фронтенд: Vite + React + TypeScript, Leaflet + markercluster, тайлы MapTiler.
- `api/` — бэкенд: Laravel 12 (PHP 8.2+), локально SQLite, на хостинге reg.ru MySQL.
- `docs/prototype.html` — кликабельный прототип: эталон UX, статусов и текстов, но не основа кода.

## Запуск

Нужны PHP 8.2+ с Composer и Node.js 22.12+.

```bash
cd api
composer install
cp .env.example .env && php artisan key:generate
php artisan migrate --seed   # город Томск и демо-точки из прототипа
php artisan serve            # http://127.0.0.1:8000
```

```bash
cd web
npm install
cp .env.example .env.local   # вписать ключ MapTiler
npm run dev                  # запросы /api проксируются на 127.0.0.1:8000
```

Без ключа MapTiler в режиме разработки карта берёт тайлы с публичного сервера OSM; в продакшене ключ обязателен.

Демо-точки (`api/database/seeders/data/tomsk.json`) вымышленные, координаты примерные; сидер добавляет их только в окружении `local`.

## Проверки

```bash
cd api && php artisan test && vendor/bin/pint --test
cd web && npm run build && npm run lint
```
