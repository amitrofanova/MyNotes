# Архитектура MyNotes

Клиентское SPA. Данных на сервере нет; источник правды — `localStorage`.

## Страницы

Ровно две:

- `/` — список сохранённых заметок
- `/notes/[id]` — создание и редактирование. `id=new` создаёт UUID и дальше живёт как черновик

## Стор vs сессия редактора

Pinia `notes` хранит только сохранённые заметки (CRUD + persist).

Черновик, рабочая копия и undo/redo живут в сессии редактора (`useNoteEditor`), не в глобальном сторе. Save пишет в стор и чистит историю. Cancel историю чистит, стор не трогает.

## История

Патчи, не полные копии заметки. Лимит 50. Типы: `setTitle`, `setTodoText`, `toggleTodo`, `addTodo`, `removeTodo`.

Непрерывный ввод в одно поле — одна запись (blur или пауза ~400ms). Чекбокс / add / delete — атомарно. Новое изменение после undo очищает redo.

## Storage keys

- `mynotes:data` — `{ schemaVersion: 1, notes: Note[] }`. Запись с debounce ~1s и flush на `pagehide` / `visibilitychange`, не на каждый символ.
- `mynotes:draft:{id}` — черновик незасохранённого редактирования. Debounce ~400ms и flush на `pagehide` / `visibilitychange`. `/notes/new` сразу пишет placeholder, чтобы UUID переживал reload.

## Черновики

Если после reload черновик отличается от сохранённой версии — модалка «Восстановить / Отбросить».

## Мультитаб

`storage` event. Если открытую заметку удалили в другой вкладке — модалка и редирект на `/`.

## Пустые поля

Пустой заголовок допустим, в списке — «Без названия». Пустой пункт не добавляется; пустой текст после blur удаляет пункт одним шагом истории.

## Docker

`nuxt generate` кладёт статику в `.output/public`. Образ: Node-сборка → `nginx:alpine`. SPA-fallback — `try_files` на `200.html`, чтобы прямой заход на `/notes/:id` не отдавал 404. `docker compose up` слушает порт 8080.

## Запрещено

UI-киты (Vuetify, PrimeVue, Element и т.п.), библиотеки undo/redo, `pinia-plugin-persistedstate` и аналоги, `alert` / `confirm`.
