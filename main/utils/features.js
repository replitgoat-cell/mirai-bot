const fs = require("fs");
const path = require("path");
const moment = require("moment-timezone");

function _ts() {
  const tz = (global.config && global.config.timeZone) || "Asia/Dhaka";
  return moment.tz(tz).format("DD/MM/YYYY HH:mm:ss");
}

async function maybeAutoSyncDatabase(sequelize, logger) {
  const cfg = (global.config && global.config.database) || {};
  if (!cfg.autoSyncWhenStart) return;
  try {
    logger("autoSyncWhenStart enabled — syncing models...", "[ DATABASE ]");
    await sequelize.sync();
    logger("Database sync complete", "[ DATABASE ]");
  } catch (e) {
    logger(`Database sync failed: ${e.message}`, "[ DATABASE ]");
  }
}

async function maybeUpdateBio(api, logger) {
  const cfg = (global.config && global.config.bioUpdate) || {};
  if (!cfg.enable || !cfg.bioText) return;
  const flagFile = path.join(process.cwd(), ".bio_updated");
  if (cfg.updateOnce && fs.existsSync(flagFile)) {
    logger("bioUpdate: already updated once, skipping", "[ BIO ]");
    return;
  }
  try {
    if (typeof api.changeBio !== "function") {
      logger("bioUpdate: api.changeBio not available in this FCA build", "[ BIO ]");
      return;
    }
    await new Promise((resolve, reject) => {
      try {
        api.changeBio(cfg.bioText, (err) => (err ? reject(err) : resolve()));
      } catch (e) { reject(e); }
    });
    if (cfg.updateOnce) {
      try { fs.writeFileSync(flagFile, _ts()); } catch (_) {}
    }
    logger("Bio updated successfully", "[ BIO ]");
  } catch (e) {
    logger(`Bio update failed: ${e && e.message ? e.message : e}`, "[ BIO ]");
  }
}

async function sendStartupNotification(api, logger) {
  const cfg = (global.config && global.config.botStartupNotification) || {};
  if (!cfg.enable) return;
  const msg = cfg.message || "🤖 Bot is now online!";
  const targets = new Set();

  const stt = cfg.sendToThreads || {};
  if (stt.enable && Array.isArray(stt.threadIds)) {
    for (const t of stt.threadIds) if (t) targets.add(String(t));
  }
  const sta = cfg.sendToAdmin || {};
  if (sta.enable && sta.adminId) targets.add(String(sta.adminId));

  for (const tid of targets) {
    try {
      await new Promise((resolve) => {
        try { api.sendMessage(msg, tid, () => resolve()); }
        catch (_) { resolve(); }
      });
    } catch (e) {
      logger(`Startup noti to ${tid} failed: ${e.message}`, "[ STARTUP NOTI ]");
    }
  }
  if (targets.size > 0) {
    logger(`Startup notification sent to ${targets.size} target(s)`, "[ STARTUP NOTI ]");
  }
}

function sendBotLog(api, message) {
  const cfg = (global.config && global.config.botLogging) || {};
  if (!cfg.enable || !api) return;
  const targets = new Set();
  if (cfg.sendToThreads && Array.isArray(cfg.logThreadIds)) {
    for (const t of cfg.logThreadIds) if (t) targets.add(String(t));
  }
  if (cfg.sendToAdmins) {
    for (const a of (global.config.ADMINBOT || [])) if (a) targets.add(String(a));
  }
  for (const tid of targets) {
    try { api.sendMessage(message, tid); } catch (_) {}
  }
}

function isThreadApproved(threadID) {
  const cfg = (global.config && global.config.threadApproval) || {};
  if (!cfg.enable) return true;
  const approved = (cfg.autoApprovedThreads || []).map(String);
  return approved.includes(String(threadID));
}

function notifyThreadApprovalRequest(api, threadID) {
  const cfg = (global.config && global.config.threadApproval) || {};
  if (!cfg.enable) return;
  global._notifiedApprovalThreads = global._notifiedApprovalThreads || new Set();
  if (global._notifiedApprovalThreads.has(String(threadID))) return;
  global._notifiedApprovalThreads.add(String(threadID));

  if (cfg.sendNotifications && Array.isArray(cfg.adminNotificationThreads)) {
    const note = `🔔 New thread awaiting approval\nThread ID: ${threadID}\nTime: ${_ts()}`;
    for (const t of cfg.adminNotificationThreads) {
      if (!t) continue;
      try { api.sendMessage(note, String(t)); } catch (_) {}
    }
  }
  if (cfg.sendThreadMessage) {
    try {
      api.sendMessage(
        "⏳ This thread is awaiting admin approval before the bot can respond.",
        String(threadID)
      );
    } catch (_) {}
  }
}

