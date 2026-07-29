// ╔══════════════════════════════════════════╗
// ║    SUSPICIOUS USER ALERT SYSTEM v1.0.0   ║
// ║              by SaGor                    ║
// ╚══════════════════════════════════════════╝
// Suspicious হলে:
//  → নতুন account (UID pattern)
//  → Profile picture নেই
//  → Join করেই link পাঠায়
//  → অনেক group-এ একসাথে join
//  → খুব দ্রুত message পাঠায় (bot-like behavior)
//  → Suspicious keyword in name

const fs   = require("fs-extra");
const path = require("path");

const SUSPECT_LOG  = path.join(__dirname, "cache", "suspect_log.json");
const SUSPECT_DATA = path.join(__dirname, "cache", "suspect_data.json");

// ─── Suspicious name keywords ────────────────
const SUSPICIOUS_NAMES = [
  "admin", "support", "official", "giveaway", "free",
  "prize", "winner", "claim", "help desk", "bot",
  "verify", "security", "facebook", "fb support"
];

// ─── Suspicious message patterns ─────────────
const SUSPICIOUS_PATTERNS = [
  /free\s*(robux|gift|coin|money|taka)/i,
  /click\s*(here|link)/i,
  /you\s*(won|win|have\s*won)/i,
  /claim\s*your/i,
  /\d{5,}\s*tk/i,
  /bit\.ly|tinyurl|cutt\.ly/i,
  /(whatsapp|telegram)\s*group\s*join/i
];

// ─── Helpers ─────────────────────────────────
function loadLog() {
  try {
    if (!fs.existsSync(SUSPECT_LOG)) return [];
    return JSON.parse(fs.readFileSync(SUSPECT_LOG)) || [];
  } catch { return []; }
}
function saveLog(d) {
  try { fs.writeFileSync(SUSPECT_LOG, JSON.stringify(d, null, 2)); } catch (_) {} 
}
function loadData() {
  try {
    if (!fs.existsSync(SUSPECT_DATA)) return {};
    return JSON.parse(fs.readFileSync(SUSPECT_DATA)) || {};
  } catch { return {}; }
}
function saveData(d) {
  try { fs.writeFileSync(SUSPECT_DATA, JSON.stringify(d, null, 2)); } catch (_) {}
}
function addLog(entry) {
  const moment = require("moment-timezone");
  const log = loadLog();
  log.unshift({ ...entry, time: moment.tz("Asia/Dhaka").format("DD/MM HH:mm:ss") });
  if (log.length > 200) log.length = 200;
  saveLog(log);
}

// ── Suspicion score calculator ─────────────
function calcScore(flags) {
  const weights = {
    newAccount:      30,
    noProfilePic:    25,
    suspiciousName:  20,
    linkOnJoin:      25,
    suspiciousMsg:   30,
    rapidMsg:        15,
    mentionSpam:     20
  };
  let score = 0;
  for (const flag of flags) {
    score += weights[flag] || 10;
  }
  return score;
}

// ── Risk level ────────────────────────────
function riskLevel(score) {
  if (score >= 70) return { level: "🔴 HIGH",   action: "alert+kick" };
  if (score >= 40) return { level: "🟡 MEDIUM", action: "alert" };
  return              { level: "🟢 LOW",    action: "log" };
}

// ── Module config ─────────────────────────
module.exports.config = {
  name: "suspectwatch",
  version: "1.0.0",
  hasPermssion: 1,
  credits: "SaGor",
  description: "👁️ Suspicious User Detection & Alert System",
  commandCategory: "Security",
  usages: "suspectwatch [on/off/log/check/clear]",
  cooldowns: 3
};

