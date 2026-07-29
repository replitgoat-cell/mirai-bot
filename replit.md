# MIRAI V3 (SAGOR Bot)

A Facebook Messenger bot with extensible commands/events, multi-language support, and a web dashboard for control and monitoring.

## Run & Operate
- **Start**: `node index.js`
- **Dashboard**: http://0.0.0.0:5000
- **Health check**: GET /health
- **Required files**: `cookie.txt` (Facebook appstate/cookie), `config.json`

## Stack
- Node.js 20.x
- Express.js (dashboard web server, port 5000)
- Sequelize + SQLite (data persistence)
- sagor-fca (Facebook Chat API)
- Socket.io (uptime monitoring)
- canvas, jimp (image generation)
- openai (AI chat features)

## Where things live
- `index.js` — entry point; Express dashboard + bot process manager
- `main/utils/SaGor.js` — bot core logic, config loading, module loader
- `main/listen.js` — central event listener, routes to handlers
- `src/commands/` — bot command modules
- `src/events/` — bot event modules
- `main/controllers/` — DB model controllers (Users, Threads, Currencies)
- `main/database/` — Sequelize config and model definitions
- `main/handle/` — handlers for commands, replies, reactions
- `config.json` — all bot configuration (prefix, admins, features, ports)
- `cookie.txt` — Facebook session cookie/appstate

## Architecture decisions
- `index.js` spawns `main/utils/SaGor.js` as a child process so the dashboard stays alive even if the bot crashes, with exponential backoff restarts
- A watchdog timer detects frozen bot processes (no HEARTBEAT in 10 min) and force-restarts them
- Dashboard uses a time-limited verify code + session token auth flow instead of passwords
- SQLite used for zero-config persistence of user/thread data
- Dashboard port hardcoded to 5000 in `config.json` for Replit webview compatibility

## Product
- Facebook Messenger bot responding to 75+ commands (AI, video/media download, group management, games, utilities)
- 6 event handlers (welcome, anti-out, name protection, etc.)
- Web dashboard at `/` with bot control (start/stop/restart) and stats
- Login page at `/login`, health endpoint at `/health`
- Multi-language support (English default)

## User preferences
_Populate as you build_

## Gotchas
- Dashboard port must be 5000 for Replit webview (set in `config.json → dashBoard.port`)
- `cookie.txt` must contain a valid Facebook appstate for the bot to connect
- `libuuid` system dependency required for some commands (hack, uid, uptime)
- When all Facebook cookies (`cookie.txt`, `cookie2.txt`, `cookie3.txt`) are invalid/expired, the bot child exits with code `78` and the parent stops auto-restarting. Update the appstate in those files and restart the workflow manually.

## Config wiring map
- `database.autoSyncWhenStart` → `main/database/model.js` (gates `Users/Threads/Currencies.sync()`)
- `database.autoRefreshThreadInfoFirstTime` → `main/handle/handleCreateDatabase.js`
- `botAccount.autoUseWhenEmpty` → `main/utils/SaGor.js` (logs notice when account.txt empty)
- `twoIdMode.autoSwitchOnError` → `main/utils/SaGor.js` (force-enables MQTT-restart-on-error)
- `threadApproval.*` → `main/listen.js` (message routing) + `main/handle/handleEvent.js` (event routing) + auto-approve existing threads on env load
- `botLogging.logBotAdded/logBotKicked` → `src/events/joinNoti.js`, `src/events/leave.js` (uses `global.sendBotLog`)
- `groupNoti` → `src/events/joinNoti.js`, `src/events/leave.js` (uses `global.shouldSendGroupNoti`)
- `bioUpdate` → `main/utils/SaGor.js` (post-login)
- `updateNotification.enable` → `index.js` `checkUpdate()`
- `botStartupNotification` → `main/utils/SaGor.js` (post-login)
- Active cookie index persists across restarts via `.active_cookie_index`

## Pointers
- Skills: workflows, package-management, environment-secrets
