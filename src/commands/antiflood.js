// ╔══════════════════════════════════════════╗
// ║      ANTI-FLOOD SYSTEM v1.0.0            ║
// ║           by SaGor                       ║
// ╚══════════════════════════════════════════╝
// একসাথে অনেক message পাঠালে → warn → mute → kick → ban

const fs = require("fs-extra");
const path = require("path");

// ─── Settings ───────────────────────────────
const FLOOD = {
  msgLimit:   6,    // এত message দিলে flood হবে
  window:     5,    // এই সেকেন্ডের মধ্যে
  warnLimit:  2,    // এতবার warn পেলে → kick
  muteTime:   30,   // warn এর পর এত সেকেন্ড mute (message delete)
  banAfterKick: true // kick এর পর ban করবে কি না
};

const FLOOD_LOG = path.join(__dirname, "cache", "flood_log.json");

// ── Helpers ─────────────────────────────────
function loadLog() {
  try {
    if (!fs.existsSync(FLOOD_LOG)) return [];
    return JSON.parse(fs.readFileSync(FLOOD_LOG)) || [];
  } catch { return []; }
}
function saveLog(data) {
  try { fs.writeFileSync(FLOOD_LOG, JSON.stringify(data, null, 2)); } catch (_) {}
}
function addLog(entry) {
  const log = loadLog();
  const moment = require("moment-timezone");
  log.unshift({ ...entry, time: moment.tz("Asia/Dhaka").format("DD/MM HH:mm:ss") });
  if (log.length > 100) log.length = 100;
  saveLog(log);
}

// ── Module config ────────────────────────────
module.exports.config = {
  name: "antiflood",
  version: "1.0.0",
  hasPermssion: 1,
  credits: "SaGor",
  description: "🌊 Anti-Flood System — একসাথে অনেক message block করে",
  commandCategory: "Security",
  usages: "antiflood [on/off/status/log/set]",
  cooldowns: 3
};

// ── Command runner ───────────────────────────
module.exports.run = async function ({ api, event, args, Threads }) {
  const { threadID, messageID, senderID } = event;
  const ADMINBOT = global.config?.ADMINBOT || [];
  const threadInfo = await api.getThreadInfo(threadID);
  const isAdmin = threadInfo.adminIDs.some(a => a.id == senderID) || ADMINBOT.includes(senderID);

  if (!isAdmin) {
    return api.sendMessage("❌ Only group admins can manage Anti-Flood.", threadID, messageID);
  }

  const threadData = (await Threads.getData(threadID)).data || {};
  const sub = args[0]?.toLowerCase();

  switch (sub) {

    case "on": {
      threadData.antiflood = true;
      await Threads.setData(threadID, { data: threadData });
      return api.sendMessage(
        `🌊 Anti-Flood ENABLED ✅\n━━━━━━━━━━━━━━━━━━━\n` +
        `⚡ Limit: ${FLOOD.msgLimit} msg/${FLOOD.window}s\n` +
        `⚠️ Warns before kick: ${FLOOD.warnLimit}\n` +
        `🔇 Mute time: ${FLOOD.muteTime}s\n` +
        `🚫 Ban after kick: ${FLOOD.banAfterKick ? "Yes" : "No"}`,
        threadID, messageID
      );
    }

    case "off": {
      threadData.antiflood = false;
      await Threads.setData(threadID, { data: threadData });
      return api.sendMessage("🌊 Anti-Flood DISABLED ❌", threadID, messageID);
    }

    case "status": {
      const status = threadData.antiflood ? "✅ ENABLED" : "❌ DISABLED";
      return api.sendMessage(
        `🌊 Anti-Flood Status: ${status}\n━━━━━━━━━━━━━━━━━━━\n` +
        `📊 Limit: ${FLOOD.msgLimit} msg/${FLOOD.window}s\n` +
        `⚠️ Warn limit: ${FLOOD.warnLimit}x → kick\n` +
        `🔇 Mute: ${FLOOD.muteTime}s after warn\n` +
        `🚫 Auto-ban: ${FLOOD.banAfterKick ? "On" : "Off"}`,
        threadID, messageID
      );
    }

    case "log": {
      const logs = loadLog().slice(0, 10);
      if (!logs.length) return api.sendMessage("📋 No flood events yet.", threadID, messageID);
      let msg = `🌊 Flood Log (last 10)\n━━━━━━━━━━━━━━━━━━━\n`;
      for (const l of logs) {
        const icon = l.action === "ban" ? "🚫" : l.action === "kick" ? "👢" : "⚠️";
        msg += `${icon} ${l.name} → ${l.action}\n📅 ${l.time}\n\n`;
      }
      return api.sendMessage(msg, threadID, messageID);
    }

    default: {
      return api.sendMessage(
        `🌊 ANTI-FLOOD SYSTEM\n━━━━━━━━━━━━━━━━━━━\n` +
        `• antiflood on     → চালু করো\n` +
        `• antiflood off    → বন্ধ করো\n` +
        `• antiflood status → অবস্থা দেখো\n` +
        `• antiflood log    → flood ইতিহাস`,
        threadID, messageID
      );
    }
  }
};

