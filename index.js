const { spawn } = require("child_process");
const axios = require("axios");
const logger = require("./main/utils/log");
const config = require("./config.json");

const _indexCfgIssues = [];
if (!config.telegramNotify || !config.telegramNotify.enable) {
    
}
if (config.autoRestartWhenListenMqttError === undefined) {
    _indexCfgIssues.push("💡  autoRestartWhenListenMqttError not set in config — defaulting to false");
}
if (_indexCfgIssues.length > 0) {
    setTimeout(() => logger.configValidation && logger.configValidation(_indexCfgIssues), 100);
}

require("./main/utils/keep_alive");

async function sendTelegram(text) {
  try {
    const tg = config.telegramNotify;
    if (!tg || !tg.enable || !tg.botToken || !tg.chatId) return;
    await axios.post(
      `https://api.telegram.org/bot${tg.botToken}/sendMessage`,
      { chat_id: tg.chatId, text, parse_mode: "HTML" },
      { timeout: 10000 }
    );
  } catch (_) {}
}

function tgBotName() {
  return config.BOTNAME || "SAGOR Bot";
}
function tgTime() {
  return new Date().toLocaleString("en-GB", { timeZone: config.timeZone || "Asia/Dhaka" });
}

const REMOTE_CONFIG_URL =
  "https://raw.githubusercontent.com/JAHIDUL-ISLAM-SAGOR-0/Sagor-bot/refs/heads/main/config.json";

async function checkUpdate() {
  const updCfg = (config && config.updateNotification) || {};
  if (updCfg.enable === false) {
    logger("updateNotification disabled — skipping update check", "[ UPDATE ]");
    return;
  }
  try {
    const res = await axios.get(REMOTE_CONFIG_URL, { timeout: 10000 });
    const remoteVersion = res.data && res.data.version;
    const localVersion = config.version;
    if (!remoteVersion) return logger("Remote version not found", "[ UPDATE ]");
    if (remoteVersion !== localVersion)
      logger(`Update available | Current: ${localVersion} → New: ${remoteVersion}`, "[ UPDATE ]");
    else
      logger("Bot is on the latest version", "[ UPDATE ]");
  } catch (_) {
    logger("Update check failed (network issue)", "[ UPDATE ]");
  }
}

const express = require("express");
const path = require("path");
const app = express();
const port = process.env.PORT || (config.dashBoard && config.dashBoard.port) || 5000;

app.set("trust proxy", true);
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  next();
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "/main/login.html"));
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "/main/index.html"));
});

function isBotAlive() {
  const p = global.botProcess;
  return !!(p && p.exitCode === null && p.signalCode === null);
}

app.get("/health", (req, res) => {
  const botAlive = isBotAlive();
  const lastHB = global.lastHeartbeat
    ? Math.floor((Date.now() - global.lastHeartbeat) / 1000) + "s ago"
    : "N/A";
  const mem = process.memoryUsage();
  res.json({
    status: botAlive ? "ok" : "bot_down",
    uptime: Math.floor(process.uptime()) + "s",
    restarts: global.countRestart || 0,
    lastHeartbeat: lastHB,
    nodeVersion: process.version,
    platform: process.platform,
    memRss: Math.round(mem.rss / 1024 / 1024) + " MB",
    memHeap: Math.round(mem.heapUsed / 1024 / 1024) + " MB",
    cmdCount: global.cmdCount || 0,
    evtCount: global.evtCount || 0,
  });
});

app.post("/api/bot/:action", express.json(), (req, res) => {
  const { action } = req.params;
  if (action === "restart") {
    logger("Dashboard requested bot restart", "[ DASHBOARD ]");
    global.botStopped = false;
    global.botPausedReason = null;
    global.countRestart = 0;
    if (isBotAlive()) {
      try { global.botProcess.kill("SIGTERM"); } catch (_) {}
    } else {
      startBot();
    }
    res.json({ ok: true, action });
  } else if (action === "stop") {
    logger("Dashboard requested bot stop", "[ DASHBOARD ]");
    global.botStopped = true;
    if (isBotAlive()) {
      try { global.botProcess.kill("SIGTERM"); } catch (_) {}
    }
    res.json({ ok: true, action });
  } else if (action === "start") {
    logger("Dashboard requested bot start", "[ DASHBOARD ]");
    global.botStopped = false;
    global.botPausedReason = null;
    if (!isBotAlive()) startBot();
    res.json({ ok: true, action });
  } else {
    res.status(400).json({ error: "Unknown action" });
  }
});

