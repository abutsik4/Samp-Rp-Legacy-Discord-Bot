<p align="center">
  <img src="assets/readme-logo.svg" alt="SRP Legacy" width="640" />
</p>

<h3 align="center">
  Full-stack Discord management platform — bot + admin dashboard
</h3>

<p align="center">
  A production-grade <strong>Discord.js v14</strong> bot paired with a <strong>Next.js 16</strong> admin dashboard, built to manage a 10-faction gaming community with automated role workflows, form-based verification, dynamic voice channels, and a complete REST API.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-22-339933?logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Discord.js-v14-5865F2?logo=discord&logoColor=white" alt="Discord.js" />
  <img src="https://img.shields.io/badge/Express-v5-000000?logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License" />
</p>

<p align="center">
  <img src="assets/logo-bot.svg" alt="Bot logo" width="140" />
  <img src="assets/logo-discord-server.svg" alt="Server logo" width="140" />
</p>

---

## Highlights

- **10-faction server scaffolding** — one-click deploy creates 60+ channels, 44+ roles, and granular permission overwrites per faction
- **Hierarchical role request workflow** — button/dropdown-driven approval chain with tiered authorization (Staff → Curator → Leader → Deputy)
- **Modal-based user verification** — form submission, admin review queue, automatic role assignment and nickname sync
- **Join-to-create voice channels** — ephemeral per-user voice rooms with auto-cleanup
- **Next.js admin dashboard** — dark glassmorphism UI with real-time faction viewer, embed builder, auto-role config, and role request queue
- **REST API layer** — 20+ authenticated Express endpoints proxied through Next.js App Router
- **Production infrastructure** — systemd services, health checks with Telegram alerts, PM2 process management

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Bot runtime** | Node.js · Discord.js v14 · Express v5 |
| **Admin dashboard** | Next.js 16 · React 19 · TypeScript 5 · Tailwind CSS v4 |
| **API** | RESTful JSON API (Express) with Next.js proxy routes |
| **Auth** | Token-based (timing-safe comparison) shared secret between services |
| **Data** | JSON file-based persistence (embeds, roles, verification state) |
| **Infrastructure** | systemd · PM2 · Cloudflare · Telegram webhook alerts |
| **CI / QA** | Branding consistency checks · WebUI smoke tests · ESLint |

---

## Architecture

```
┌──────────────────────┐        ┌──────────────────────┐        ┌───────────────┐
│   Next.js Dashboard  │───────▶│   Express REST API   │───────▶│   Discord     │
│   React 19 + TS      │ proxy  │   Discord.js v14     │ WS +   │   Gateway     │
│   Tailwind CSS       │ routes │   Token auth         │ REST   │               │
│   :5031              │        │   :5032              │        │               │
└──────────────────────┘        └──────────────────────┘        └───────────────┘
         │                               │
         │  Auth: WEBUI_AUTH_TOKEN        │  Alerts
         └──── header on every request    └──────────▶ Telegram Webhooks
```

**Request flow:** Dashboard → Next.js API route (`/api/proxy/*`) → Express endpoint → Discord API / local state

The frontend never communicates with Discord directly — all mutations are routed through the authenticated Express API, ensuring a single source of truth and centralized audit logging.

---

## Core Systems

### 1. Faction Structure Manager

Automated Discord server scaffolding for 10 organizational factions. A single deploy command creates the entire guild structure:

| What is created | Per faction |
|---|---|
| **Category** | Color-coded with emoji prefix |
| **Text channels** | Announcements (leader-only write), chat, discussion, role-management panel |
| **Voice channels** | Briefing, work, 1v1 (2 slots), 2v2 (4 slots), join-to-create |
| **Roles** | Leader, Deputy Leader, Member — each with scoped permissions |
| **Permission overwrites** | Channel-level ACLs per role type (announce, chat, manage, voice) |

