# Завалено

Народная карта заваленных снегом мест Томска: zavaleno.ru/tomsk.

- `web/` — фронтенд: Vite + React + TypeScript, Leaflet + markercluster, тайлы MapTiler.
- `api/` — бэкенд (PHP + MySQL под shared-хостинг reg.ru), ещё не начат.
- `docs/prototype.html` — кликабельный прототип: эталон UX, статусов и текстов, но не основа кода.

## Запуск фронтенда

```bash
cd web
npm install
cp .env.example .env.local   # вписать ключ MapTiler
npm run dev
```

Без ключа MapTiler в режиме разработки карта берёт тайлы с публичного сервера OSM; в продакшене ключ обязателен.

Пока бэкенда нет, точки читаются из `web/public/seed/tomsk.json`. Это демо-данные из прототипа, координаты примерные.