// ── Command ───────────────────────────────
module.exports.run = async function ({ api, event, args, Threads, Users }) {
  const { threadID, messageID, senderID } = event;
  const ADMINBOT = global.config?.ADMINBOT || [];
  const threadInfo = await api.getThreadInfo(threadID);
  const isAdmin = threadInfo.adminIDs.some(a => a.id == senderID) || ADMINBOT.includes(senderID);

  if (!isAdmin) {
    return api.sendMessage("❌ Only group admins can use SuspectWatch.", threadID, messageID);
  }

  const threadData = (await Threads.getData(threadID)).data || {};
  const sub = args[0]?.toLowerCase();

  switch (sub) {

    case "on": {
      threadData.suspectwatch = true;
      await Threads.setData(threadID, { data: threadData });
      return api.sendMessage(
        `👁️ SuspectWatch ENABLED ✅\n━━━━━━━━━━━━━━━━━━━\n` +
        `🔍 Monitoring: New members, links, rapid msg, suspicious names\n` +
        `🔴 High risk (70+) → Alert + Kick\n` +
        `🟡 Medium risk (40+) → Alert only\n` +
        `🟢 Low risk → Silent log`,
        threadID, messageID
      );
    }

    case "off": {
      threadData.suspectwatch = false;
      await Threads.setData(threadID, { data: threadData });
      return api.sendMessage("👁️ SuspectWatch DISABLED ❌", threadID, messageID);
    }

    case "log": {
      const logs = loadLog().slice(0, 10);
      if (!logs.length) return api.sendMessage("📋 No suspicious users detected yet.", threadID, messageID);

      let msg = `👁️ Suspect Log (last 10)\n━━━━━━━━━━━━━━━━━━━\n`;
      for (const l of logs) {
        msg += `${l.risk} | ${l.name}\n`;
        msg += `🆔 ${l.uid}\n`;
        msg += `📌 Flags: ${l.flags.join(", ")}\n`;
        msg += `🎯 Score: ${l.score}/100\n`;
        msg += `📅 ${l.time}\n\n`;
      }
      return api.sendMessage(msg, threadID, messageID);
    }

    case "check": {
      // manually check a user by reply or mention
      let targetID = null;
      if (event.messageReply) targetID = String(event.messageReply.senderID);
      else if (Object.keys(event.mentions || {}).length) targetID = Object.keys(event.mentions)[0];
      else if (args[1] && /^\d+$/.test(args[1])) targetID = args[1];

      if (!targetID) return api.sendMessage("⚠️ Reply, mention, or provide UID to check.", threadID, messageID);

      const data = loadData();
      const record = data[targetID];
      const userName = (await Users.getData(targetID))?.name || targetID;

      if (!record) {
        return api.sendMessage(
          `👁️ User Check\n━━━━━━━━━━━━━━━━━━━\n` +
          `👤 ${userName} (${targetID})\n` +
          `✅ No suspicious activity recorded.`,
          threadID, messageID
        );
      }

      const { level } = riskLevel(record.score || 0);
      return api.sendMessage(
        `👁️ Suspect Check\n━━━━━━━━━━━━━━━━━━━\n` +
        `👤 ${userName}\n` +
        `🆔 ${targetID}\n` +
        `🎯 Risk Score: ${record.score || 0}/100\n` +
        `${level}\n` +
        `📌 Flags: ${(record.flags || []).join(", ") || "none"}\n` +
        `📅 First seen: ${record.firstSeen || "unknown"}`,
        threadID, messageID
      );
    }

    case "clear": {
      if (!ADMINBOT.includes(senderID)) {
        return api.sendMessage("❌ Bot Admin only.", threadID, messageID);
      }
      saveData({});
      saveLog([]);
      return api.sendMessage("🗑️ Suspect data cleared.", threadID, messageID);
    }

    default: {
      return api.sendMessage(
        `👁️ SUSPECTWATCH SYSTEM\n━━━━━━━━━━━━━━━━━━━\n` +
        `• suspectwatch on     → চালু করো\n` +
        `• suspectwatch off    → বন্ধ করো\n` +
        `• suspectwatch log    → সন্দেহজনক list\n` +
        `• suspectwatch check  → user check করো\n` +
        `• suspectwatch clear  → data মুছো`,
        threadID, messageID
      );
    }
  }
};

