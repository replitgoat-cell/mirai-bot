// ╔══════════════════════════════════════╗
// ║   ADMIN PERMISSION SYSTEM v2.0.0     ║
// ║          by SaGor                    ║
// ╚══════════════════════════════════════╝
// Permission Levels:
//   0 = Everyone
//   1 = Group Admin
//   2 = Bot Admin (ADMINBOT)
//   3 = Super Admin (NDH/Owner)

const fs = require("fs-extra");

function systemBox(title, text) {
  return `╭─── ${title} ───╮\n\n${text}\n\n╰─────────────────╯`;
}

const ADMIN_BOX    = (t) => systemBox("🎀 〔 ADMIN SYSTEM 〕", t);
const SECURITY_BOX = (t) => systemBox("🔐 〔 SECURITY 〕", t);
const BOT_BOX      = (t) => systemBox("🤖 〔 BOT STATUS 〕", t);
const PERM_BOX     = (t) => systemBox("⚡ 〔 PERMISSIONS 〕", t);

module.exports.config = {
  name: "admin",
  version: "2.0.0",
  hasPermssion: 0,
  credits: "SaGor",
  description: "🔐 Advanced Admin & Permission Manager",
  commandCategory: "Admin",
  usages: "admin [list/add/remove/promote/demote/perm/log]",
  cooldowns: 3
};

