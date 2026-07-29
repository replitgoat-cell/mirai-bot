module.exports.config = {
    name: "ping",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "Sagor",
    description: "Check bot latency",
    commandCategory: "System",
    usages: "",
    cooldowns: 5,
    aliases: ["p", "pong"]
};

module.exports.run = async function ({ api, event }) {
    const start = Date.now();
    return api.sendMessage("🏓 Pinging...", event.threadID, (err, info) => {
        if (err || !info) return;
        const ping = Date.now() - start;
        api.editMessage(`🏓 Pong!\n⏱️ Ping: ${ping}ms`, info.messageID);
    }, event.messageID);
};
