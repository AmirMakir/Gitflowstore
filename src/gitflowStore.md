# GitFlow Store — Product Idea & Plan

## Проблема

Разработчики, использующие AI-агенты (Claude Code, Copilot CLI, Aider) в IDE, сталкиваются с фундаментальной проблемой: **один рабочий каталог — одна ветка — один агент.** Переключение между задачами требует stash, checkout, потерю контекста агента, пересборку зависимостей. Это убивает поток работы и создаёт ошибки.

Git worktrees решают эту проблему элегантно — каждая ветка живёт в своей директории. Но worktrees используют меньше 5% разработчиков, потому что:

- Управление — только через CLI
- Нет визуализации состояния
- Рутина при создании (копировать .env, ставить зависимости, настраивать IDE)
- Worktrees накапливаются и захламляют систему
- Ни одно существующее расширение не предлагает полноценный UI — только обёртки над Command Palette

---

## Решение

**GitFlow Store** — расширение для VS Code / Cursor с визуальным интерфейсом для управления git worktrees, заточенное под параллельную работу с AI-агентами.

Ключевая метафора: **каждый worktree — это изолированное рабочее пространство** со своей веткой, своим состоянием и своей AI-сессией. Как вкладки в браузере, только для веток.

---

## Целевая аудитория

**Первичная:** Разработчики, активно использующие Claude Code / AI-агенты в Cursor или VS Code. Работают над несколькими задачами параллельно, часто переключаются между ветками.

**Вторичная:** Любые разработчики, которые хотели бы использовать worktrees, но не хотят разбираться с CLI. Тимлиды, делающие ревью нескольких PR одновременно.

**Размер рынка:** VS Code — 15M+ активных пользователей. Cursor — 1M+. Git worktree — растущий тренд (статьи, видео, обсуждения на HN в 2024-2025).

---

## Ключевые фичи

### MVP (v0.1) — Core Worktree UI

**1. Visual Worktree Dashboard**
Sidebar-панель (Webview) с карточками всех worktrees. Каждая карточка показывает:
- Название ветки
- Путь на диске
- Количество uncommitted changes
- Ahead/behind от remote
- Последний коммит (автор, время, сообщение)
- Статус: active / idle / merged

**2. One-Click Worktree Creation**
Кнопка "New Worktree" открывает визуальную форму:
- Выбор ветки из списка (с поиском и фильтрацией)
- Или создание новой ветки от выбранной base branch
- Автоматическое именование директории
- Чекбоксы: скопировать .env, запустить install, открыть в новом окне

**3. Quick Switch**
Горячая клавиша (Ctrl+Shift+W) открывает fuzzy-поиск по worktrees — как Ctrl+P для файлов, только для рабочих пространств. Показывает preview: ветку, последние изменения.

**4. Cleanup Manager**
Визуальный список worktrees с фильтрами:
- Merged ветки (безопасно удалять)
- Давно не использовавшиеся
- С незакоммиченными изменениями (предупреждение)
Массовое удаление одной кнопкой.

**5. Auto-Setup Pipeline**
Настраиваемый pipeline при создании worktree:
- Копирование файлов (.env, .env.local, конфиги)
- Symlink для тяжёлых директорий (node_modules, .venv)
- Post-create команда (npm install, pip install)
- Всё конфигурируется в settings.json

### v0.2 — AI Agent Integration

**6. Per-Worktree AI Sessions**
Каждый worktree может иметь привязанную AI-сессию:
- Автоматический запуск Claude Code в терминале worktree
- Сессия сохраняется при переключении
- Visual indicator: какой агент активен в каком worktree
- Возможность запускать разные агенты (Claude Code, Aider) в разных worktrees

**7. Task Context Cards**
К каждому worktree можно привязать:
- Описание задачи (текст / ссылка на issue)
- Промпт для AI-агента
- При открытии worktree — агент получает контекст автоматически

### v0.3 — Collaboration & Polish

**8. Worktree Templates**
Сохраняемые пресеты: "Frontend feature", "Hotfix", "Refactor" — с предустановленными pipeline и настройками.

**9. Branch Comparison View**
Side-by-side diff между любыми двумя worktrees. Полезно для ревью и мержа.

**10. Status Bar Integration**
Компактный виджет в status bar: текущий worktree, quick switch dropdown, индикатор активных AI-сессий.

---

## Конкурентный ландшафт

| Продукт | UI | Auto-setup | AI-интеграция | Cleanup |
|---|---|---|---|---|
| VS Code built-in | QuickPick меню | Нет | Нет | Нет |
| Git Worktree Manager (jackiotyu) | TreeView + QuickPick | Copy patterns, post-cmd | Нет | Нет |
| Git Worktrees (alexiszamanidis) | QuickPick | Нет | Нет | Нет |
| GitLens | TreeView (платно) | Нет | Нет | Нет |
| **GitFlow Store** | **Webview Dashboard** | **Full pipeline** | **Per-worktree AI** | **Visual cleanup** |