module.exports.run = async function ({ api, event, args, Users, permssion }) {
  try {
    const { threadID, messageID, mentions, senderID } = event;
    const configPath = global.client.configPath;

    delete require.cache[require.resolve(configPath)];
    const config = require(configPath);

    config.ADMINBOT = Array.isArray(config.ADMINBOT) ? config.ADMINBOT.map(String) : [];
    config.NDH      = Array.isArray(config.NDH)      ? config.NDH.map(String)      : [];

    const saveConfig = () => {
      fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
      global.config.ADMINBOT = [...config.ADMINBOT];
      global.config.NDH      = [...config.NDH];
    };

    const getTargetIDs = () => {
      const mentionIDs = Object.keys(mentions || {}).map(String);
      if (mentionIDs.length) return mentionIDs;
      if (event.messageReply) return [String(event.messageReply.senderID)];
      if (args[1] && /^\d+$/.test(args[1])) return [args[1]];
      return [];
    };

    const getUserName = async (id) => {
      try {
        return (await Users.getData(String(id)))?.name || String(id);
      } catch { return String(id); }
    };

    // Permission level detect
    const getPermLevel = (uid) => {
      if (config.NDH.includes(String(uid))) return 3;
      if (config.ADMINBOT.includes(String(uid))) return 2;
      return 0;
    };

    if (!args[0]) {
      return api.sendMessage(
        ADMIN_BOX(
`ADMIN COMMANDS
━━━━━━━━━━━━━━━━━━
• admin list          → সব admin দেখো
• admin add @tag      → Bot Admin বানাও
• admin remove @tag   → Admin সরাও
• admin promote @tag  → Super Admin বানাও
• admin demote @tag   → Super Admin থেকে নামাও
• admin perm          → Permission levels দেখো
• admin log           → Admin activity log`
        ),
        threadID, messageID
      );
    }

    switch (args[0].toLowerCase()) {

      // ── LIST ──
      case "list": {
        let superText = "";
        let botText   = "";

        for (const id of config.NDH) {
          const name = await getUserName(id);
          superText += `👑 ${name} (${id})\n`;
        }
        for (const id of config.ADMINBOT) {
          const name = await getUserName(id);
          botText += `🔰 ${name} (${id})\n`;
        }

        return api.sendMessage(
          BOT_BOX(
            `SUPER ADMINS (${config.NDH.length})\n${superText || "  None\n"}\n` +
            `BOT ADMINS (${config.ADMINBOT.length})\n${botText || "  None"}`
          ),
          threadID, messageID
        );
      }

      // ── ADD (Bot Admin) ──
      case "add": {
        if (permssion < 2) {
          return api.sendMessage(SECURITY_BOX("❌ Permission Denied\nBot Admin or higher required."), threadID, messageID);
        }
        const ids = getTargetIDs();
        if (!ids.length) return api.sendMessage(BOT_BOX("⚠️ Tag, reply, or provide a UID."), threadID, messageID);

        let added = [], skipped = [];
        for (const id of ids) {
          if (config.NDH.includes(id)) { skipped.push(id); continue; }
          if (!config.ADMINBOT.includes(id)) {
            config.ADMINBOT.push(id);
            const name = await getUserName(id);
            added.push(`🔰 ${name} (${id})`);
          } else { skipped.push(id); }
        }
        saveConfig();
        logAction(senderID, "add_admin", ids);
        return api.sendMessage(
          ADMIN_BOX(
            `✅ Added ${added.length} Bot Admin(s)\n\n${added.join("\n") || "None added"}` +
            (skipped.length ? `\n\n⚠️ Skipped: ${skipped.length}` : "")
          ),
          threadID, messageID
        );
      }

      // ── REMOVE ──
      case "remove":
      case "rm": {
        if (permssion < 2) {
          return api.sendMessage(SECURITY_BOX("❌ Permission Denied."), threadID, messageID);
        }
        const ids = getTargetIDs();
        if (!ids.length) return api.sendMessage(BOT_BOX("⚠️ Tag, reply, or UID."), threadID, messageID);

        let removed = [];
        for (const id of ids) {
          if (config.NDH.includes(id) && permssion < 3) {
            return api.sendMessage(SECURITY_BOX("❌ Cannot remove Super Admin. Need Super Admin access."), threadID, messageID);
          }
          const idx = config.ADMINBOT.indexOf(id);
          if (idx !== -1) {
            config.ADMINBOT.splice(idx, 1);
            const name = await getUserName(id);
            removed.push(`❌ ${name} (${id})`);
          }
        }
        saveConfig();
        logAction(senderID, "remove_admin", ids);
        return api.sendMessage(
          ADMIN_BOX(`Removed ${removed.length} Admin(s)\n\n${removed.join("\n") || "None found"}`),
          threadID, messageID
        );
      }

      // ── PROMOTE → Super Admin ──
      case "promote": {
        if (permssion < 3) {
          return api.sendMessage(SECURITY_BOX("❌ Only Super Admin can promote."), threadID, messageID);
        }
        const ids = getTargetIDs();
        if (!ids.length) return api.sendMessage(BOT_BOX("⚠️ Tag, reply, or UID."), threadID, messageID);

        let promoted = [];
        for (const id of ids) {
          if (!config.NDH.includes(id)) {
            config.NDH.push(id);
            if (!config.ADMINBOT.includes(id)) config.ADMINBOT.push(id);
            const name = await getUserName(id);
            promoted.push(`👑 ${name} (${id})`);
          }
        }
        saveConfig();
        logAction(senderID, "promote_super", ids);
        return api.sendMessage(
          ADMIN_BOX(`👑 Promoted to Super Admin!\n\n${promoted.join("\n") || "None"}`),
          threadID, messageID
        );
      }

      // ── DEMOTE from Super Admin ──
      case "demote": {
        if (permssion < 3) {
          return api.sendMessage(SECURITY_BOX("❌ Only Super Admin can demote."), threadID, messageID);
        }
        const ids = getTargetIDs();
        if (!ids.length) return api.sendMessage(BOT_BOX("⚠️ Tag, reply, or UID."), threadID, messageID);

        let demoted = [];
        for (const id of ids) {
          const idx = config.NDH.indexOf(id);
          if (idx !== -1) {
            config.NDH.splice(idx, 1);
            const name = await getUserName(id);
            demoted.push(`🔰 ${name} (${id}) → Bot Admin`);
          }
        }
        saveConfig();
        logAction(senderID, "demote_super", ids);
        return api.sendMessage(
          ADMIN_BOX(`Demoted from Super Admin:\n\n${demoted.join("\n") || "None found"}`),
          threadID, messageID
        );
      }

      // ── PERM INFO ──
      case "perm": {
        const myLevel = getPermLevel(String(senderID));
        const myName  = await getUserName(senderID);
        return api.sendMessage(
          PERM_BOX(
`PERMISSION LEVELS
━━━━━━━━━━━━━━━━━━
0 = Everyone (সবাই)
1 = Group Admin
2 = Bot Admin 🔰
3 = Super Admin 👑
━━━━━━━━━━━━━━━━━━
Your level: ${myLevel} (${["Everyone","Group Admin","Bot Admin","Super Admin"][myLevel]})
Name: ${myName}`
          ),
          threadID, messageID
        );
      }

      // ── LOG ──
      case "log": {
        if (permssion < 2) {
          return api.sendMessage(SECURITY_BOX("❌ Bot Admin required."), threadID, messageID);
        }
        const logs = getAdminLog();
        const recent = logs.slice(-10).reverse();
        if (!recent.length) return api.sendMessage(BOT_BOX("📋 No admin actions logged yet."), threadID, messageID);

        let logText = "📋 Recent Admin Actions\n━━━━━━━━━━━━━━━━━━\n";
        for (const entry of recent) {
          logText += `[${entry.time}] ${entry.action} by ${entry.by}\n`;
        }
        return api.sendMessage(BOT_BOX(logText), threadID, messageID);
      }

      default:
        return api.sendMessage(BOT_BOX("❌ Invalid command. Type 'admin' for help."), threadID, messageID);
    }
  } catch (e) {
    return api.sendMessage(`❌ Error: ${e.message || e}`, event.threadID, event.messageID);
  }
};

// ── Admin Action Log ──
const LOG_PATH = require("path").join(__dirname, "cache", "admin_log.json");
function getAdminLog() {
  try {
    if (!fs.existsSync(LOG_PATH)) return [];
    return JSON.parse(fs.readFileSync(LOG_PATH)) || [];
  } catch { return []; }
}
function logAction(by, action, targets) {
  try {
    const logs = getAdminLog();
    const moment = require("moment-timezone");
    logs.push({
      time: moment.tz("Asia/Dhaka").format("DD/MM HH:mm"),
      by: String(by),
      action,
      targets
    });
    if (logs.length > 100) logs.splice(0, logs.length - 100);
    fs.writeFileSync(LOG_PATH, JSON.stringify(logs, null, 2));
  } catch (_) {}
}