const crypto = require("crypto");
const verifyCodeStore = new Map();

function isDashboardEnabled() {
  return !config.dashBoard || config.dashBoard.enable !== false;
}

app.get("/dashboard/gencode", (req, res) => {
  if (!isDashboardEnabled()) return res.status(403).json({ error: "Dashboard disabled" });
  const code = crypto.randomBytes(4).toString("hex").toUpperCase();
  const expiresAt = Date.now() + ((config.dashBoard && config.dashBoard.expireVerifyCode) || 300000);
  verifyCodeStore.set(code, { expiresAt });
  setTimeout(() => verifyCodeStore.delete(code), (config.dashBoard && config.dashBoard.expireVerifyCode) || 300000);
  res.json({ code, expiresIn: ((config.dashBoard && config.dashBoard.expireVerifyCode) || 300000) / 1000 + "s" });
});

app.get("/dashboard/verify", (req, res) => {
  if (!isDashboardEnabled()) return res.status(403).json({ error: "Dashboard disabled" });
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: "Missing code" });
  const entry = verifyCodeStore.get(code.toUpperCase());
  if (!entry) return res.status(401).json({ error: "Invalid or expired code" });
  if (Date.now() > entry.expiresAt) {
    verifyCodeStore.delete(code.toUpperCase());
    return res.status(401).json({ error: "Code expired" });
  }
  verifyCodeStore.delete(code.toUpperCase());
  const sessionToken = crypto.randomBytes(16).toString("hex");
  verifyCodeStore.set("session_" + sessionToken, { expiresAt: Date.now() + 3600000 });
  res.json({ token: sessionToken, expiresIn: "3600s" });
});

app.get("/dashboard/stats", (req, res) => {
  if (!isDashboardEnabled()) return res.status(403).json({ error: "Dashboard disabled" });
  const token = req.headers["x-dashboard-token"] || req.query.token;
  const session = token ? verifyCodeStore.get("session_" + token) : null;
  if (!session || Date.now() > session.expiresAt) return res.status(401).json({ error: "Unauthorized" });
  res.json({
    status: isBotAlive() ? "ok" : "bot_down",
    uptime: Math.floor(process.uptime()) + "s",
    restarts: global.countRestart || 0,
    lastHeartbeat: global.lastHeartbeat
      ? Math.floor((Date.now() - global.lastHeartbeat) / 1000) + "s ago"
      : "N/A",
  });
});

if (config.serverUptime && config.serverUptime.enable) {
  try {
    const http = require("http");
    const { Server } = require("socket.io");
    const uptimePort = config.serverUptime.port || 3001;
    const socketCfg = config.serverUptime.socket || {};
    const channel = socketCfg.channelName || "uptime";
    const verifyToken = socketCfg.verifyToken || "";

    const uptimeServer = http.createServer();
    const io = new Server(uptimeServer, { cors: { origin: "*" } });

    io.on("connection", (socket) => {
      if (verifyToken) {
        const clientToken = socket.handshake.auth && socket.handshake.auth.token;
        if (clientToken !== verifyToken) {
          socket.disconnect(true);
          return;
        }
      }
      socket.emit(channel, {
        status: isBotAlive() ? "online" : "offline",
        uptime: Math.floor(process.uptime()),
        restarts: global.countRestart || 0,
        ts: Date.now()
      });
    });

    setInterval(() => {
      io.emit(channel, {
        status: isBotAlive() ? "online" : "offline",
        uptime: Math.floor(process.uptime()),
        restarts: global.countRestart || 0,
        ts: Date.now()
      });
    }, 30000);

    uptimeServer.listen(uptimePort, "0.0.0.0", () => {
      logger(`ServerUptime socket running on port ${uptimePort} (channel: ${channel})`, "[ SERVER ]");
    });
    uptimeServer.on("error", (e) => logger(`ServerUptime socket error: ${e.message}`, "[ ERROR ]"));
  } catch (e) {
    logger(`serverUptime init failed: ${e.message}`, "[ ERROR ]");
  }
}