**Additional infrastructure created:**
- 5-tier admin hierarchy (Owner → Head Admin → Deputy Head → Admin → Moderator) with hoisted roles
- 6 curator roles covering faction groups (e.g., SAPD curator oversees LSPD + SFPD + LVPD) with real channel permission overwrites
- General roles: Verified, Unverified, Bot
- **Automated migration** — detects and consolidates legacy per-faction curator roles into grouped roles

### 2. Role Request Workflow

A complete approval pipeline driven by button interactions and dropdown menus:

```
Player clicks "Request Role" → selects faction + level → approval embed posted
→ authorized reviewer approves/denies → bot grants role + posts announcement
```

**Authorization matrix:**

| Requested level | Approved by |
|---|---|
| Member | Staff, Curator, Leader, Deputy Leader |
| Deputy Leader | Staff, Curator, Leader |
| Leader | Staff only |

Role removal follows the same hierarchy. Each action is logged with the reviewer's identity and reason.

### 3. User Verification System

Modal form-based verification flow:

1. User clicks **Verify** button → fills modal (game nickname, forum profile, bio)
2. Request queued in admin-only review channel as an interactive embed
3. Staff approves → bot assigns Verified role, sets nickname, sends DM confirmation
4. Staff denies → bot sends DM with rejection reason

Includes duplicate-request blocking and paginated pending queue.

### 4. Temporary Voice Channels

Join-to-create system: entering a designated channel triggers bot to create a private `🔉 <username>` voice channel and move the user in. The channel owner gets mute/move permissions. Channels auto-delete when the last user leaves. Orphaned channels are cleaned up on bot restart.

### 5. Recruitment Architecture

Policy-driven recruitment workflow defined in a JSON configuration file:

- Dedicated recruitment category with guide, announcement feed, Q&A, interview rooms, and waiting channels
- Configurable workflow roles and approval chains
- Pinned rules and announcement templates
- Per-guild overrides supported

---

## Admin Dashboard (WebUI)

Built with **Next.js 16 App Router**, **React 19**, and **Tailwind CSS v4**. Features a dark theme with glassmorphism styling.

| Page | Functionality |
|---|---|
| **Dashboard** | Server stats (members, messages, roles), management quick links, live activity log |
| **Factions** | Visual faction structure viewer, one-click full deploy to Discord |
| **Guides** | Dynamic per-faction guide embeds — compose content and send/edit directly in Discord channels |
| **Embeds** | Rich embed builder — create, edit, duplicate, send to any channel; per-embed update/delete on multi-embed messages |
| **Roles** | Auto-role configuration for new members |
| **Role Requests** | Pending request queue, approve/deny from the dashboard, deploy request/removal panels |
| **Stats** | Server activity statistics |

All dashboard actions proxy through authenticated Next.js API routes to the Express backend.

---

## REST API

20+ endpoints exposed on the Express server (default port `5032`), all requiring `Authorization: Bearer <token>`:

| Category | Endpoints | Operations |
|---|---|---|
| **Channels & Roles** | `/api/channels`, `/api/roles` | List guild channels and roles |
| **Structure** | `/api/structure/deploy`, `/api/structure/live`, `/api/structure/status` | Deploy factions, view live state, track progress |
| **Embeds** | `/api/send-embed`, `/api/edit-embed`, `/api/remove-embed` | Full embed lifecycle management |
| **Role Requests** | `/api/role-requests`, `/api/role-request/approve`, `/api/role-request/deny` | Queue inspection and workflow actions |
| **Panels** | `/api/role-request/panel`, `/api/removal-panel`, `/api/verification-panel`, `/api/rules-panel` | Deploy interactive button panels to channels |
| **Auto-roles** | `/api/auto-roles` | GET/POST auto-role configuration |
| **Members** | `/api/faction-members` | List members by faction role |
| **Health** | `/healthz` | Liveness probe for monitoring |

---

## Slash Commands

