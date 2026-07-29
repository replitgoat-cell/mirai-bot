module.exports.config = {
    name: "caesar",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "SaGor",
    description: "Caesar cipher encrypt/decrypt",
    commandCategory: "utility",
    usages: "caesar enc <text> | caesar dec <text>",
    cooldowns: 3
};

module.exports.languages = {
    "en": {
        "noText": "Please provide text. Usage: caesar enc <text> | caesar dec <text>",
        "encrypted": "🔐 Encrypted:\n",
        "decrypted": "🔓 Decrypted:\n",
        "wrongPass": "❌ Wrong password or invalid input."
    }
};

function caesarShift(text, shift) {
    return text.replace(/[a-zA-Z]/g, (ch) => {
        const base = ch >= 'a' ? 97 : 65;
        return String.fromCharCode(((ch.charCodeAt(0) - base + shift) % 26 + 26) % 26 + base);
    });
}

function getShift() {
    const pass = String((global.config && global.config.caesar && global.config.caesar.caeserPassword) || "266303");
    let shift = 0;
    for (const ch of pass) { const n = parseInt(ch); if (!isNaN(n)) shift += n; }
    return shift % 26 || 13;
}

module.exports.run = async function({ api, event, args, getText }) {
    const mode = (args[0] || "").toLowerCase();
    const text = args.slice(1).join(" ");
    if (!mode || !text)
        return api.sendMessage(getText("noText"), event.threadID, event.messageID);

    const shift = getShift();
    if (mode === "enc") {
        const result = caesarShift(text, shift);
        return api.sendMessage(getText("encrypted") + result, event.threadID, event.messageID);
    } else if (mode === "dec") {
        const result = caesarShift(text, 26 - shift);
        return api.sendMessage(getText("decrypted") + result, event.threadID, event.messageID);
    } else {
        return api.sendMessage(getText("noText"), event.threadID, event.messageID);
    }
};
