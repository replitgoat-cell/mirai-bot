module.exports.config = {
  name: "unban",
  version: "2.1.0",
  hasPermssion: 2,
  credits: "SaGor",
  description: "Unban users banned by spamban or manual ban system",
  commandCategory: "Admin",
  usages: "unban [id | @tag | reply] | unban alluser | unban box | unban allbox | unban ata",
  cooldowns: 2,
  denpendencies: {}
};

module.exports.run = async ({ event, api, Users, Threads, args }) => {
  const { threadID, messageID, senderID } = event;
  const ADMINBOT = global.config.ADMINBOT || [];
  const NDH = global.config.NDH || [];

  if (!ADMINBOT.includes(senderID) && !NDH.includes(senderID)) {
    return api.sendMessage("❌ You don't have permission to use this command.", threadID, messageID);
  }

  const threadSetting = global.data.threadData.get(threadID) || {};
  const prefix = threadSetting.PREFIX || global.config.PREFIX;

  async function unbanUser(uid) {
    uid = String(uid);
    const dataUser = await Users.getData(uid) || {};
    const data = dataUser.data || {};
    data.banned = false;
    data.reason = null;
    data.dateAdded = null;
    await Users.setData(uid, { data });
    global.data.userBanned.delete(uid);

    if (global.spamBanned && global.spamBanned.has(uid)) global.spamBanned.delete(uid);
    if (global.spamTracker && global.spamTracker.has(uid)) global.spamTracker.delete(uid);
    if (global.client.autoban && global.client.autoban[uid]) {
      global.client.autoban[uid] = { timeStart: Date.now(), number: 0 };
    }

    return dataUser.name || uid;
  }

  switch (args[0]) {

    case "ata": {
      let userCount   = 0;
      let threadCount = 0;

      const userBanned = [...(global.data.userBanned || new Map()).keys()];
      for (const uid of userBanned) {
        await unbanUser(uid);
        userCount++;
      }

      const threadBanned = global.data.threadBanned
        ? [...global.data.threadBanned.keys()]
        : [];
      for (const tid of threadBanned) {
        const data = (await Threads.getData(tid)).data || {};
        data.banned   = false;
        data.reason   = null;
        data.dateAdded = null;
        await Threads.setData(tid, { data });
        global.data.threadBanned.delete(tid);
        threadCount++;
      }

      const fs = require("fs-extra");
      const bansPath = __dirname + "/cache/bans.json";
      if (fs.existsSync(bansPath)) {
        const bans = JSON.parse(fs.readFileSync(bansPath));
        let groupBanCount = 0;
        for (const tid in bans.banned) {
          groupBanCount += (bans.banned[tid] || []).length;
          bans.banned[tid] = [];
          bans.warns[tid]  = {};
        }
        fs.writeFileSync(bansPath, JSON.stringify(bans, null, 2));
        userCount += groupBanCount;
      }

      return api.sendMessage(
        `「 𝗨𝗡𝗕𝗔𝗡 𝗔𝗧𝗔 」\n` +
        `◆━━━━━━━━━━━━━━━━━◆\n\n` +
        `✅ Unbanned ${userCount} user(s)\n` +
        `✅ Unbanned ${threadCount} group(s)\n\n` +
        `🔓 All bans have been cleared!`,
        threadID, messageID
      );
    }

    case "id": {
      const uid = args[1];
      if (!uid) return api.sendMessage(`❌ Usage: ${prefix}unban id <userID>`, threadID, messageID);
      const name = await unbanUser(uid);
      return api.sendMessage(`✅ Unbanned: ${name} (${uid})`, threadID, messageID);
    }

    case "user":
    case "mb":
    case "member": {
      if (event.type === "message_reply") {
        const uid = event.messageReply.senderID;
        const name = await unbanUser(uid);
        return api.sendMessage(`✅ Unbanned: ${name} (${uid})`, threadID, messageID);
      }
      if (Object.keys(event.mentions).length > 0) {
        const names = [];
        for (const uid of Object.keys(event.mentions)) {
          const name = await unbanUser(uid);
          names.push(`${name} (${uid})`);
        }
        return api.sendMessage(`✅ Unbanned:\n${names.join("\n")}`, threadID, messageID);
      }
      if (args[1]) {
        const name = await unbanUser(args[1]);
        return api.sendMessage(`✅ Unbanned: ${name} (${args[1]})`, threadID, messageID);
      }
      return api.sendMessage(`❌ Please reply to a message, @mention, or provide a user ID.\nUsage: ${prefix}unban member @tag | ${prefix}unban id <ID>`, threadID, messageID);
    }

    case "alluser":
    case "allmember": {
      const userBanned = [...global.data.userBanned.keys()];
      if (userBanned.length === 0) return api.sendMessage("✅ No users are currently banned.", threadID, messageID);
      for (const uid of userBanned) await unbanUser(uid);
      return api.sendMessage(`✅ Unbanned all ${userBanned.length} user(s) on the server.`, threadID, messageID);
    }

    case "box":
    case "thread": {
      const data = (await Threads.getData(threadID)).data || {};
      data.banned = false;
      data.reason = null;
      data.dateAdded = null;
      await Threads.setData(threadID, { data });
      global.data.threadBanned && global.data.threadBanned.delete(threadID);
      return api.sendMessage("✅ This group has been unbanned.", threadID, messageID);
    }

    case "allbox":
    case "allthread": {
      const threadBanned = global.data.threadBanned ? [...global.data.threadBanned.keys()] : [];
      if (threadBanned.length === 0) return api.sendMessage("✅ No groups are currently banned.", threadID, messageID);
      for (const tid of threadBanned) {
        const data = (await Threads.getData(tid)).data || {};
        data.banned = false; data.reason = null; data.dateAdded = null;
        await Threads.setData(tid, { data });
        global.data.threadBanned.delete(tid);
      }
      return api.sendMessage(`✅ Unbanned all ${threadBanned.length} group(s).`, threadID, messageID);
    }

    default: {
      if (event.type === "message_reply") {
        const uid = event.messageReply.senderID;
        const name = await unbanUser(uid);
        return api.sendMessage(`✅ Unbanned: ${name} (${uid})`, threadID, messageID);
      }
      if (Object.keys(event.mentions).length > 0) {
        const names = [];
        for (const uid of Object.keys(event.mentions)) {
          const name = await unbanUser(uid);
          names.push(`${name} (${uid})`);
        }
        return api.sendMessage(`✅ Unbanned:\n${names.join("\n")}`, threadID, messageID);
      }
      if (args[0] && /^\d+$/.test(args[0])) {
        const name = await unbanUser(args[0]);
        return api.sendMessage(`✅ Unbanned: ${name} (${args[0]})`, threadID, messageID);
      }

      return api.sendMessage(
        `「 𝗨𝗡𝗕𝗔𝗡 𝗖𝗢𝗠𝗠𝗔𝗡𝗗 」\n` +
        `◆━━━━━━━━━━━━━━━━━◆\n\n` +
        `▸ ${prefix}unban <userID>\n  → Unban by ID\n\n` +
        `▸ ${prefix}unban [reply]\n  → Unban the replied user\n\n` +
        `▸ ${prefix}unban member @tag\n  → Unban tagged user\n\n` +
        `▸ ${prefix}unban alluser\n  → Unban all users on server\n\n` +
        `▸ ${prefix}unban box\n  → Unban this group\n\n` +
        `▸ ${prefix}unban allbox\n  → Unban all groups\n\n` +
        `▸ ${prefix}unban ata\n  → 🔓 Unban EVERYTHING at once`,
        threadID, messageID
      );
    }
  }
};