| Command | Category | Description |
|---|---|---|
| `/announce` | Admin | Send announcements to channels |
| `/assign_pack` | Admin | Assign recruitment packs |
| `/remove_pack` | Admin | Remove recruitment packs |
| `/rules` | Admin | Post server rules |
| `/setup_recruitment` | Admin | Initialize recruitment infrastructure |
| `/settings-preview` | Admin | Preview current bot settings |
| `/welcome-preview` | Admin | Preview welcome message |
| `/giveaway-template` | Fun | Create giveaway templates |
| `/help` | Utility | Command reference |
| `/leaderboard` | Utility | Message activity leaderboard |
| `/ping` | Utility | Latency check |

---

## Getting Started

### Prerequisites

- **Node.js** 22+
- A Discord bot application with **Server Members** and **Message Content** privileged intents enabled

### Installation

```bash
git clone https://github.com/abutsik4/Samp-Rp-Legacy-Discord-Bot.git
cd Samp-Rp-Legacy-Discord-Bot

# Install bot dependencies
npm ci

# Install dashboard dependencies
cd webui && npm ci && cd ..
```

### Configuration

Create `.env` in the project root:

```env
DISCORD_TOKEN=your_bot_token
GUILD_ID=your_server_id
PORT=5032
WEBUI_AUTH_TOKEN=your_shared_secret
```

Create `webui/.env.local`:

```env
DISCORD_API_URL=http://localhost:5032
WEBUI_AUTH_TOKEN=your_shared_secret   # must match the bot .env
```

### Running locally

```bash
# Start the bot (Express API on port 5032)
node src/index.js

# Start the dashboard (Next.js on port 5031)
cd webui && npm run build && npm start -- -p 5031
```

### Production deployment (systemd)

```bash
sudo cp srp-legacy-bot.service srp-legacy-webui.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now srp-legacy-bot srp-legacy-webui
```

Additional systemd units are provided for health monitoring and failure alerting:
- `srp-legacy-bot-healthcheck.service` + `.timer` — periodic liveness checks
- `srp-legacy-bot-failure@.service` — triggers Telegram alerts on service failure

---

## Project Structure

```
├── src/
│   ├── index.js                     # Bot + Express API server (entry point)
│   ├── registerCommands.js          # Discord slash command registration
│   ├── commands/
│   │   ├── admin/                   # Admin commands (announce, rules, recruitment, etc.)
│   │   ├── fun/                     # Fun commands (giveaway templates)
│   │   └── util/                    # Utility commands (help, leaderboard, ping)
│   └── utils/
│       ├── factionManager.js        # 10-faction structure deployment + curator migration
│       ├── roleRequestManager.js    # Hierarchical role request approval workflow
│       ├── verificationManager.js   # Modal form verification system
│       ├── tempVoiceManager.js      # Ephemeral join-to-create voice channels
│       ├── recruitmentArchitectureManager.js  # Policy-driven recruitment workflows
│       ├── embedFactory.js          # Embed template helpers
│       ├── adminGuide.js            # Auto-generated admin FAQ
│       └── telegram.js              # Telegram notification integration
├── webui/                           # Next.js 16 admin dashboard
│   └── src/app/
│       ├── page.tsx                 # Dashboard overview
│       ├── factions/                # Faction viewer + deploy
│       ├── guides/                  # Channel guide embeds
│       ├── embeds/                  # Rich embed builder
│       ├── roles/                   # Auto-role configuration
│       ├── role-requests/           # Role request management
│       ├── stats/                   # Server statistics
│       └── api/proxy/               # Authenticated proxy routes → Express API
├── scripts/                         # Deployment, health check, and notification scripts
├── data/                            # Runtime JSON state (gitignored)
├── config.json                      # Bot configuration (branding, features, modules)
└── recruitment-architecture.json    # Recruitment workflow policy definition
```

---

## Security

- Secrets managed exclusively via environment variables (`.env` / `.env.local`)
- Token authentication between services with timing-safe comparison (`crypto.timingSafeEqual`)
- No secrets committed — `.env`, tokens, and runtime state are gitignored
- WebUI authentication enforced on all API proxy routes

---

## License

[MIT](LICENSE) — Copyright (c) 2026 Alex
