const fs = require("fs");

module.exports.config = {
    name: "prefix",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "SaGor",
    description: "Show bot prefix and info",
    commandCategory: "System",
    usages: "",
    cooldowns: 5,
    usePrefix: true
};

async function sendPrefixInfo(api, event) {
    const { threadID, messageID } = event;
    const threadSetting = global.data.threadData.get(parseInt(threadID)) || {};
    const prefix = threadSetting.PREFIX || global.config.PREFIX;
    const botName = global.config.BOTNAME || "Unknown";
    const botID = api.getCurrentUserID();
    const ownerID = (global.config.ADMINBOT || [])[0] || "";
    const totalCmd = global.client?.commands?.size || "N/A";
    const totalUsers = global.data?.allUserID?.length || "N/A";
    const totalThreads = global.data?.allThreadID?.length || "N/A";

    const messageText =
`╭─────────────────────────────╮
│ 📌 𝗣𝗥𝗘𝗙𝗜𝗫 𝗜𝗡𝗙𝗢   │
╰─────────────────────────────╯

┏🤖 𝗕𝗼𝘁 𝗡𝗮𝗺𝗲: ${botName}
┗🆔 𝗕𝗼𝘁 𝗜𝗗: ${botID}

┏📌 𝗣𝗿𝗲𝗳𝗶𝘅: ${prefix}
┗📊 𝗖𝗼𝗺𝗺𝗮𝗻𝗱𝘀: ${totalCmd}

┏👥 𝗧𝗼𝘁𝗮𝗹 𝗨𝘀𝗲𝗿𝘀: ${totalUsers}
┗💬 𝗧𝗼𝘁𝗮𝗹 𝗧𝗵𝗿𝗲𝗮𝗱𝘀: ${totalThreads}

┗━━━━━━━━━━━━━━━━┛`;

    if (ownerID) {
        return api.shareContact(messageText, ownerID, threadID, async (err, info) => {
            if (err) return;
            await new Promise(resolve => setTimeout(resolve, 15000));
            api.unsendMessage(info.messageID);
        });
    }
    return api.sendMessage(messageText, threadID, messageID);
}

module.exports.run = async ({ event, api }) => {
    return sendPrefixInfo(api, event);
};
