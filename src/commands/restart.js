module.exports.config = {
    name: "rest",
    version: "1.0.0",
    hasPermssion: 2,
    credits: "SaGor",
    description: "Restart the bot (Admin only)",
    commandCategory: "System",
    usages: "",
    cooldowns: 5
};

module.exports.run = async function ({ api, event }) {
    const { threadID, messageID, senderID } = event;
    const ADMINBOT = global.config.ADMINBOT || [];
    const NDH = global.config.NDH || [];

    if (!ADMINBOT.includes(senderID) && !NDH.includes(senderID)) {
        return api.sendMessage(
            "❌ You do not have permission to use this command.\nOnly bot administrators can restart the bot.",
            threadID, messageID
        );
    }

    try {
        api.setMessageReaction("⏳", messageID, () => {}, true);
        await api.sendMessage(
            "🔄 Bot is restarting...\n⏰ Please wait a moment.",
            threadID, messageID
        );
        api.setMessageReaction("✅", messageID, () => {}, true);

        setTimeout(() => process.exit(2), 1000);
    } catch (error) {
        return api.sendMessage("❌ Failed to restart the bot.", threadID, messageID);
    }
};
