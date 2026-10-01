import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  worker: { format: 'es' },
  server: {
    // В разработке API отдаёт `php artisan serve`; на хостинге фронтенд и API живут на одном домене.
    proxy: { '/api': 'http://127.0.0.1:8000', '/storage': 'http://127.0.0.1:8000' },
  },
})
