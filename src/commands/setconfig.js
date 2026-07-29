const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
    name: "setconfig",
    version: "2.0.0",
    hasPermssion: 2,
    credits: "SaGor",
    description: "Change any config.json value at runtime",
    commandCategory: "admin",
    usages: "[key] [value] | list | reset [key]",
    cooldowns: 3,
};

module.exports.languages = {
    vi: {},
    en: {},
};

function getNestedValue(obj, keyPath) {
    return keyPath.split(".").reduce((cur, k) => (cur != null ? cur[k] : undefined), obj);
}

function setNestedValue(obj, keyPath, value) {
    const keys = keyPath.split(".");
    let cur = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        if (cur[keys[i]] == null || typeof cur[keys[i]] !== "object") cur[keys[i]] = {};
        cur = cur[keys[i]];
    }
    cur[keys[keys.length - 1]] = value;
}

function deleteNestedValue(obj, keyPath) {
    const keys = keyPath.split(".");
    let cur = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        if (cur[keys[i]] == null) return false;
        cur = cur[keys[i]];
    }
    if (cur[keys[keys.length - 1]] === undefined) return false;
    delete cur[keys[keys.length - 1]];
    return true;
}

function parseValue(raw) {
    const lower = raw.toLowerCase().trim();
    if (lower === "true") return true;
    if (lower === "false") return false;
    if (lower === "null") return null;
    if (!isNaN(raw) && raw.trim() !== "") return Number(raw);
    try { return JSON.parse(raw); } catch (_) {}
    return raw;
}

function saveConfig() {
    const cfgPath = global.client.configPath || path.join(process.cwd(), "config.json");
    fs.writeFileSync(cfgPath, JSON.stringify(global.config, null, 4), "utf8");
    try { fs.writeFileSync(cfgPath + ".temp", JSON.stringify(global.config, null, 4), "utf8"); } catch (_) {}
}

function buildConfigList() {
    const skip = ["FCAOption"];
    const lines = [];
    for (const k of Object.keys(global.config)) {
        if (skip.includes(k)) continue;
        const val = global.config[k];
        let display;
        if (Array.isArray(val)) display = `[${val.join(", ")}]`;
        else if (typeof val === "object" && val !== null) display = "{...}";
        else display = String(val);
        if (display.length > 60) display = display.slice(0, 57) + "...";
        lines.push(`• ${k}: ${display}`);
    }
    return lines.join("\n");
}

module.exports.run = async ({ api, event, args }) => {
    const { threadID, messageID } = event;
    const reply = (msg) => api.sendMessage(msg, threadID, messageID);

    if (!args[0] || args[0].toLowerCase() === "list") {
        return reply(
            `⚙️ CONFIG.JSON — ALL SETTINGS\n${"─".repeat(32)}\n${buildConfigList()}\n${"─".repeat(32)}\n📌 Usage:\n• setconfig [key] [value]\n• setconfig [nested.key] [value]\n• setconfig reset [key]\n• setconfig list\n\n💡 Examples:\n• setconfig PREFIX !\n• setconfig adminOnly true\n• setconfig BOTNAME MyBot\n• setconfig database.type sqlite\n• setconfig spamProtection.commandThreshold 10`
        );
    }

    if (args[0].toLowerCase() === "reset" && args[1]) {
        const key = args[1];
        const old = getNestedValue(global.config, key);
        if (old === undefined) return reply(`❌ Key "${key}" not found in config!`);
        try {
            deleteNestedValue(global.config, key);
            saveConfig();
            return reply(`✅ Config key "${key}" removed!\n⚠️ Restart bot to apply if needed.`);
        } catch (e) {
            return reply(`❌ Failed to reset: ${e.message}`);
        }
    }

    if (args.length === 1) {
        const key = args[0];
        const val = getNestedValue(global.config, key);
        if (val === undefined) return reply(`❌ Key "${key}" not found!\n\nUse: setconfig list`);
        const display = typeof val === "object" ? JSON.stringify(val, null, 2) : String(val);
        return reply(`🔍 config.${key}:\n${display}`);
    }

    const key = args[0];
    const rawValue = args.slice(1).join(" ").trim();
    const parsedValue = parseValue(rawValue);
    const oldValue = getNestedValue(global.config, key);

    try {
        setNestedValue(global.config, key, parsedValue);
        saveConfig();
        const displayNew = typeof parsedValue === "object" ? JSON.stringify(parsedValue) : String(parsedValue);
        const displayOld = oldValue === undefined ? "(not set)" : typeof oldValue === "object" ? JSON.stringify(oldValue) : String(oldValue);
        return reply(
            `✅ Config Updated!\n${"─".repeat(28)}\n🔑 Key: ${key}\n📤 Old: ${displayOld}\n📥 New: ${displayNew}\n${"─".repeat(28)}\n💾 Saved to config.json`
        );
    } catch (e) {
        return reply(`❌ Error setting config: ${e.message}`);
    }
};