const SELF_URL = process.env.RENDER_EXTERNAL_URL
  || process.env.RAILWAY_STATIC_URL
  || process.env.RAILWAY_PUBLIC_DOMAIN
  || process.env.APP_URL
  || null;

if (SELF_URL) {
  const pingUrl = SELF_URL.startsWith("http") ? SELF_URL : `https://${SELF_URL}`;
  setInterval(async () => {
    try {
      await axios.get(`${pingUrl}/health`, { timeout: 8000 });
      logger(`Self-ping OK → ${pingUrl}/health`, "[ UPTIME ]");
    } catch (e) {
      if (logger.networkError) logger.networkError(`Connection check failed: ${e.message}`, null);
      else logger(`Self-ping failed: ${e.message}`, "[ UPTIME ]");
    }
  }, 4 * 60 * 1000);
  logger(`24/7 self-ping enabled → ${pingUrl}`, "[ UPTIME ]");
} else {
  logger("Self-ping disabled — set APP_URL env variable (https://your-bot.onrender.com)", "[ UPTIME ]");
}

app.listen(port, "0.0.0.0", () => {
  logger(`Dashboard running at http://0.0.0.0:${port}`, "[ SERVER ]");
}).on("error", (err) => {
  logger(`Server error: ${err.message}`, "[ ERROR ]");
});

global.countRestart = 0;
global.botProcess = null;
global.lastHeartbeat = null;
global.isRestarting = false;
global.cmdCount = 0;
global.evtCount = 0;
global.botStopped = false;

const LOG_BUFFER_SIZE = 500;
global.logBuffer = [];
global.sseClients = new Set();

function pushLog(line) {
  const entry = { ts: Date.now(), line };
  global.logBuffer.push(entry);
  if (global.logBuffer.length > LOG_BUFFER_SIZE) global.logBuffer.shift();
  const payload = "data: " + JSON.stringify(entry) + "\n\n";
  for (const res of global.sseClients) {
    try { res.write(payload); } catch (_) { global.sseClients.delete(res); }
  }
}

app.get("/api/logs/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  const history = global.logBuffer.slice(-200);
  for (const entry of history) {
    res.write("data: " + JSON.stringify(entry) + "\n\n");
  }
  global.sseClients.add(res);
  req.on("close", () => { global.sseClients.delete(res); });
});

app.get("/api/logs", (req, res) => {
  res.json(global.logBuffer.slice(-200));
});

app.get("/api/modules", (req, res) => {
  const fs = require("fs");
  const pathMod = require("path");
  const cmdDir = pathMod.join(__dirname, "src/commands");
  const evtDir = pathMod.join(__dirname, "src/events");

  function readModules(dir, type) {
    try {
      return fs.readdirSync(dir)
        .filter(f => f.endsWith(".js") && !f.includes("example"))
        .map(f => {
          try {
            const fpath = pathMod.join(dir, f);
            delete require.cache[require.resolve(fpath)];
            const mod = require(fpath);
            const cfg = mod.config || mod.exports && mod.exports.config || {};
            return {
              file: f,
              name: cfg.name || f.replace(".js", ""),
              description: cfg.description || "—",
              category: cfg.commandCategory || cfg.category || (type === "cmd" ? "general" : "event"),
              version: cfg.version || "—",
              credits: cfg.credits || "—",
              aliases: cfg.aliases || [],
              eventType: cfg.eventType || [],
              type,
              status: "loaded"
            };
          } catch (e) {
            return {
              file: f,
              name: f.replace(".js", ""),
              description: "Failed to load",
              category: "—",
              version: "—",
              credits: "—",
              aliases: [],
              eventType: [],
              type,
              status: "failed",
              error: e.message
            };
          }
        });
    } catch (e) {
      return [];
    }
  }

  const commands = readModules(cmdDir, "cmd");
  const events = readModules(evtDir, "evt");
  res.json({ commands, events });
});

