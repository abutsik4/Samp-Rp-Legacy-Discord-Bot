<p align="center">
  <img src="assets/readme-logo.svg" alt="SRP Legacy" width="640" />
</p>

<p align="center">
  Discord bot + Next.js admin panel for <strong>SRP Legacy</strong> — full faction management, button-based role requests, form-based verification, channel guide embeds, and auto-role automation.
</p>

<p align="center">
  <img src="assets/logo-bot.svg" alt="SRP Legacy bot logo" width="180" />
  <img src="assets/logo-discord-server.svg" alt="SRP Legacy Discord server logo" width="180" />
</p>

---

## Features

| Area | Description |
|---|---|
| **Faction structure** | 10-faction Discord server setup — auto-creates categories, text/voice channels, and hierarchical roles (`Лидер`, `Зам. Лидера`, `Участник`) per faction |
| **Form-based verification** | Players fill a modal form (nickname, forum link, about); admins approve/deny in a dedicated channel with button UI |
| **Role requests** | Button-based flow: player clicks → selects faction & role level → approval embed → leaders/deputies/curators approve → bot grants role automatically |
| **Role removal** | Dropdown-based removal per faction (leaders remove deputies/members, deputies remove members, curators & staff remove all applicable) |
| **Admin hierarchy** | 5-tier hoisted admin roles (Owner → Head Admin → Deputy Head → Admin → Moderator); senior admins have full rights except channel/category management |
| **Curator roles** | 6 consolidated hoisted "Следящий" roles with real channel permissions — Mayor/Court, FBI, SAPD (LSPD+SFPD+LVPD), Army, MOH, Inst |
| **Temp voice channels** | Join-to-create system — faction members join "➕ Создать канал" → bot creates a private `🔉 Username` channel → auto-deletes when empty |
| **Admin guide** | Auto-generated FAQ/overview posted to admin announcements channel covering all features, permissions, and workflows |
| **WebUI dashboard** | Next.js admin panel (port 5031) with dark glassmorphism UI — manages guides, embeds, auto-roles, faction viewer, and role requests |
| **Channel guides** | Dynamic guide embeds per faction — shows channels, roles, descriptions; send/edit directly from WebUI to Discord |
| **Embed builder** | Create, edit, duplicate, and send rich embeds to any Discord channel; per-embed edit/delete for multi-embed messages |
| **Auto-roles** | Configure roles automatically assigned to new members via WebUI |
| **Recruitment workflow** | Policy-driven architecture via `recruitment-architecture.json` |
| **Health checks** | Systemd timers, Telegram notifications, and healthcheck scripts |

---

## Quick start

### 1) Install

```bash
npm ci
cd webui && npm ci
```

### 2) Configure environment

```bash
cp .env.example .env
```

Required variables in `.env`:

| Variable | Purpose |
|---|---|
| `DISCORD_TOKEN` | Bot token |
| `GUILD_ID` | Target Discord server |
| `PORT` | Express API port (default `5032`) |
| `WEBUI_AUTH_TOKEN` | Shared secret for WebUI ↔ API auth |

WebUI environment (`webui/.env.local`):

| Variable | Purpose |
|---|---|
| `DISCORD_API_URL` | Bot API URL (default `http://localhost:5032`) |
| `WEBUI_AUTH_TOKEN` | Must match the bot's `.env` value |

### 3) Run

```bash
# Bot (Express API on port 5032)
node src/index.js

# WebUI (Next.js on port 5031)
cd webui && npm run build && npm start -- -p 5031
```

### 4) Production (systemd)

```bash
sudo cp srp-legacy-bot.service srp-legacy-webui.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now srp-legacy-bot srp-legacy-webui
```

---

## Architecture

```
┌──────────────────┐       ┌──────────────────┐       ┌─────────────┐
│  Next.js WebUI   │──────▶│  Express API     │──────▶│  Discord    │
│  :5031           │ proxy │  :5032           │  d.js │  Gateway    │
│  (Cloudflare)    │  routes│  (index.js)      │       │             │
└──────────────────┘       └──────────────────┘       └─────────────┘
```

- **WebUI** → Next.js App Router with proxy API routes (`/api/proxy/*`) that forward to the Express backend
- **Bot** → Discord.js v14 client + Express server exposing JSON API endpoints
- **Auth** → All proxy routes include `WEBUI_AUTH_TOKEN` header

---

## Faction system

10 factions deployed via `factionManager.js`:

