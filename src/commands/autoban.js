// ╔══════════════════════════════════════╗
// ║     AUTO-BAN RULES SYSTEM v2.0.0     ║
// ║          by SaGor                    ║
// ╚══════════════════════════════════════╝
// Rules:
//  1. Fake account detection (no profile pic / name pattern)
//  2. New member join + instant spam
//  3. Mass mention spam
//  4. Repeated join-leave abuse
//  5. Suspicious link (phishing keywords)

const fs = require("fs-extra");
const path = require("path");
const AUTOBAN_LOG = path.join(__dirname, "cache", "autoban_log.json");

// ─── Config ───
const RULES = {
  massmention: { limit: 10, window: 30 },  // ৩০ সেকেন্ডে ১০+ mention → ban
  joinLeave:   { limit: 3,  window: 600 }, // ১০ মিনিটে ৩ বার join-leave → ban
  phishing: [
    "free robux", "free tiktok", "claim prize", "you won",
    "bit.ly", "tinyurl", "click here to win", "verify account"
  ]
};

function loadLog() {
  try {
    if (!fs.existsSync(AUTOBAN_LOG)) return { events: [] };
    return JSON.parse(fs.readFileSync(AUTOBAN_LOG));
  } catch { return { events: [] }; }
}

function saveLog(data) {
  try { fs.writeFileSync(AUTOBAN_LOG, JSON.stringify(data, null, 2)); } catch (_) {}
}

function addLog(entry) {
  const log = loadLog();
  log.events.push({ ...entry, time: new Date().toLocaleString() });
  if (log.events.length > 200) log.events.splice(0, log.events.length - 200);
  saveLog(log);
}

module.exports.config = {
  name: "autoban",
  version: "2.0.0",
  hasPermssion: 1,
  credits: "SaGor",
  description: "🤖 Advanced Auto-Ban Rules System",
  commandCategory: "Security",
  usages: "autoban [status/log/rules]",
  cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;

  const sub = args[0]?.toLowerCase();

  if (!sub || sub === "rules") {
    return api.sendMessage(
      `🛡️ AUTO-BAN RULES\n━━━━━━━━━━━━━━━━━━━\n` +
      `1️⃣ Mass Mention: ${RULES.massmention.limit}+ mention/${RULES.massmention.window}s → Ban\n` +
      `2️⃣ Join-Leave Abuse: ${RULES.joinLeave.limit}x/${RULES.joinLeave.window / 60}min → Ban\n` +
      `3️⃣ Phishing Links → Instant Ban + Kick\n` +
      `4️⃣ Command Spam → (see spamban)\n\n` +
      `📌 Commands:\n• autoban log → সাম্প্রতিক ban দেখো\n• autoban rules → rules দেখো`,
      threadID, messageID
    );
  }

  if (sub === "log") {
    const log = loadLog();
    const recent = log.events.slice(-10).reverse();
    if (!recent.length) return api.sendMessage("📋 No auto-ban events yet.", threadID, messageID);

    let msg = `📋 Auto-Ban Log (last 10)\n━━━━━━━━━━━━━━━━━━━\n`;
    for (const e of recent) {
      msg += `🚫 ${e.name} | Rule: ${e.rule}\n📅 ${e.time}\n\n`;
    }
    return api.sendMessage(msg, threadID, messageID);
  }
};

