module.exports.config = {
    name: "work",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "SaGor",
    description: "Work to earn currency",
    commandCategory: "economy",
    usages: "work",
    cooldowns: 5
};

module.exports.languages = {
    "en": {
        "cooldown": "⏳ You already worked! Come back in %1 minutes.",
        "earned": "💼 You worked as a %1 and earned %2 coins!",
        "total": "💰 Total balance: %1 coins"
    }
};

const JOBS = ["farmer", "driver", "teacher", "doctor", "programmer", "chef", "mechanic", "designer"];
const workTimers = new Map();

module.exports.run = async function({ api, event, Currencies, getText }) {
    const senderID = String(event.senderID);
    const cooldownMs = (global.config && global.config.work && typeof global.config.work.cooldownTime === "number")
        ? global.config.work.cooldownTime
        : 1200000; // default 20 min

    const now = Date.now();
    if (workTimers.has(senderID)) {
        const diff = now - workTimers.get(senderID);
        if (diff < cooldownMs) {
            const remaining = Math.ceil((cooldownMs - diff) / 60000);
            return api.sendMessage(getText("cooldown", remaining), event.threadID, event.messageID);
        }
    }

    const job = JOBS[Math.floor(Math.random() * JOBS.length)];
    const earned = Math.floor(Math.random() * 200) + 50;

    try {
        const userData = await Currencies.getData(senderID);
        const currentCoins = (userData && userData.data && userData.data.coins) || 0;
        const newCoins = currentCoins + earned;
        await Currencies.setData(senderID, { data: { coins: newCoins } });
        workTimers.set(senderID, now);
        return api.sendMessage(
            getText("earned", job, earned) + "\n" + getText("total", newCoins),
            event.threadID, event.messageID
        );
    } catch (e) {
        workTimers.set(senderID, now);
        return api.sendMessage(getText("earned", job, earned), event.threadID, event.messageID);
    }
};