function autoApproveExistingThreads(allThreadIDs, persistConfig) {
  const cfg = (global.config && global.config.threadApproval) || {};
  if (!cfg.enable || !cfg.autoApproveExisting) return 0;
  cfg.autoApprovedThreads = cfg.autoApprovedThreads || [];
  let added = 0;
  for (const tid of allThreadIDs) {
    const s = String(tid);
    if (!cfg.autoApprovedThreads.includes(s)) {
      cfg.autoApprovedThreads.push(s);
      added++;
    }
  }
  cfg.autoApproveExisting = false;
  if (persistConfig && global.client && global.client.configPath) {
    try {
      fs.writeFileSync(global.client.configPath, JSON.stringify(global.config, null, 4), "utf8");
    } catch (_) {}
  }
  return added;
}

function shouldSendGroupNoti(threadID) {
  const cfg = (global.config && global.config.groupNoti) || {};
  if (!cfg.enable) return false;
  const ids = (cfg.threadIds || []).filter(Boolean).map(String);
  if (ids.length === 0) return true;
  return ids.includes(String(threadID));
}

function isUpdateNotificationEnabled() {
  const cfg = (global.config && global.config.updateNotification) || {};
  return !!cfg.enable;
}

function getNextCookieFileForTwoIdMode(currentIndex, cookieFiles) {
  const cfg = (global.config && global.config.twoIdMode) || {};
  if (!cfg.enable || !cfg.autoSwitchOnError) return -1;
  for (let i = currentIndex + 1; i < cookieFiles.length; i++) {
    if (fs.existsSync(cookieFiles[i])) return i;
  }
  return -1;
}

function checkBotAccountConfigured(logger) {
  const cfg = (global.config && global.config.botAccount) || {};
  if (!cfg.autoUseWhenEmpty) return;
  const accountPath = path.join(process.cwd(), "account.txt");
  const isEmpty = !fs.existsSync(accountPath) || fs.readFileSync(accountPath, "utf8").trim().length === 0;
  if (!isEmpty) return;
  if (cfg.email && cfg.password) {
    logger(
      `botAccount.autoUseWhenEmpty is enabled and account.txt is empty. Email-based auto-login is not implemented in sagor-fca; please populate cookie.txt manually.`,
      "[ BOT ACCOUNT ]"
    );
  }
}

function isNotificationEnabled() {
  const cfg = global.config || {};
  if (typeof cfg.NOTIFICATION !== "undefined") return !!cfg.NOTIFICATION;
  return true;
}

function autoCleanMessage(api, threadID, messageID) {
  const cfg = global.config || {};
  if (!cfg.autoClean) return;
  const delayMs = typeof cfg.autoCleanDelay === "number" ? cfg.autoCleanDelay : 30000;
  setTimeout(() => {
    try { api.unsendMessage(messageID); } catch (_) {}
  }, delayMs);
}

function isLoggingEnabled() {
  const cfg = global.config || {};
  if (cfg.log && typeof cfg.log.enable !== "undefined") return !!cfg.log.enable;
  return true;
}

function shouldSendGroupNotiFixed(threadID) {
  const cfg = global.config || {};
  const gcfg = cfg.groupNoti || cfg.notiGroup || {};
  const enable = typeof gcfg === "boolean" ? gcfg : !!gcfg.enable;
  if (!enable) return false;
  const ids = Array.isArray(gcfg.threadIds) ? gcfg.threadIds.filter(Boolean).map(String) : [];
  if (ids.length === 0) return true;
  return ids.includes(String(threadID));
}

module.exports = {
  maybeAutoSyncDatabase,
  maybeUpdateBio,
  sendStartupNotification,
  sendBotLog,
  isThreadApproved,
  notifyThreadApprovalRequest,
  autoApproveExistingThreads,
  shouldSendGroupNoti,
  shouldSendGroupNotiFixed,
  isUpdateNotificationEnabled,
  getNextCookieFileForTwoIdMode,
  checkBotAccountConfigured,
  isNotificationEnabled,
  autoCleanMessage,
  isLoggingEnabled,
};