| # | Faction | Tag | Emoji |
|---|---------|-----|-------|
| 1 | Мэрия | MAYOR | 🏛️ |
| 2 | ФБР | FBI | 🕵️ |
| 3 | ЛСПД | LSPD | 🚓 |
| 4 | СФПД | SFPD | 🚓 |
| 5 | ЛВПД | LVPD | 🚓 |
| 6 | Армия ЛВ | ARMY-LV | 🪖 |
| 7 | Армия СФ | ARMY-SF | 🪖 |
| 8 | Минздрав | MOH | 🚑 |
| 9 | Инструкторы | INST | 🏫 |
| 10 | Суд | COURT | ⚖️ |

Each faction auto-creates:
- **Category**: `{emoji} {title}`
- **Text channels**: 📌│объявления, 💬│чат channels, 🗑️│управление-ролями
- **Voice channels**: 🔊 Совещание, 🎙️ Рабочая, 🤝 Голос 1×1 (2 users), 👥 Голос 2×2 (4 users)
- **Temp voice**: ➕ Создать канал (join-to-create; auto-deleted when empty)
- **Roles**: `{emoji} {TAG} │ Лидер`, `{emoji} {TAG} │ Зам. Лидера`, `{emoji} {TAG} │ Участник`

### Global roles (14 total)

| Role | Type | Hoisted |
|---|---|---|
| 🛠️ Владелец | Admin hierarchy | ✅ |
| ⭐ Гл. Администратор | Admin hierarchy | ✅ |
| 👑 Зам. Гл. Админа | Admin hierarchy | ✅ |
| 🛡️ Админ | Admin hierarchy | ✅ |
| 🔨 Модератор | Admin hierarchy | ✅ |
| 🏛️ Следящий за Mayor/Court | Curator (Мэрия + Суд) | ✅ |
| 🕵️ Следящий за FBI | Curator (ФБР) | ✅ |
| 🚓 Следящий за SAPD | Curator (ЛСПД + СФПД + ЛВПД) | ✅ |
| 🪩 Следящий за Army | Curator (Армия ЛВ + СФ) | ✅ |
| 🚑 Следящий за MOH | Curator (Минздрав) | ✅ |
| 🏫 Следящий за Inst | Curator (Инструкторы) | ✅ |
| ✅ Верифицирован | General | — |
| ❌ Не верифицирован | General | — |
| 🤖 Бот | General | — |

### Senior admin permissions

| Role | Channel access | Can manage channels/categories |
|---|---|---|
| 🛠️ Владелец | All channels | ❌ (ManageChannels & ManageGuild removed) |
| ⭐ Гл. Администратор | All channels | ❌ |
| 👑 Зам. Гл. Админа | All channels | ❌ |
| 🛡️ Админ | All channels | Unchanged (has full admin perms) |

### Curator role permissions

Curators have **actual channel overwrites** on their assigned faction categories:
- **View** all channels in their faction(s)
- **Send messages**, **manage messages**, **mute members** in text channels
- **Connect**, **speak**, **mute**, **move members** in voice channels

| Curator role | Factions covered |
|---|---|
| 🏛️ Следящий за Mayor/Court | MAYOR, COURT |
| 🕵️ Следящий за FBI | FBI |
| 🚓 Следящий за SAPD | LSPD, SFPD, LVPD |
| 🪩 Следящий за Army | ARMY-LV, ARMY-SF |
| 🚑 Следящий за MOH | MOH |
| 🏫 Следящий за Inst | INST |

Deploy from WebUI (`/factions`) or via the bot API.

> **Migration:** On deploy, old individual curator roles (Следящий за LSPD/SFPD/LVPD/Mayor/Court) are automatically migrated — members are moved to the new consolidated role and old roles are deleted.

---

## Verification system (form-based)

1. Player reads rules in **📋│правила-верификации**
2. Clicks **Пройти верификацию** button in **✅│верификация**
3. Fills a modal form: game nickname (`Имя_Фамилия`), forum profile link, about self
4. Request appears in **📋│заявки-верификации** (admin-only channel)
5. Staff clicks **✅ Одобрить** or **❌ Отклонить** on the embed
6. On approve: bot grants `✅ Верифицирован`, removes `❌ Не верифицирован`, sets nickname, DMs the player
7. On deny: bot DMs the player with the rejection reason

**Who can process verifications:** Owner, Head Admin, Deputy Head Admin, Admin, Moderator, Curators

---

## Role requests (button-based)

1. Player clicks the **Запросить роль** button in **📩│запрос-роли**
2. Selects a faction and role level from the dropdown
3. Bot posts an approval embed to the faction's 📌│объявления channel
4. Authorized users click **Одобрить** or **Отклонить**
5. Bot auto-grants or denies the role and posts an announcement

### Approval permissions

| Requested role | Who can approve |
|---|---|
| 👥 Участник | Staff + Curator + 👑 Лидер + 👔 Зам. Лидера |
| 👔 Зам. Лидера | Staff + Curator + 👑 Лидер |
| 👑 Лидер | Staff only |

