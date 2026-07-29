module.exports.config = {
    name: "loto",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "SaGor",
    description: "Lottery game — pick numbers and win coins",
    commandCategory: "game",
    usages: "loto <number 1-99> | loto start | loto result",
    cooldowns: 3
};

module.exports.languages = {
    "en": {
        "usage": "Usage: loto <number 1-99>\nExample: loto 42",
        "invalidNum": "❌ Pick a number between 1 and 99.",
        "wait": "🎰 Drawing in %1 seconds...",
        "win": "🎉 Jackpot! You picked %1 and won %2 coins!",
        "lose": "😔 The lucky number was %1. Better luck next time!",
        "maxPlayers": "⚠️ Loto room is full (%1 players max). Try again later.",
        "alreadyJoined": "⚠️ You already joined this round!"
    }
};

const lotoRooms = new Map();

module.exports.run = async function({ api, event, getText }) {
    const threadID = String(event.threadID);
    const senderID = String(event.senderID);

    const cfg = (global.config && global.config.loto) || {};
    const maxPlayers = typeof cfg.maxPlayers === "number" ? cfg.maxPlayers : 10;
    const getDelay   = typeof cfg.getDelay === "number"   ? cfg.getDelay   : 8;

    const pick = parseInt(event.body.trim().split(/ +/)[1]);
    if (isNaN(pick) || pick < 1 || pick > 99)
        return api.sendMessage(getText("invalidNum"), event.threadID, event.messageID);

    if (!lotoRooms.has(threadID)) lotoRooms.set(threadID, { players: [] });
    const room = lotoRooms.get(threadID);

    if (room.players.find(p => p.id === senderID))
        return api.sendMessage(getText("alreadyJoined"), event.threadID, event.messageID);

    if (room.players.length >= maxPlayers)
        return api.sendMessage(getText("maxPlayers", maxPlayers), event.threadID, event.messageID);

    room.players.push({ id: senderID, pick });
    api.sendMessage(getText("wait", getDelay), event.threadID, event.messageID);

    if (room._timer) return;
    room._timer = setTimeout(async () => {
        const lucky = Math.floor(Math.random() * 99) + 1;
        const winners = room.players.filter(p => p.pick === lucky);
        const prize = 300;
        let msg = `🎰 Lucky number: ${lucky}\n`;
        if (winners.length === 0) {
            msg += "No winners this round!";
        } else {
            msg += `🏆 Winners (${prize} coins each):\n`;
            for (const w of winners) msg += `• ID: ${w.id}\n`;
        }
        api.sendMessage(msg, threadID);
        lotoRooms.delete(threadID);
    }, getDelay * 1000);
};