// ── Event handler: monitor all activity ──
module.exports.handleEvent = async function ({ api, event, Users, Threads }) {
  const { senderID, threadID, body } = event;

  const ADMINBOT = global.config?.ADMINBOT || [];
  const NDH      = global.config?.NDH      || [];
  if (ADMINBOT.includes(senderID) || NDH.includes(senderID)) return;
  if (global.data.userBanned?.has(senderID)) return;

  const threadData = (await Threads.getData(threadID)).data || {};
  if (!threadData.suspectwatch) return;

  const moment = require("moment-timezone");
  const now = Date.now();
  const key = `${threadID}_${senderID}`;

  if (!global.client.suspectTracker) global.client.suspectTracker = {};

  const flags = [];

  // ─── FLAG 1: New member join ─────────────
  if (event.type === "log:subscribe") {
    const addedUsers = event.logMessageData?.addedParticipants || [];
    for (const user of addedUsers) {
      const uid = String(user.userFbId);
      if (ADMINBOT.includes(uid) || NDH.includes(uid)) continue;

      const joinFlags = [];

      // New account detection (UID < certain threshold = older account, very high = newer)
      // Facebook UIDs: newer accounts have longer/higher UIDs
      if (parseInt(uid) > 100070000000000) joinFlags.push("newAccount");

      // Suspicious name check
      const name = (user.fullName || "").toLowerCase();
      if (SUSPICIOUS_NAMES.some(kw => name.includes(kw))) joinFlags.push("suspiciousName");

      // Track join time
      global.client.suspectTracker[`join_${uid}_${threadID}`] = now;

      if (joinFlags.length > 0) {
        await recordSuspect(uid, joinFlags, threadID, Users, api, ADMINBOT);
      }
    }
    return;
  }

  // ─── FLAG 2: Link sent right after join ──
  if (body) {
    const joinTime = global.client.suspectTracker[`join_${senderID}_${threadID}`];
    const linkRegex = /(https?:\/\/|www\.)\S+/gi;
    if (joinTime && (now - joinTime < 120000) && linkRegex.test(body)) {
      flags.push("linkOnJoin");
    }

    // ─── FLAG 3: Suspicious message patterns ─
    if (SUSPICIOUS_PATTERNS.some(rx => rx.test(body))) {
      flags.push("suspiciousMsg");
    }

    // ─── FLAG 4: Rapid message (bot-like) ────
    if (!global.client.suspectTracker[key]) {
      global.client.suspectTracker[key] = { lastMsg: now, rapidCount: 0 };
    }
    const st = global.client.suspectTracker[key];
    if (now - st.lastMsg < 1500) { // less than 1.5s between messages
      st.rapidCount = (st.rapidCount || 0) + 1;
      if (st.rapidCount >= 4) flags.push("rapidMsg");
    } else {
      st.rapidCount = 0;
    }
    st.lastMsg = now;

    // ─── FLAG 5: Mass mention spam ────────────
    const mentionCount = Object.keys(event.mentions || {}).length;
    if (mentionCount >= 8) flags.push("mentionSpam");
  }

  if (flags.length > 0) {
    await recordSuspect(senderID, flags, threadID, Users, api, ADMINBOT);
  }
};

// ── Record & Alert ────────────────────────
async function recordSuspect(uid, newFlags, threadID, Users, api, ADMINBOT) {
  const data = loadData();
  const moment = require("moment-timezone");

  if (!data[uid]) {
    data[uid] = { flags: [], score: 0, firstSeen: moment.tz("Asia/Dhaka").format("DD/MM HH:mm") };
  }

  // Merge flags (no duplicates)
  for (const f of newFlags) {
    if (!data[uid].flags.includes(f)) data[uid].flags.push(f);
  }
  data[uid].score = calcScore(data[uid].flags);
  saveData(data);

  const score    = data[uid].score;
  const { level, action } = riskLevel(score);
  const userName = (await Users.getData(uid))?.name || uid;

  addLog({
    name: userName,
    uid,
    box: threadID,
    flags: data[uid].flags,
    score,
    risk: level
  });

  // ── Low risk: silent log ──
  if (action === "log") return;

  // ── Medium risk: alert admins ──
  const alertMsg =
    `👁️ SUSPICIOUS USER DETECTED!\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `👤 ${userName}\n` +
    `🆔 ${uid}\n` +
    `📦 Thread: ${threadID}\n` +
    `${level}\n` +
    `🎯 Score: ${score}/100\n` +
    `📌 Flags: ${data[uid].flags.join(", ")}\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    (action === "alert+kick"
      ? `🚫 AUTO-KICKED for HIGH risk!`
      : `⚠️ Monitoring... Use 'suspectwatch check @user'`);

  // Alert in group
  api.sendMessage(alertMsg, threadID);

  // Alert all bot admins
  for (const ad of ADMINBOT) {
    api.sendMessage(alertMsg, ad);
  }

  // ── High risk: kick ──
  if (action === "alert+kick") {
    try { await api.removeUserFromGroup(parseInt(uid), threadID); } catch (_) {}
  }
}
