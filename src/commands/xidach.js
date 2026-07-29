module.exports.config = {
    name: "xidach",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "SaGor",
    description: "Xidach dice game — bet and win coins",
    commandCategory: "game",
    usages: "xidach <bet>",
    cooldowns: 5
};

module.exports.languages = {
    "en": {
        "usage": "Usage: xidach <bet amount>\nExample: xidach 100",
        "invalidBet": "❌ Please enter a valid bet amount.",
        "noBalance": "❌ You don't have enough coins! Balance: %1",
        "normalWin": "🎲 You rolled %1! Normal win! +%2 coins",
        "superWin": "🎰 You rolled %1! SUPER WIN! +%2 coins",
        "epicWin": "🏆 EPIC WIN! You rolled %1 twice! +%2 coins",
        "lose": "💸 You rolled %1. You lost %2 coins.",
        "balance": "💰 Balance: %1 coins",
        "maxPlayers": "⚠️ Game is full (%1 players max)!"
    }
};

module.exports.run = async function({ api, event, Currencies, getText }) {
    const senderID = String(event.senderID);
    const bet = parseInt((event.body || "").trim().split(/ +/)[1]);

    if (isNaN(bet) || bet <= 0)
        return api.sendMessage(getText("usage"), event.threadID, event.messageID);

    const cfg = (global.config && global.config.xidach) || {};
    const normalWinBonus = typeof cfg.normalWinBonus === "number" ? cfg.normalWinBonus : 1;
    const superWinBonus  = typeof cfg.superWinBonus  === "number" ? cfg.superWinBonus  : 2;
    const epicWinBonus   = typeof cfg.epicWinBonus   === "number" ? cfg.epicWinBonus   : 4;

    let userData, currentCoins;
    try {
        userData = await Currencies.getData(senderID);
        currentCoins = (userData && userData.data && userData.data.coins) || 0;
    } catch (_) { currentCoins = 0; }

    if (currentCoins < bet)
        return api.sendMessage(getText("noBalance", currentCoins), event.threadID, event.messageID);

    const roll1 = Math.floor(Math.random() * 6) + 1;
    const roll2 = Math.floor(Math.random() * 6) + 1;

    let won = 0, msg = "";

    if (roll1 === roll2) {
        won = bet * epicWinBonus;
        msg = getText("epicWin", roll1, won);
    } else if (roll1 + roll2 >= 10) {
        won = bet * superWinBonus;
        msg = getText("superWin", roll1 + roll2, won);
    } else if (roll1 + roll2 >= 7) {
        won = bet * normalWinBonus;
        msg = getText("normalWin", roll1 + roll2, won);
    } else {
        won = -bet;
        msg = getText("lose", roll1 + roll2, bet);
    }

    const newCoins = currentCoins + won;
    try { await Currencies.setData(senderID, { data: { coins: Math.max(0, newCoins) } }); } catch (_) {}

    msg += "\n" + getText("balance", Math.max(0, newCoins));
    return api.sendMessage(msg, event.threadID, event.messageID);
};
