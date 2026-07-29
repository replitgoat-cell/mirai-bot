const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.join(process.cwd(), "config.json");

function ensureConfig() {
  if (!global.config.whiteListModeThread) {
    global.config.whiteListModeThread = {
      enable: false,
      whiteListThreadIds: []
    };
  }
}

function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(global.config, null, 2));
  } catch {}
}

module.exports.config = {
  name: "twl",
  version: "4.0.0",
  hasPermssion: 2,
  credits: "Sagor",
  description: "Thread whitelist system",
  commandCategory: "system",
  usages: "on/off/add/remove/list",
  cooldowns: 3
};

module.exports.run = async function ({ api, event, args }) {
  ensureConfig();

  const wl = global.config.whiteListModeThread;
  const cmd = (args[0] || "").toLowerCase();
  const currentTID = event.threadID;
  const targetTID = args[1] || currentTID;

  if (cmd === "on") {
    wl.enable = true;
    saveConfig();
    return api.sendMessage("TWL ON", currentTID);
  }

  if (cmd === "off") {
    wl.enable = false;
    saveConfig();
    return api.sendMessage("TWL OFF", currentTID);
  }

  if (cmd === "add") {
    if (!wl.whiteListThreadIds.includes(targetTID)) {
      wl.whiteListThreadIds.push(targetTID);
      saveConfig();
    }
    return api.sendMessage(`Added: ${targetTID}`, currentTID);
  }

  if (cmd === "remove") {
    wl.whiteListThreadIds = wl.whiteListThreadIds.filter(id => id !== targetTID);
    saveConfig();
    return api.sendMessage(`Removed: ${targetTID}`, currentTID);
  }

  if (cmd === "list") {
    if (!wl.whiteListThreadIds.length)
      return api.sendMessage("TWL empty", currentTID);

    let msg = "TWL List:\n";

    for (let i = 0; i < wl.whiteListThreadIds.length; i++) {
      const id = wl.whiteListThreadIds[i];
      let name = "Unknown";

      try {
        const info = await api.getThreadInfo(id);
        name = info.threadName || "Unnamed";
      } catch {}

      msg += `${i + 1}. ${name} - ${id}\n`;
    }

    return api.sendMessage(msg.trim(), currentTID);
  }

  return api.sendMessage(
    "twl on\ntwl off\ntwl add [tid]\ntwl remove [tid]\ntwl list",
    currentTID
  );
};