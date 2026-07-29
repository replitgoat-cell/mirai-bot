// ╔══════════════════════════════════════╗
// ║    WORD FILTER SYSTEM v2.0.0         ║
// ║       Created by SaGor               ║
// ╚══════════════════════════════════════╝

const fs = require("fs-extra");
const path = require("path");
const FILTER_PATH = path.join(__dirname, "cache", "wordfilter.json");

// Default banned words (বাংলা + English)
const DEFAULT_WORDS = [
  "শালা", "হারামি", "বেয়াদব", "কুত্তা", "মাদারচোদ",
  "বাল", "ফালতু", "গাধা", "stupid", "idiot", "bastard",
  "fuck", "shit", "bitch", "asshole", "damn"
];

function loadFilter() {
  if (!fs.existsSync(FILTER_PATH)) {
    fs.writeFileSync(FILTER_PATH, JSON.stringify({
      global: DEFAULT_WORDS,
      threads: {}
    }, null, 2));
  }
  return JSON.parse(fs.readFileSync(FILTER_PATH));
}

function saveFilter(data) {
  fs.writeFileSync(FILTER_PATH, JSON.stringify(data, null, 2));
}

function containsBadWord(text, wordList) {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const word of wordList) {
    if (lower.includes(word.toLowerCase())) return word;
  }
  return null;
}

module.exports.config = {
  name: "wordfilter",
  version: "2.0.0",
  hasPermssion: 1,
  credits: "SaGor",
  description: "🚫 Word filter system - গ্রুপে খারাপ শব্দ ব্লক করে",
  commandCategory: "Security",
  usages: "wordfilter [add/remove/list/reset] [word]",
  cooldowns: 3
};

// ── Event handler: সব message চেক করে ──
module.exports.handleEvent = async function ({ api, event, Users }) {
  const { senderID, threadID, body, messageID } = event;
  if (!body) return;

  const ADMINBOT = global.config?.ADMINBOT || [];
  const NDH      = global.config?.NDH || [];
  if (ADMINBOT.includes(senderID) || NDH.includes(senderID)) return;

  const filter   = loadFilter();
  const threadWords = filter.threads[threadID] || [];
  const allWords = [...new Set([...filter.global, ...threadWords])];

  const matched = containsBadWord(body, allWords);
  if (!matched) return;

  // message delete করো
  try { await api.unsendMessage(messageID); } catch (_) {}

  // warn counter
  if (!global.client.filterWarns) global.client.filterWarns = {};
  const wKey = `${threadID}_${senderID}`;
  global.client.filterWarns[wKey] = (global.client.filterWarns[wKey] || 0) + 1;
  const warnCount = global.client.filterWarns[wKey];

  const userName = (await Users.getData(senderID))?.name || senderID;

  if (warnCount >= 3) {
    // 3rd offense → kick
    global.client.filterWarns[wKey] = 0;
    try { await api.removeUserFromGroup(senderID, threadID); } catch (_) {}
    return api.sendMessage(
      `🚫 KICKED!\n━━━━━━━━━━━━━━━━━━━\n` +
      `👤 ${userName}\n` +
      `❌ খারাপ শব্দ ব্যবহার করেছে ৩ বার।\n` +
      `📌 Last word: "${matched}"`,
      threadID
    );
  }

  return api.sendMessage(
    `⚠️ সতর্কতা! (${warnCount}/3)\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `👤 ${userName}, খারাপ ভাষা ব্যবহার নিষেধ!\n` +
    `🚫 Word: "${matched}" blocked\n` +
    `❗ ${3 - warnCount} বার আর করলে kick!`,
    threadID
  );
};

// ── Command handler ──
module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const ADMINBOT = global.config?.ADMINBOT || [];
  const threadInfo = await api.getThreadInfo(threadID);
  const isAdmin = threadInfo.adminIDs.some(a => a.id == senderID) || ADMINBOT.includes(senderID);

  if (!isAdmin) {
    return api.sendMessage("❌ Only group admins can manage word filter.", threadID, messageID);
  }

  const filter = loadFilter();
  if (!filter.threads[threadID]) filter.threads[threadID] = [];

  const sub  = args[0]?.toLowerCase();
  const word = args.slice(1).join(" ").trim().toLowerCase();

  switch (sub) {
    case "add": {
      if (!word) return api.sendMessage("❌ Usage: wordfilter add [word]", threadID, messageID);
      if (filter.threads[threadID].includes(word)) {
        return api.sendMessage(`⚠️ "${word}" already in filter list.`, threadID, messageID);
      }
      filter.threads[threadID].push(word);
      saveFilter(filter);
      return api.sendMessage(
        `✅ Word Added!\n━━━━━━━━━━━━━━━━━━━\n🚫 "${word}" এখন এই গ্রুপে blocked।`,
        threadID, messageID
      );
    }

    case "remove":
    case "rm": {
      if (!word) return api.sendMessage("❌ Usage: wordfilter remove [word]", threadID, messageID);
      const idx = filter.threads[threadID].indexOf(word);
      if (idx === -1) {
        return api.sendMessage(`⚠️ "${word}" not found in this group's filter.`, threadID, messageID);
      }
      filter.threads[threadID].splice(idx, 1);
      saveFilter(filter);
      return api.sendMessage(`✅ Removed "${word}" from filter.`, threadID, messageID);
    }

    case "list": {
      const threadWords = filter.threads[threadID] || [];
      const globalWords = filter.global;
      let msg = `📋 Word Filter List\n━━━━━━━━━━━━━━━━━━━\n`;
      msg += `🌐 Global (${globalWords.length}): ${globalWords.join(", ") || "none"}\n\n`;
      msg += `📦 This Group (${threadWords.length}): ${threadWords.join(", ") || "none"}`;
      return api.sendMessage(msg, threadID, messageID);
    }

    case "reset": {
      filter.threads[threadID] = [];
      saveFilter(filter);
      return api.sendMessage("🔄 This group's custom word filter has been reset.", threadID, messageID);
    }

    default: {
      return api.sendMessage(
        `🚫 Word Filter System\n━━━━━━━━━━━━━━━━━━━\n` +
        `• wordfilter add [word]\n` +
        `• wordfilter remove [word]\n` +
        `• wordfilter list\n` +
        `• wordfilter reset`,
        threadID, messageID
      );
    }
  }
};
