module.exports.config = {
    name: "goiadmin",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "SaGor",
    description: "Auto reply when bot admin is mentioned",
    commandCategory: "Other",
    usages: "",
    cooldowns: 1
};

module.exports.handleEvent = function({ api, event }) {
    const ADMINBOT = (global.config && global.config.ADMINBOT) || [];
    const NDH = (global.config && global.config.NDH) || [];
    const allAdmins = [...ADMINBOT, ...NDH];

    if (allAdmins.includes(event.senderID)) return;

    const mentionedIDs = Object.keys(event.mentions || {});
    const adminMentioned = mentionedIDs.some(id => allAdmins.includes(id));
    if (!adminMentioned) return;

    const replies = [
        "আমার বস সাগরকে আর একবার মেনশন দিলে তোমার নাকের মধ্যে ঘুষি মারমু😡",
        "বস সাগরকে আর একবার মেনশন দিলে খবর আছে তোমার 😠",
        "বস সাগর এখন অনেক বিজি তাকে মেনশন দিয়ে ডিস্টার্ব কইরো না 🥰",
        "সাগর বস এখন অনেক বিজি 😡😡",
        "Mention দিস না, সাগর বসের মন ভালো নেই 💔🥀",
        "এত মেনশন না দিয়ে ইনবক্সে আসো 🤷‍♂️",
        "সাগর বস এখন বিজি, যা বলার আমাকে বল 😼",
        "Mention না দিয়ে সিরিয়াস প্রেম করতে চাইলে ইনবক্স 😏",
        "সাগর প্রচুর বিজি 🥵🥀"
    ];

    return api.sendMessage(
        { body: replies[Math.floor(Math.random() * replies.length)] },
        event.threadID,
        event.messageID
    );
};

module.exports.run = async function({}) {};
