# MyNotes

SPA для заметок на Nuxt 4 (Composition API, TypeScript strict, Pinia, SCSS).

## Стек

- Nuxt 4, `ssr: false`, статическая генерация (`nuxt generate`)
- Vue 3 Composition API, TypeScript strict
- Pinia (без persist-плагинов)
- SCSS/SASS, без UI-библиотек
- Vitest (`tests/unit`, environment `node`)
- ESLint (`@nuxt/eslint`)

## Разработка

Нужны Node 22+ и pnpm.

```bash
pnpm install
pnpm dev
```

Приложение: `http://localhost:3000`.

```bash
pnpm lint
pnpm typecheck
pnpm test
```