// ── Event handler: সব message monitor করে ──
module.exports.handleEvent = async function ({ api, event, Users, Threads }) {
  const { senderID, threadID, body, messageID } = event;
  if (!body) return;

  // Admin skip
  const ADMINBOT = global.config?.ADMINBOT || [];
  const NDH      = global.config?.NDH      || [];
  if (ADMINBOT.includes(senderID) || NDH.includes(senderID)) return;
  if (global.data.userBanned?.has(senderID)) return;

  // Thread-এ antiflood চালু আছে কি?
  const threadData = (await Threads.getData(threadID)).data || {};
  if (!threadData.antiflood) return;

  // ── Tracker init ──
  if (!global.client.floodTracker) global.client.floodTracker = {};
  if (!global.client.floodWarns)   global.client.floodWarns   = {};
  if (!global.client.floodMute)    global.client.floodMute    = {};

  const now = Date.now();
  const key = `${threadID}_${senderID}`;

  // ── Mute check: warn পেলে এতক্ষণ delete করো ──
  if (global.client.floodMute[key]) {
    const muteUntil = global.client.floodMute[key];
    if (now < muteUntil) {
      try { await api.unsendMessage(messageID); } catch (_) {}
      return; // silently delete during mute
    } else {
      delete global.client.floodMute[key]; // mute শেষ
    }
  }

  // ── Message count tracking ──
  if (!global.client.floodTracker[key]) {
    global.client.floodTracker[key] = { start: now, count: 0, msgs: [] };
  }

  const tracker = global.client.floodTracker[key];

  // Window reset
  if (now - tracker.start > FLOOD.window * 1000) {
    global.client.floodTracker[key] = { start: now, count: 1, msgs: [messageID] };
    return;
  }

  tracker.count++;
  tracker.msgs.push(messageID);

  // ── Flood detected! ──
  if (tracker.count >= FLOOD.msgLimit) {
    // Reset tracker
    const floodedMsgs = [...tracker.msgs];
    global.client.floodTracker[key] = { start: now, count: 0, msgs: [] };

    // Delete flooded messages
    for (const mid of floodedMsgs) {
      try { await api.unsendMessage(mid); } catch (_) {}
    }

    const dataUser = await Users.getData(senderID) || {};
    const userName = dataUser.name || senderID;

    // Warn counter
    global.client.floodWarns[key] = (global.client.floodWarns[key] || 0) + 1;
    const warnCount = global.client.floodWarns[key];

    // ── 1st / 2nd warn: mute ──
    if (warnCount < FLOOD.warnLimit) {
      global.client.floodMute[key] = now + (FLOOD.muteTime * 1000);
      addLog({ name: userName, uid: senderID, box: threadID, action: "warn" });
      return api.sendMessage(
        `🌊 FLOOD DETECTED! ⚠️ (${warnCount}/${FLOOD.warnLimit})\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `👤 ${userName}\n` +
        `❌ ${tracker.count} টা message একসাথে পাঠিয়েছে!\n` +
        `🔇 ${FLOOD.muteTime} সেকেন্ডের জন্য muted!\n` +
        `⚠️ আর ${FLOOD.warnLimit - warnCount} বার করলে KICK!`,
        threadID
      );
    }

    // ── Final warn: kick (+ optional ban) ──
    global.client.floodWarns[key] = 0;
    delete global.client.floodMute[key];

    // Kick
    try { await api.removeUserFromGroup(parseInt(senderID), threadID); } catch (_) {}

    // Ban (if enabled)
    if (FLOOD.banAfterKick) {
      const moment = require("moment-timezone");
      const timeDate = moment.tz("Asia/Dhaka").format("DD/MM/YYYY HH:mm:ss");
      const data = dataUser.data || {};
      data.banned    = true;
      data.reason    = `Flood (${FLOOD.msgLimit} msg/${FLOOD.window}s) repeated`;
      data.dateAdded = timeDate;
      await Users.setData(senderID, { data });
      global.data.userBanned?.set(senderID, { reason: data.reason, dateAdded: timeDate });
    }

    addLog({ name: userName, uid: senderID, box: threadID, action: FLOOD.banAfterKick ? "ban" : "kick" });

    return api.sendMessage(
      `🌊 FLOOD → ${FLOOD.banAfterKick ? "KICKED + BANNED" : "KICKED"} 🚫\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `👤 ${userName}\n` +
      `🆔 ${senderID}\n` +
      `📌 Reason: Repeated message flooding\n` +
      `🗑️ ${floodedMsgs.length} টা message delete করা হয়েছে।`,
      threadID,
      () => {
        for (const ad of ADMINBOT) {
          api.sendMessage(
            `🌊 FLOOD ACTION\n👤 ${userName}\n🆔 ${senderID}\n📦 ${threadID}\n` +
            `📌 ${FLOOD.msgLimit} msg/${FLOOD.window}s\n🚫 ${FLOOD.banAfterKick ? "Kicked + Banned" : "Kicked"}`,
            ad
          );
        }
      }
    );
  }
};