**Наше уникальное преимущество:** единственное расширение с полноценным визуальным UI и нативной AI-агент интеграцией.

---

## Техническая архитектура

### Стек

- **Extension host:** TypeScript, VS Code Extension API
- **UI:** React + Tailwind CSS внутри Webview
- **Git operations:** child_process → git CLI (надёжнее, чем libgit2)
- **State management:** Extension globalState + файловый кэш
- **Communication:** Webview ↔ Extension через postMessage

### Структура проекта

```
gitflow-store/
├── src/
│   ├── extension.ts                 # Точка входа, регистрация команд
│   ├── core/
│   │   ├── worktreeService.ts       # CRUD операции над worktrees
│   │   ├── gitService.ts            # Git операции (branches, status, diff)
│   │   ├── setupPipeline.ts         # Auto-setup при создании
│   │   └── cleanupService.ts        # Анализ и удаление worktrees
│   ├── ai/
│   │   ├── sessionManager.ts        # Управление AI-сессиями
│   │   ├── claudeCodeBridge.ts      # Интеграция с Claude Code CLI
│   │   └── contextInjector.ts       # Передача контекста задачи
│   ├── ui/
│   │   ├── sidebarProvider.ts       # WebviewViewProvider для sidebar
│   │   ├── quickPick.ts             # Fuzzy search worktrees
│   │   └── statusBar.ts             # Status bar виджет
│   └── utils/
│       ├── fileOps.ts               # Копирование, symlinks
│       └── config.ts                # Чтение настроек
├── webview-ui/                       # React приложение для Webview
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── WorktreeCard.tsx      # Карточка worktree
│   │   │   ├── WorktreeList.tsx      # Список/грид карточек
│   │   │   ├── CreateDialog.tsx      # Форма создания
│   │   │   ├── CleanupView.tsx       # Менеджер очистки
│   │   │   ├── BranchPicker.tsx      # Визуальный выбор ветки
│   │   │   └── AiSessionBadge.tsx    # Индикатор AI-сессии
│   │   └── hooks/
│   │       ├── useWorktrees.ts       # Данные worktrees
│   │       └── useVSCodeApi.ts       # Мост к extension
│   ├── package.json
│   └── vite.config.ts
├── package.json                      # Extension manifest
├── tsconfig.json
└── README.md
```

### Ключевые технические решения

**Git операции через CLI, а не API.**
VS Code Git API ограничен и не полностью поддерживает worktrees. Прямые вызовы `git worktree add/remove/list` через child_process надёжнее и дают полный контроль.

**React в Webview, а не TreeView.**
TreeView слишком ограничен для rich UI. Webview с React позволяет делать карточки, формы, анимации, drag & drop. Это главное отличие от конкурентов.

**Polling + FileSystemWatcher для состояния.**
Комбинация: FSWatcher на .git директорию для мгновенных обновлений + polling каждые 30 секунд для ahead/behind (требует network call).

**Symlink стратегия для node_modules.**
Вместо полной установки зависимостей в каждом worktree — опциональный symlink на node_modules из основного worktree. Экономит гигабайты и минуты. С предупреждением о рисках.

---

## Дорожная карта

### Фаза 1: Foundation (Неделя 1-2)

- [ ] Scaffold расширения (yeoman generator)
- [ ] Настроить Webview с React + Vite
- [ ] Реализовать gitService: list worktrees, branch info, status
- [ ] Реализовать worktreeService: create, remove, open
- [ ] Базовый UI: список worktrees как карточки
- [ ] Кнопка создания worktree с выбором ветки
- [ ] Quick switch через Command Palette

**Результат:** Рабочее расширение, которое визуально показывает worktrees и позволяет создавать/удалять/переключаться.

### Фаза 2: Automation (Неделя 3)

- [ ] Auto-setup pipeline (copy files, symlinks, post-create cmd)
- [ ] Настройки в settings.json и UI
- [ ] Cleanup manager: определение merged/stale worktrees
- [ ] Batch удаление с подтверждением
- [ ] Real-time обновление статуса (changes, ahead/behind)

**Результат:** Расширение, которое автоматизирует рутину и помогает поддерживать порядок.

### Фаза 3: AI Integration (Неделя 4)

- [ ] SessionManager: привязка AI-сессии к worktree
- [ ] Автоматический запуск Claude Code в терминале worktree
- [ ] Suspend/resume сессий при переключении
- [ ] Task context: описание задачи + промпт привязаны к worktree
- [ ] UI индикаторы активных AI-сессий

**Результат:** Полноценный AI-aware worktree manager — уникальный продукт на рынке.

### Фаза 4: Polish & Launch (Неделя 5)

- [ ] Status bar виджет
- [ ] Worktree templates
- [ ] Keyboard shortcuts
- [ ] Онбординг для новых пользователей
- [ ] README, скриншоты, демо-видео
- [ ] Публикация в VS Code Marketplace + Product Hunt