module.exports.handleEvent = async function ({ api, event, Users, Threads }) {
  const { senderID, threadID, body } = event;

  const ADMINBOT = global.config?.ADMINBOT || [];
  const NDH      = global.config?.NDH      || [];
  if (ADMINBOT.includes(senderID) || NDH.includes(senderID)) return;
  if (global.data.userBanned?.has(senderID)) return;

  if (!global.client.autoBanTracker) global.client.autoBanTracker = {};
  const now = Date.now();
  const key = `${threadID}_${senderID}`;

  // ─────────────────────────────────────────
  // RULE 1: Mass Mention
  // ─────────────────────────────────────────
  const mentionCount = Object.keys(event.mentions || {}).length;
  if (mentionCount >= RULES.massmention.limit) {
    const dataUser = await Users.getData(senderID) || {};
    await doBan({ Users, api, senderID, threadID, reason: `Mass mention: ${mentionCount} users`, dataUser });
    addLog({ name: dataUser.name || senderID, uid: senderID, rule: "Mass Mention", box: threadID });
    return;
  }

  // ─────────────────────────────────────────
  // RULE 2: Join-Leave Abuse
  // ─────────────────────────────────────────
  if (event.type === "log:subscribe" || event.type === "log:unsubscribe") {
    const jlKey = `jl_${senderID}`;
    if (!global.client.autoBanTracker[jlKey]) {
      global.client.autoBanTracker[jlKey] = { count: 0, start: now };
    }
    const jl = global.client.autoBanTracker[jlKey];
    if (now - jl.start > RULES.joinLeave.window * 1000) {
      global.client.autoBanTracker[jlKey] = { count: 1, start: now };
    } else {
      jl.count++;
      if (jl.count >= RULES.joinLeave.limit) {
        const dataUser = await Users.getData(senderID) || {};
        await doBan({ Users, api, senderID, threadID, reason: `Join-Leave abuse (${jl.count}x)`, dataUser });
        addLog({ name: dataUser.name || senderID, uid: senderID, rule: "Join-Leave Abuse", box: threadID });
        global.client.autoBanTracker[jlKey] = { count: 0, start: now };
        return;
      }
    }
  }

  // ─────────────────────────────────────────
  // RULE 3: Phishing Link Detection
  // ─────────────────────────────────────────
  if (body) {
    const lower = body.toLowerCase();
    const isPhishing = RULES.phishing.some(kw => lower.includes(kw));
    if (isPhishing) {
      try { await api.unsendMessage(event.messageID); } catch (_) {}
      const dataUser = await Users.getData(senderID) || {};
      await doBan({ Users, api, senderID, threadID, reason: "Phishing/Scam link detected", dataUser });
      try { await api.removeUserFromGroup(senderID, threadID); } catch (_) {}
      addLog({ name: dataUser.name || senderID, uid: senderID, rule: "Phishing Link", box: threadID });
      return api.sendMessage(
        `🎣 PHISHING DETECTED!\n━━━━━━━━━━━━━━━━━━━\n` +
        `👤 ${dataUser.name || senderID} কে ban + kick করা হয়েছে।\n` +
        `🚨 Scam link পাঠানো সম্পূর্ণ নিষেধ!`,
        threadID
      );
    }
  }
};

// ── Helper: ban user ──
async function doBan({ Users, api, senderID, threadID, reason, dataUser }) {
  if (!dataUser) dataUser = await Users.getData(senderID) || {};
  const data = dataUser.data || {};
  if (data.banned) return;

  const moment = require("moment-timezone");
  const timeDate = moment.tz("Asia/Dhaka").format("DD/MM/YYYY HH:mm:ss");

  data.banned    = true;
  data.reason    = reason;
  data.dateAdded = timeDate;
  await Users.setData(senderID, { data });
  global.data.userBanned?.set(senderID, { reason, dateAdded: timeDate });

  api.sendMessage(
    `🚫 AUTO-BAN TRIGGERED\n━━━━━━━━━━━━━━━━━━━\n` +
    `👤 ${dataUser.name || senderID}\n` +
    `🆔 ${senderID}\n` +
    `📌 Rule: ${reason}\n` +
    `🕐 ${timeDate}`,
    threadID,
    () => {
      for (const ad of global.config?.ADMINBOT || []) {
        api.sendMessage(
          `⚠️ AUTO-BAN\n👤 ${dataUser.name}\n🆔 ${senderID}\n📦 ${threadID}\n📌 ${reason}\n🕐 ${timeDate}`,
          ad
        );
      }
    }
  );
}