### Role removal permissions

| Your role | Can remove |
|---|---|
| Staff | 👑 Лидер + 👔 Зам. Лидера + 👥 Участник |
| Curator (for their factions) | 👔 Зам. Лидера + 👥 Участник |
| 👑 Лидер | 👔 Зам. Лидера + 👥 Участник |
| 👔 Зам. Лидера | 👥 Участник |

**Staff** = Owner, Head Admin, Deputy Head Admin, Admin, Moderator
**Curator** = Следящий за … roles — have staff-like permissions scoped to their assigned factions

Legacy text commands are still supported:
- `!роль <лидер|зам|база> @user <reason>` in `📝│запросы-ролей`
- `!одобрить <ID>` / `!отклонить <ID> <reason>` in `🔐│одобрение-ролей`

---

## WebUI pages

| Route | Description |
|---|---|
| `/` | Dashboard overview |
| `/factions` | Faction structure viewer & deploy |
| `/guides` | Channel guide embeds — per-faction dynamic content, send/edit to Discord |
| `/embeds` | Embed builder — create, edit, duplicate, send, update sent messages |
| `/roles` | Auto-roles configuration |
| `/role-requests` | Role request management & panel setup |
| `/stats` | Server statistics |

---

## API endpoints (Express, port 5032)

| Method | Path | Description |
|---|---|---|
| GET | `/api/channels` | List guild text channels |
| GET | `/api/roles` | List guild roles |
| GET | `/api/auto-roles` | Get auto-role configuration |
| POST | `/api/auto-roles` | Save auto-role configuration |
| GET | `/api/structure/live` | Live faction structure from Discord |
| GET | `/api/structure/status` | Deployment progress status |
| POST | `/api/structure/deploy` | Deploy full Discord structure |
| POST | `/api/send-embed` | Send embed to a channel |
| POST | `/api/edit-embed` | Edit a previously sent embed |
| GET | `/api/role-requests` | List pending role requests |
| POST | `/api/role-request/approve` | Approve a role request |
| POST | `/api/role-request/deny` | Deny a role request |
| POST | `/api/role-request/panel` | Deploy role request panel button |
| POST | `/api/removal-panel` | Deploy role removal panel |
| POST | `/api/verification-panel` | Deploy verification button panel |
| POST | `/api/rules-panel` | Deploy verification rules embed |
| POST | `/api/pending-panel` | Deploy pending verifications panel |
| POST | `/api/admin-guide` | Post admin guide/FAQ to announcements channel |
| POST | `/api/remove-embed` | Remove a single embed from a multi-embed message |
| GET | `/api/faction-members` | List members with faction roles |

All endpoints require `Authorization: Bearer <WEBUI_AUTH_TOKEN>` header.

---

## Project structure

```
├── src/
│   ├── index.js                  # Main bot + Express API server
│   ├── registerCommands.js       # Slash command registration
│   ├── commands/                 # Slash commands (admin, fun, util)
│   └── utils/
│       ├── adminGuide.js         # Admin guide/FAQ embed generator
│       ├── embedFactory.js       # Embed template helpers
│       ├── factionManager.js     # 10-faction Discord structure deployment + curator migration
│       ├── roleRequestManager.js # Button-based role request handler (staff + curator auth)
│       ├── tempVoiceManager.js   # Join-to-create temporary voice channels
│       ├── verificationManager.js# Form-based verification system
│       └── telegram.js           # Telegram notification integration
├── webui/                        # Next.js 16 admin panel
│   └── src/app/
│       ├── page.tsx              # Dashboard
│       ├── factions/page.tsx     # Faction viewer
│       ├── guides/page.tsx       # Channel guide embeds
│       ├── embeds/page.tsx       # Embed builder
│       ├── roles/page.tsx        # Auto-roles config
│       ├── role-requests/page.tsx# Role request management
│       ├── stats/page.tsx        # Statistics
│       └── api/proxy/            # Proxy routes → Express API
├── scripts/                      # Setup & maintenance scripts
├── data/                         # Runtime state (gitignored)
├── config.json                   # Bot configuration
└── recruitment-architecture.json # Recruitment workflow policy
```

---

## Security / what not to commit

- Never commit `.env` or `webui/.env.local` (contain tokens)
- Keep secrets in environment variables only
- Files intentionally ignored by git:
  - `.env`, `webui/.env*`
  - `node_modules/`, `logs/`, `backups/`
  - Runtime state under `data/` (`messages.json`, `recruitment-architecture-state.json`, `role-requests.json`, `verification-requests.json`, `autoroles.json`, `embeds.json`)
  - Build output (`webui/.next/`)

---

## License

See `LICENSE`.
