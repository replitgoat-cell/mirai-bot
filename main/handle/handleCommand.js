module.exports = function ({ api, models, Users, Threads, Currencies }) {
  const stringSimilarity = require('string-similarity'),
    escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    logger = require("../utils/log.js");
  const moment = require("moment-timezone");

  return async function ({ event }) {
    try {
      const dateNow = Date.now();
      const time = moment.tz("Asia/Dhaka").format("HH:mm:ss DD/MM/YYYY");
      const { allowInbox, PREFIX, ADMINBOT = [], NDH = [], DeveloperMode } = global.config;

      if (global._notificationEnabled && !global._notificationEnabled()) return;
      const { userBanned, threadBanned, threadInfo, threadData, commandBanned } = global.data;
      const { commands, cooldowns } = global.client;
      var { body, senderID, threadID, messageID } = event;
      if (!body) return;
      senderID = String(senderID);
      threadID = String(threadID);

      const threadSetting = threadData.get(threadID) || {};
      const prefixRegex = new RegExp(
        `^(<@!?${senderID}>|${escapeRegex(threadSetting.hasOwnProperty("PREFIX") ? threadSetting.PREFIX : PREFIX)})\\s*`
      );

      const adminOnly   = global.config.adminOnly;
      const ndhOnly     = global.config.ndhOnly;
      const adminPaOnly = global.config.adminPaOnly;

      if (!global.data.allThreadID.includes(threadID) && !ADMINBOT.includes(senderID) && adminPaOnly === true) return;
      if (!ADMINBOT.includes(senderID) && adminOnly === true) return;
      if (!NDH.includes(senderID) && !ADMINBOT.includes(senderID) && ndhOnly === true) return;

      let dataAdbox = { adminbox: {} };
      try { dataAdbox = require('../../src/commands/cache/data.json'); } catch (_) {}

      let threadInf;
      try {
        threadInf = threadInfo.get(threadID) || await Threads.getInfo(threadID);
      } catch (_) { threadInf = { adminIDs: [] }; }
      if (!threadInf) threadInf = { adminIDs: [] };
      if (!Array.isArray(threadInf.adminIDs)) threadInf.adminIDs = [];

      const findd = threadInf.adminIDs.find(el => el.id == senderID);
      if (
        dataAdbox.adminbox.hasOwnProperty(threadID) &&
        dataAdbox.adminbox[threadID] == true &&
        !ADMINBOT.includes(senderID) &&
        !findd &&
        event.isGroup == true
      ) return api.sendMessage(
        'Admin Only: Only admins can use the bot in this group.',
        event.threadID, event.messageID
      );

      if (userBanned.has(senderID) || threadBanned.has(threadID) || (allowInbox === false && senderID == threadID)) {
        if (!ADMINBOT.includes(senderID.toString())) {
          if (userBanned.has(senderID)) {
            const { reason, dateAdded } = userBanned.get(senderID) || {};
            return api.sendMessage(
              `You are banned from using the bot.\nReason: ${reason || 'N/A'}\nDate: ${dateAdded || 'N/A'}`,
              threadID, async (err, info) => {
                if (err || !info) return;
                await new Promise(r => setTimeout(r, 5000));
                api.unsendMessage(info.messageID);
              }, messageID
            );
          } else if (threadBanned.has(threadID)) {
            const { reason, dateAdded } = threadBanned.get(threadID) || {};
            return api.sendMessage(
              `This group has been banned.\nReason: ${reason || 'N/A'}\nDate: ${dateAdded || 'N/A'}`,
              threadID, async (err, info) => {
                if (err || !info) return;
                await new Promise(r => setTimeout(r, 5000));
                api.unsendMessage(info.messageID);
              }, messageID
            );
          }
        }
      }

      let args = [], commandName = "", isCommand = false;

      if (prefixRegex.test(body)) {
        const [matchedPrefix] = body.match(prefixRegex);
        args = body.slice(matchedPrefix.length).trim().split(/ +/);
        commandName = args.shift()?.toLowerCase();
        isCommand = true;
      } else if (global.config.usePrefix?.enable === false) {
        const input = body.trim();
        const firstWord = input.split(/ +/)[0].toLowerCase();
        const cmd = commands.get(firstWord) ||
          Array.from(commands.values()).find(c => {
            const aliases = c.config?.aliases;
            if (Array.isArray(aliases)) return aliases.some(a => a.toLowerCase() === firstWord);
            if (typeof aliases === "string") return aliases.toLowerCase() === firstWord;
            return false;
          });
        if (cmd) {
          args = input.split(/ +/);
          commandName = args.shift()?.toLowerCase();
          isCommand = true;
        }
      }

      if (!isCommand) return;

      const prefix = threadSetting.hasOwnProperty("PREFIX") ? threadSetting.PREFIX : PREFIX;

      if (!commandName && body.trim() === prefix)
        return api.sendMessage(global.getText("handleCommand", "noprefix"), threadID, messageID);
      if (!commandName && body.startsWith(prefix))
        return api.sendMessage(global.getText("handleCommand", "onlyprefix"), threadID, messageID);

      let command = commands.get(commandName);
      if (!command) {
        command = Array.from(commands.values()).find(cmd => {
          const aliases = cmd.config?.aliases;
          if (Array.isArray(aliases)) return aliases.some(a => a.toString().toLowerCase() === commandName);
          if (typeof aliases === "string") return aliases.toLowerCase() === commandName;
          return false;
        });
      }

      if (!command) {
        if (!global.config.hideNotiMessage?.commandNotFound) {
          try {
            const allNames = Array.from(commands.values()).flatMap(cmd => {
              const names = [cmd.config.name];
              if (Array.isArray(cmd.config.aliases)) names.push(...cmd.config.aliases);
              else if (typeof cmd.config.aliases === "string") names.push(cmd.config.aliases);
              return names.map(n => String(n).toLowerCase());
            });
            const checker = stringSimilarity.findBestMatch(commandName, allNames);
            const topMatches = checker.ratings
              .filter(r => r.rating >= 0.35)
              .sort((a, b) => b.rating - a.rating)
              .slice(0, 3)
              .map(r => r.target);

            if (checker.bestMatch.rating >= 0.5) {
              const suggestions = topMatches.length > 1
                ? topMatches.map((s, i) => `${i + 1}. ${prefix}${s}`).join('\n')
                : `${prefix}${checker.bestMatch.target}`;
              return api.sendMessage(
                `Command "${commandName}" not found.\n\nDid you mean?\n${suggestions}\n\nSee all commands: ${prefix}help`,
                threadID, messageID
              );
            }
          } catch (_) {}
          return api.sendMessage(
            `Command "${commandName}" does not exist.\nSee all commands: ${prefix}help\nSearch: ${prefix}cmds <keyword>`,
            threadID, messageID
          );
        }
        return;
      }

      if (commandBanned.get(threadID) || commandBanned.get(senderID)) {
        if (!ADMINBOT.includes(senderID)) {
          const banThreads = (commandBanned.get(threadID) || []).filter(Boolean);
          const banUsers   = (commandBanned.get(senderID) || []).filter(Boolean);
          if (banThreads.includes(command.config.name))
            return api.sendMessage(
              `"${command.config.name}" is disabled in this group.`,
              threadID, async (err, info) => {
                if (err || !info) return;
                await new Promise(r => setTimeout(r, 5000));
                api.unsendMessage(info.messageID);
              }, messageID
            );
          if (banUsers.includes(command.config.name))
            return api.sendMessage(
              `"${command.config.name}" is disabled for you.`,
              threadID, async (err, info) => {
                if (err || !info) return;
                await new Promise(r => setTimeout(r, 5000));
                api.unsendMessage(info.messageID);
              }, messageID
            );
        }
      }

      if (command.config.commandCategory?.toLowerCase() == 'nsfw' && !global.data.threadAllowNSFW.includes(threadID) && !ADMINBOT.includes(senderID))
        return api.sendMessage(
          `This command can only be used in NSFW-enabled groups.\nAdmin: .setnsfw on`,
          threadID, async (err, info) => {
            if (err || !info) return;
            await new Promise(r => setTimeout(r, 5000));
            api.unsendMessage(info.messageID);
          }, messageID
        );

      const find2 = threadInf.adminIDs.find(el => el.id == senderID);
      let permssion = 0;
      if (ADMINBOT.includes(senderID.toString())) permssion = 3;
      else if (NDH.includes(senderID.toString())) permssion = 2;
      else if (find2) permssion = 1;

      if ((command.config.hasPermssion || 0) > permssion) {
        const needed = command.config.hasPermssion;
        const roleNames = { 1: 'Group Admin', 2: 'NDH Admin', 3: 'Bot Admin' };
        return api.sendMessage(
          `Permission denied. You cannot use "${command.config.name}".\nRequired: ${roleNames[needed] || 'Higher Permission'}`,
          event.threadID, event.messageID
        );
      }

      if (!cooldowns.has(command.config.name)) cooldowns.set(command.config.name, new Map());
      const timestamps     = cooldowns.get(command.config.name);
      const expirationTime = (command.config.cooldowns || 1) * 1000;

      if (timestamps.has(senderID) && dateNow < timestamps.get(senderID) + expirationTime) {
        const remaining = ((timestamps.get(senderID) + expirationTime - dateNow) / 1000).toFixed(1);
        return api.sendMessage(
          `Please wait ${remaining}s before using "${command.config.name}" again.`,
          threadID, messageID
        );
      }

      let getText2 = () => {};
      if (command.languages && typeof command.languages == 'object' && command.languages.hasOwnProperty(global.config.language)) {
        getText2 = (...values) => {
          var lang = command.languages[global.config.language][values[0]] || '';
          for (var i = 1; i <= values.length - 1; i++) {
            lang = lang.replace(new RegExp('%' + i, 'g'), values[i]);
          }
          return lang;
        };
      }

      try {
        const typCfg = global.config.typingIndicator || {};
        if (typCfg.enable) {
          Promise.resolve(api.sendTypingIndicator(true, threadID)).catch(() => {});
          const thinkDelay = 600 + Math.floor(Math.random() * 1900);
          await new Promise(r => setTimeout(r, thinkDelay));
          Promise.resolve(api.sendTypingIndicator(false, threadID)).catch(() => {});
          await new Promise(r => setTimeout(r, 80 + Math.floor(Math.random() * 120)));
        }

        await command.run({ api, event, args, models, Users, Threads, Currencies, permssion, getText: getText2 });
        timestamps.set(senderID, dateNow);
        if (DeveloperMode)
          logger(global.getText("handleCommand", "executeCommand", time, commandName, senderID, threadID, args.join(" "), Date.now() - dateNow), "[ DEV MODE ]");
      } catch (e) {
        logger(`Command "${commandName}" error: ${e.message}`, 'error');
        return api.sendMessage(
          `Error in command "${commandName}": ${String(e.message || e).slice(0, 100)}\nPlease report to developer.`,
          threadID
        );
      }

    } catch (outerErr) {
      require("../utils/log.js")(`handleCommand fatal: ${outerErr.message}`, 'error');
    }
  };
};
