// ╔══════════════════════════════════════╗
// ║      ANTI-SPAM SYSTEM v3.0.0         ║
// ║         Enhanced by SaGor            ║
// ╚══════════════════════════════════════╝

const SPAM_LIMIT    = 7;    // এতবার command দিলে ban
const SPAM_WINDOW   = 15;   // এই সময়ের মধ্যে (seconds)
const LINK_LIMIT    = 3;    // এতবার link পাঠালে warn
const CAPS_LIMIT    = 5;    // এতবার ALL CAPS দিলে warn
const WARN_BEFORE_BAN = 2;  // ban এর আগে কতবার warn

module.exports.config = {
  name: "spamban",
  version: "3.0.0",
  hasPermssion: 0,
  credits: "SaGor",
  description: `🛡️ Advanced Anti-Spam: command spam, link spam, caps lock detection`,
  commandCategory: "System",
  usages: "auto",
  cooldowns: 0
};

module.exports.run = async function ({ api, event }) {
  return api.sendMessage(
    `🛡️ Anti-Spam System Active\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `⚡ Command spam: ${SPAM_LIMIT}x/${SPAM_WINDOW}s → Ban\n` +
    `🔗 Link spam: ${LINK_LIMIT}x → Warn → Kick\n` +
    `🔠 All-Caps: ${CAPS_LIMIT}x → Warn`,
    event.threadID, event.messageID
  );
};

module.exports.handleEvent = async function ({ Users, Threads, api, event }) {
  const { senderID, threadID, body } = event;

  // Bot admin বা ADMINBOT skip
  const ADMINBOT = global.config?.ADMINBOT || [];
  const NDH      = global.config?.NDH || [];
  if (ADMINBOT.includes(senderID) || NDH.includes(senderID)) return;

  // ── tracker init ──
  if (!global.client.spamTracker) global.client.spamTracker = {};
  if (!global.client.warnCount)   global.client.warnCount   = {};
  if (!global.client.linkTracker) global.client.linkTracker = {};
  if (!global.client.capsTracker) global.client.capsTracker = {};

  const now    = Date.now();
  const key    = `${threadID}_${senderID}`;
  const prefix = (global.data.threadData.get(threadID) || {}).PREFIX || global.config.PREFIX;

  // ─────────────────────────────────────────
  // 1. COMMAND SPAM DETECTION
  // ─────────────────────────────────────────
  if (body && body.startsWith(prefix)) {
    if (!global.client.spamTracker[key]) {
      global.client.spamTracker[key] = { start: now, count: 0 };
    }

    const tracker = global.client.spamTracker[key];

    if (now - tracker.start > SPAM_WINDOW * 1000) {
      // window রিসেট
      global.client.spamTracker[key] = { start: now, count: 1 };
    } else {
      tracker.count++;

      // warn threshold
      const warnAt = SPAM_LIMIT - WARN_BEFORE_BAN;
      if (tracker.count === warnAt) {
        return api.sendMessage(
          `⚠️ @${(await Users.getData(senderID))?.name || senderID}\n` +
          `━━━━━━━━━━━━━━━━━━━\n` +
          `🚨 Spam warning! আর ${WARN_BEFORE_BAN} টা command দিলে AUTO-BAN হবে!`,
          threadID,
          () => {},
          senderID
        );
      }

      // ban threshold
      if (tracker.count >= SPAM_LIMIT) {
        return await banUser({ Users, api, senderID, threadID, reason: `Command spam ${SPAM_LIMIT}x/${SPAM_WINDOW}s` });
      }
    }
  }

  // ─────────────────────────────────────────
  // 2. LINK SPAM DETECTION
  // ─────────────────────────────────────────
  const linkRegex = /(https?:\/\/|www\.)\S+/gi;
  const threadData = (await Threads.getData(threadID)).data || {};

  if (threadData.antilinkEnabled && body && linkRegex.test(body)) {
    if (!global.client.linkTracker[key]) {
      global.client.linkTracker[key] = { start: now, count: 0 };
    }
    const lt = global.client.linkTracker[key];
    if (now - lt.start > 60000) {
      global.client.linkTracker[key] = { start: now, count: 1 };
    } else {
      lt.count++;
      if (lt.count >= LINK_LIMIT) {
        try { await api.unsendMessage(event.messageID); } catch (_) {}
        try { await api.removeUserFromGroup(senderID, threadID); } catch (_) {}
        return api.sendMessage(
          `🔗❌ Link spam detected!\n${(await Users.getData(senderID))?.name || senderID} কে kick করা হয়েছে।`,
          threadID
        );
      } else {
        try { await api.unsendMessage(event.messageID); } catch (_) {}
        return api.sendMessage(
          `⚠️ Link পাঠানো নিষেধ! (${lt.count}/${LINK_LIMIT}) আর ${LINK_LIMIT - lt.count} বার দিলে kick!`,
          threadID
        );
      }
    }
  }

  // ─────────────────────────────────────────
  // 3. ALL-CAPS DETECTION
  // ─────────────────────────────────────────
  if (body && body.length > 10) {
    const letters = body.replace(/[^a-zA-Z]/g, "");
    if (letters.length > 5 && letters === letters.toUpperCase()) {
      if (!global.client.capsTracker[key]) {
        global.client.capsTracker[key] = { start: now, count: 0 };
      }
      const ct = global.client.capsTracker[key];
      if (now - ct.start > 120000) {
        global.client.capsTracker[key] = { start: now, count: 1 };
      } else {
        ct.count++;
        if (ct.count >= CAPS_LIMIT) {
          global.client.capsTracker[key] = { start: now, count: 0 };
          return api.sendMessage(
            `🔠 ALL CAPS spam! Please type normally. Warning issued.`,
            threadID, event.messageID
          );
        }
      }
    }
  }
};

// ── Helper: ban user ──
async function banUser({ Users, api, senderID, threadID, reason }) {
  const moment = require("moment-timezone");
  const timeDate = moment.tz("Asia/Dhaka").format("DD/MM/YYYY HH:mm:ss");
  let dataUser = await Users.getData(senderID) || {};
  let data = dataUser.data || {};
  if (data.banned) return;

  data.banned    = true;
  data.reason    = reason;
  data.dateAdded = timeDate;
  await Users.setData(senderID, { data });
  global.data.userBanned.set(senderID, { reason, dateAdded: timeDate });

  api.sendMessage(
    `🚫 AUTO-BAN\n━━━━━━━━━━━━━━━━━━━\n` +
    `👤 ${dataUser.name || senderID}\n` +
    `🆔 ${senderID}\n` +
    `📌 Reason: ${reason}\n` +
    `🕐 Time: ${timeDate}\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `✅ Admin-দের জানানো হয়েছে।`,
    threadID,
    () => {
      for (const ad of global.config.ADMINBOT || []) {
        api.sendMessage(
          `⚠️ SPAM BAN ALERT\n👤 ${dataUser.name}\n🆔 ${senderID}\n📦 Box: ${threadID}\n📌 ${reason}\n🕐 ${timeDate}`,
          ad
        );
      }
    }
  );
}
