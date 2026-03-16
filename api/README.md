# VPN Admin Panel — Полная установка

## Структура файлов

Скопируй всё в корень своего Vercel-проекта:

```
api/
  sub.js              ← заменить (блокирует старый эндпоинт)
  u/
    [token].js        ← новый эндпоинт подписок
  admin/
    users.js          ← CRUD пользователей
    servers.js        ← список серверов из vpn_keys
public/
  admin.html          ← панель управления (открываешь в браузере)
vercel.json           ← роутинг
```

---

## Шаг 1 — Firestore: создать коллекцию vpn_users

В Firebase Console → Firestore Database → создай коллекцию `vpn_users`.
Документы будут создаваться автоматически через панель.

**Структура документа пользователя:**
```
name:    "Иван Петров"
contact: "@ivan"
token:   "a1b2c3..."         ← уникальный токен
servers: '["finland","USA"]' ← JSON-строка с ID серверов из vpn_keys
start:   "2026-03-01"
days:    "30"
status:  "active"            ← active | paused
note:    ""
```

---

## Шаг 2 — Firestore: правила доступа

Firebase Console → Firestore → Rules. Для работы REST API без авторизации:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /vpn_keys/{doc} {
      allow read: if true;   // публичное чтение ключей
    }
    match /vpn_users/{doc} {
      allow read, write: if true; // временно — потом закрыть через API key
    }
  }
}
```

> Для продакшена рекомендуется добавить Firebase Admin SDK и хранить
> сервисный ключ в Vercel Environment Variables.

---

## Шаг 3 — Vercel: переменные окружения

Vercel Dashboard → твой проект → Settings → Environment Variables:

```
ADMIN_KEY = придумай_секретный_пароль
```

---

## Шаг 4 — Деплой

```bash
git add .
git commit -m "vpn admin panel"
git push
```

Vercel задеплоит автоматически.

---

## Шаг 5 — Открыть панель

Открой в браузере:
```
https://vpnjr.vercel.app/public/admin.html
```

Введи:
- **Admin Key** = значение `ADMIN_KEY` из Vercel
- **Base URL** = https://vpnjr.vercel.app

---

## Как пользоваться

### Добавить пользователя
1. Нажать **+ Добавить**
2. Заполнить имя, контакт, дату начала, длительность
3. Вкладка **Серверы** — выбрать доступные серверы
4. Вкладка **Ссылка** — скопировать и отправить пользователю
5. Сохранить

### Ссылка для пользователя
```
https://vpnjr.vercel.app/api/u/ЕГО_ТОКЕН
```
Вставляется в Hiddify / v2rayN / Shadowrocket как Remote Profile.

### Что происходит при истечении подписки
- `/api/u/токен` вернёт `403 Subscription expired`
- Клиент перестанет обновлять профиль
- В панели статус сменится на "Истекла" автоматически

### Продление подписки
Открыть редактирование → изменить дату начала или количество дней → Сохранить.

---

## Серверы (vpn_keys)

Серверы управляются напрямую в Firebase Console.
ID документа = название сервера (`finland`, `USA`, `3rd` и т.д.)

Поля документа:
```
key:  "vless://..."
name: "Vless Finland #1 🇫🇮"
createdAt: "07.03.2026 18:07"
```
