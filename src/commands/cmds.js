const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const vm = require("vm");

if (!global.client.handleReaction) global.client.handleReaction = [];

module.exports.config = {
  name: "cmd",
  version: "3.0.0",
  hasPermssion: 2,
  credits: "SaGor",
  description: "Command Manager (Install/Load/Unload)",
  commandCategory: "System",
  usages: "[load/unload/loadAll/unloadAll/install/del/info/count]",
  cooldowns: 3
};

function box(title, content) {
  return (
`┏━━━━━━━━━━┓
┃ ✦ ${title}
┣━━━━━━━━━━┫
${content}
┗━━━━━━━━━━┛`
  );
}

module.exports.run = async function ({ api, event, args }) {

  const { threadID, messageID } = event;
  const commandFolder = __dirname;

  if (!args[0]) {
    return api.sendMessage(box(
      "📦 CMD MANAGER",
`│ • cmd load <name>
│ • cmd unload <name>
│ • cmd loadAll
│ • cmd unloadAll
│ • cmd install <file.js> <url/code>
│ • cmd del <name>
│ • cmd info <name>
│ • cmd count`
    ), threadID, messageID);
  }

  const action = args[0].toLowerCase();

  try {

    if (action === "count") {
      return api.sendMessage(box(
        "📊 TOTAL COMMANDS",
        `│ Loaded: ${global.client.commands.size}`
      ), threadID, messageID);
    }

    if (action === "info") {
      const cmdName = args[1];
      const command = global.client.commands.get(cmdName);

      if (!command)
        return api.sendMessage(box("❌ ERROR", "│ Command not found"), threadID, messageID);

      const cfg = command.config;

      return api.sendMessage(box(
        "📄 COMMAND INFO",
`│ Name: ${cfg.name}
│ Version: ${cfg.version}
│ Author: ${cfg.credits}
│ Permission: ${cfg.hasPermssion}
│ Cooldown: ${cfg.cooldowns}
│ Category: ${cfg.commandCategory}`
      ), threadID, messageID);
    }

    if (action === "load") {
      const name = args[1];
      if (!name)
        return api.sendMessage(box("❌ ERROR", "│ Missing command name"), threadID, messageID);

      const dir = path.join(commandFolder, name + ".js");

      delete require.cache[require.resolve(dir)];
      const command = require(dir);

      global.client.commands.set(command.config.name, command);

      return api.sendMessage(box(
        "✅ LOAD SUCCESS",
        `│ Command: ${name}\n│ Status: Active`
      ), threadID, messageID);
    }

    if (action === "unload") {
      const name = args[1];
      if (!name)
        return api.sendMessage(box("❌ ERROR", "│ Missing command name"), threadID, messageID);

      global.client.commands.delete(name);

      return api.sendMessage(box(
        "⚠️ UNLOAD SUCCESS",
        `│ Command: ${name}\n│ Status: Inactive`
      ), threadID, messageID);
    }

    if (action === "loadall") {
      const files = fs.readdirSync(commandFolder).filter(f => f.endsWith(".js"));

      for (const file of files) {
        const dir = path.join(commandFolder, file);
        delete require.cache[require.resolve(dir)];
        const command = require(dir);
        global.client.commands.set(command.config.name, command);
      }

      return api.sendMessage(box(
        "🚀 LOAD ALL",
        `│ Loaded: ${files.length} commands`
      ), threadID, messageID);
    }

    if (action === "unloadall") {
      const files = fs.readdirSync(commandFolder).filter(f => f.endsWith(".js"));

      for (const file of files) {
        const name = file.replace(".js", "");
        global.client.commands.delete(name);
      }

      return api.sendMessage(box(
        "🧹 UNLOAD ALL",
        `│ Removed: ${files.length} commands`
      ), threadID, messageID);
    }

    if (action === "del") {
      const name = args[1];
      if (!name)
        return api.sendMessage(box("❌ ERROR", "│ Missing command name"), threadID, messageID);

      const file = path.join(commandFolder, name + ".js");

      if (!fs.existsSync(file))
        return api.sendMessage(box("❌ ERROR", "│ File not found"), threadID, messageID);

      fs.unlinkSync(file);
      global.client.commands.delete(name);

      return api.sendMessage(box(
        "🗑️ DELETE SUCCESS",
        `│ Deleted: ${name}.js`
      ), threadID, messageID);
    }

    if (action === "install") {

      const fileName = args[1];
      const input = args.slice(2).join(" ");

      if (!fileName || !input)
        return api.sendMessage(box("❌ ERROR", "│ Usage: cmd install file.js <url/code>"), threadID, messageID);

      if (!fileName.endsWith(".js"))
        return api.sendMessage(box("❌ ERROR", "│ Only .js allowed"), threadID, messageID);

      if (fileName.includes(".."))
        return api.sendMessage(box("❌ ERROR", "│ Invalid filename"), threadID, messageID);

      let code;

      if (input.startsWith("http")) {
        const res = await axios.get(input);
        code = res.data;
      } else {
        code = input;
      }

      try {
        new vm.Script(code);
      } catch (err) {
        return api.sendMessage(box("❌ SYNTAX ERROR", `│ ${err.message}`), threadID, messageID);
      }

      const filePath = path.join(commandFolder, fileName);

      if (fs.existsSync(filePath)) {
        return api.sendMessage(
`┏━━━━━━━━━━┓
┃ ⚠️ WARNING
┣━━━━━━━━━━┫
│ File already exists!
│ React to overwrite
┗━━━━━━━━━━┛`,
          threadID,
          (err, info) => {
            global.client.handleReaction.push({
              name: this.config.name,
              author: event.senderID,
              messageID: info.messageID,
              fileName,
              code,
              path: filePath
            });
          },
          messageID
        );
      }

      fs.writeFileSync(filePath, code);

      delete require.cache[require.resolve(filePath)];
      const command = require(filePath);
      global.client.commands.set(command.config.name, command);

      return api.sendMessage(box(
        "✅ INSTALLED",
        `│ Command: ${fileName.replace(".js","")}\n│ Status: Active`
      ), threadID, messageID);
    }

  } catch (err) {
    return api.sendMessage(box("❌ ERROR", `│ ${err.message}`), threadID, messageID);
  }
};

module.exports.handleReaction = async function ({ api, event, handleReaction }) {

  const { author, fileName, code, path } = handleReaction;

  if (event.userID != author) return;

  try {
    const fs = require("fs-extra");

    fs.writeFileSync(path, code);

    delete require.cache[require.resolve(path)];
    const command = require(path);

    global.client.commands.set(command.config.name, command);

    return api.sendMessage(box(
      "✅ OVERWRITE DONE",
      `│ File: ${fileName.replace(".js","")}\n│ Status: Updated`
    ), event.threadID);

  } catch (err) {
    return api.sendMessage("❌ Error: " + err.message, event.threadID);
  }
};
