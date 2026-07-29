module.exports.config = {
    name: "sh",
    version: "7.3.1",
    hasPermssion: 2,
    credits: "SaGor",
    description: "Run shell commands",
    commandCategory: "System",
    usages: "[command]",
    cooldowns: 0,
    dependencies: {
        "child_process": ""
    }
};

module.exports.run = async function({ api, event, args }) {
    const { exec } = require("child_process");
    const ADMINBOT = (global.config && global.config.ADMINBOT) || [];
    const NDH = (global.config && global.config.NDH) || [];
    if (!ADMINBOT.includes(event.senderID) && !NDH.includes(event.senderID))
        return api.sendMessage("Permission denied.", event.threadID, event.messageID);

    let text = args.join(" ");
    exec(text, (error, stdout, stderr) => {
        if (error) return api.sendMessage(`error:\n${error.message}`, event.threadID, event.messageID);
        if (stderr) return api.sendMessage(`stderr:\n${stderr}`, event.threadID, event.messageID);
        api.sendMessage(`stdout:\n${stdout}`, event.threadID, event.messageID);
    });
};
