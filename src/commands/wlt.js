const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.join(process.cwd(), "config.json");

function ensureConfig() {
  if (!global.config.whiteListMode) {
    global.config.whiteListMode = {
      enable: false,
      whiteListIds: []
    };
  }
}

function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(global.config, null, 2));
  } catch {}
}

function getUID(event, args) {
  if (event.type === "message_reply") return event.messageReply.senderID;
  if (event.mentions && Object.keys(event.mentions).length > 0)
    return Object.keys(event.mentions)[0];
  if (args[1]) return args[1];
  return null;
}

module.exports.config = {
  name: "wlt",
  version: "3.0.0",
  hasPermssion: 2,
  credits: "Sagor",
  description: "Whitelist system full control",
  commandCategory: "system",
  usages: "on/off/add/remove/list",
  cooldowns: 3
};

module.exports.run = async function ({ api, event, args }) {
  ensureConfig();

  const wl = global.config.whiteListMode;
  const input = (args[0] || "").toLowerCase();

  if (input === "on") {
    wl.enable = true;
    saveConfig();
    return api.sendMessage("wlt on", event.threadID);
  }

  if (input === "off") {
    wl.enable = false;
    saveConfig();
    return api.sendMessage("wlt off", event.threadID);
  }

  if (input === "add") {
    const uid = getUID(event, args);
    if (!uid) return api.sendMessage("Provide UID / mention / reply", event.threadID);

    if (!wl.whiteListIds.includes(uid)) {
      wl.whiteListIds.push(uid);
      saveConfig();
    }

    return api.sendMessage(`Added: ${uid}`, event.threadID);
  }

  if (input === "remove") {
    const uid = getUID(event, args);
    if (!uid) return api.sendMessage("Provide UID / mention / reply", event.threadID);

    wl.whiteListIds = wl.whiteListIds.filter(id => id !== uid);
    saveConfig();

    return api.sendMessage(`Removed: ${uid}`, event.threadID);
  }

  if (input === "list") {
    if (!wl.whiteListIds.length)
      return api.sendMessage("Whitelist empty", event.threadID);

    let msg = "Whitelist Users:\n";

    for (let i = 0; i < wl.whiteListIds.length; i++) {
      const id = wl.whiteListIds[i];
      let name = "Unknown";

      try {
        const info = await api.getUserInfo(id);
        name = info[id]?.name || "Unknown";
      } catch {}

      msg += `${i + 1}. ${name} - ${id}\n`;
    }

    return api.sendMessage(msg.trim(), event.threadID);
  }

  return api.sendMessage(
    "wlt on\nwlt off\nwlt add @user / reply / uid\nwlt remove @user / reply / uid\nwlt list",
    event.threadID
  );
};