app.post("/api/cmd/add", express.json(), (req, res) => {
  const { name, code } = req.body || {};
  if (!name || !code) return res.status(400).json({ error: "Missing name or code" });
  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safeName) return res.status(400).json({ error: "Invalid name" });
  const fs = require("fs");
  const filePath = require("path").join(__dirname, "src/commands", safeName + ".js");
  try {
    fs.writeFileSync(filePath, code, "utf8");
    res.json({ ok: true, file: safeName + ".js" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/evt/add", express.json(), (req, res) => {
  const { name, code } = req.body || {};
  if (!name || !code) return res.status(400).json({ error: "Missing name or code" });
  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safeName) return res.status(400).json({ error: "Invalid name" });
  const fs = require("fs");
  const filePath = require("path").join(__dirname, "src/events", safeName + ".js");
  try {
    fs.writeFileSync(filePath, code, "utf8");
    res.json({ ok: true, file: safeName + ".js" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const COOKIE_FILES = { 1: "cookie.txt", 2: "cookie2.txt", 3: "cookie3.txt" };

app.get("/api/cookie/status", (req, res) => {
  const fs = require("fs");
  const result = {};
  for (const [slot, fname] of Object.entries(COOKIE_FILES)) {
    const fpath = require("path").join(__dirname, fname);
    try {
      const content = fs.readFileSync(fpath, "utf8").trim();
      result[slot] = { exists: true, size: content.length, preview: content.substring(0, 60) + "..." };
    } catch (_) {
      result[slot] = { exists: false, size: 0, preview: "File not found" };
    }
  }
  res.json(result);
});

app.post("/api/cookie/save", express.json(), (req, res) => {
  const { slot, data } = req.body || {};
  const slotNum = parseInt(slot);
  if (!COOKIE_FILES[slotNum]) return res.status(400).json({ error: "Invalid slot (1-3)" });
  if (!data || !data.trim()) return res.status(400).json({ error: "Cookie data is empty" });
  const fs = require("fs");
  const fpath = require("path").join(__dirname, COOKIE_FILES[slotNum]);
  try {
    fs.writeFileSync(fpath, data.trim(), "utf8");
    res.json({ ok: true, slot: slotNum, file: COOKIE_FILES[slotNum], size: data.trim().length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const FREEZE_TIMEOUT_MS = 10 * 60 * 1000;

function startWatchdog() {
  setInterval(() => {
    if (!isBotAlive()) return;
    if (!global.lastHeartbeat) return;
    const silent = Date.now() - global.lastHeartbeat;
    if (silent > FREEZE_TIMEOUT_MS) {
      const frozenMin = Math.floor(silent / 60000);
      logger(
        `Bot frozen for ${frozenMin} min — force restarting...`,
        "[ WATCHDOG ]"
      );
      sendTelegram(
        `⚠️ <b>${tgBotName()} — FROZEN / WATCHDOG RESTART</b>\n\n` +
        `🧊 No heartbeat for <b>${frozenMin} min</b>\n` +
        `🔄 Force-killing and restarting...\n` +
        `🕐 Time: <b>${tgTime()}</b>`
      );
      try { global.botProcess.kill("SIGKILL"); } catch (_) {}
    }
  }, 60 * 1000);
}

function trackHeartbeat(data) {
  const str = data.toString();
  if (str.includes("HEARTBEAT")) {
    global.lastHeartbeat = Date.now();
  }
  const match = str.match(/MODULE_COUNTS:(\d+):(\d+)/);
  if (match) {
    global.cmdCount = parseInt(match[1]);
    global.evtCount = parseInt(match[2]);
    if (!global._onlineSent) {
      global._onlineSent = true;
      sendTelegram(
        `🟢 <b>${tgBotName()} — ONLINE</b>\n\n` +
        `📦 Commands: <b>${global.cmdCount}</b>\n` +
        `⚡ Events: <b>${global.evtCount}</b>\n` +
        `🔄 Restart count: <b>${global.countRestart || 0}</b>\n` +
        `🕐 Time: <b>${tgTime()}</b>`
      );
    }
  }
}

function startBot(message) {
  if (global.isRestarting) return;
  global.isRestarting = true;
  global._onlineSent = false;
  if (message) logger(message, "[ BOT ]");

  const delay = global.countRestart === 0
    ? 0
    : Math.min(3000 * Math.pow(2, Math.min(global.countRestart - 1, 4)), 60000);

  if (delay > 0) logger(`Waiting ${delay / 1000}s before restart...`, "[ RESTART ]");

  setTimeout(() => {
    global.isRestarting = false;
    global.lastHeartbeat = Date.now();

    const child = spawn(
      "node",
      ["--trace-warnings", "--async-stack-traces", "--max-old-space-size=512", "main/utils/SaGor.js"],
      { cwd: __dirname, stdio: ["inherit", "pipe", "pipe"], shell: true }
    );

    global.botProcess = child;
    let _restartScheduled = false;

    child.stdout.on("data", (data) => {
      process.stdout.write(data);
      trackHeartbeat(data);
      data.toString().split("\n").forEach(l => { if (l.trim()) pushLog(l); });
    });

    child.stderr.on("data", (data) => {
      process.stderr.write(data);
      data.toString().split("\n").forEach(l => { if (l.trim()) pushLog("[STDERR] " + l); });
    });

    child.on("close", (codeExit) => {
      if (_restartScheduled) return;
      _restartScheduled = true;
      global.botProcess = null;
      if (codeExit === 78) {
        global.botPausedReason = "cookies_expired";
        logger(
          "All Facebook cookies are invalid/expired. Auto-restart paused. Update cookie.txt (and cookie2.txt/cookie3.txt) with a valid appstate, then restart the workflow.",
          "[ COOKIE ]"
        );
        sendTelegram(
          `🛑 <b>${tgBotName()} — COOKIES EXPIRED</b>\n\n` +
          `All Facebook cookies are invalid. Auto-restart paused.\n` +
          `Please update <code>cookie.txt</code> and restart manually.\n` +
          `🕐 Time: <b>${tgTime()}</b>`
        );
        return;
      }
      const isCrash = codeExit !== 0 && codeExit !== null;
      if (isCrash) {
        global.countRestart++;
        const _delay = Math.min(3000 * Math.pow(2, Math.min(global.countRestart - 1, 4)), 60000);
        if (logger.crash) logger.crash(codeExit, global.countRestart, _delay);
      }
      if (global.botStopped) {
        logger(`Bot stopped by dashboard (code ${codeExit})`, "[ BOT ]");
        pushLog(`[DASHBOARD] Bot stopped by user`);
        sendTelegram(
          `⛔ <b>${tgBotName()} — STOPPED</b>\n\n` +
          `🛑 Stopped manually via dashboard\n` +
          `🕐 Time: <b>${tgTime()}</b>`
        );
        return;
      }
      if (isCrash) {
        sendTelegram(
          `🔴 <b>${tgBotName()} — CRASHED</b>\n\n` +
          `💥 Exit code: <b>${codeExit}</b>\n` +
          `🔄 Restart #<b>${global.countRestart}</b>\n` +
          `🕐 Time: <b>${tgTime()}</b>\n\n` +
          `⏳ Auto-restarting...`
        );
      }
      logger(
        `Bot exited (code ${codeExit}) — Restart #${global.countRestart}`,
        "[ RESTART ]"
      );
      startBot();
    });

    child.on("error", (error) => {
      if (_restartScheduled) return;
      _restartScheduled = true;
      if (logger.networkError) logger.networkError(`Spawn error: ${error.message}`, null);
      else logger(`Spawn error: ${error.message}`, "[ ERROR ]");
      global.countRestart++;
      sendTelegram(
        `🔴 <b>${tgBotName()} — SPAWN ERROR</b>\n\n` +
        `⚠️ <code>${error.message}</code>\n` +
        `🕐 Time: <b>${tgTime()}</b>`
      );
      if (!global.botStopped) startBot();
    });

  }, delay);
}

function gracefulShutdown(signal) {
  logger(`Received ${signal} — shutting down...`, "[ SHUTDOWN ]");
  if (global.botProcess && !global.botProcess.killed) {
    global.botProcess.kill("SIGTERM");
  }
  setTimeout(() => process.exit(0), 3000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("uncaughtException", (err) => {
  logger(`Uncaught exception in index.js: ${err.stack || err.message}`, "[ ERROR ]");
});
process.on("unhandledRejection", (reason) => {
  logger(`Unhandled rejection in index.js: ${reason}`, "[ ERROR ]");
});

(async () => {
  await checkUpdate();
  startWatchdog();
  startBot("Bot is starting...");
})();
