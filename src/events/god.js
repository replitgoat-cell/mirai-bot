module.exports.config = {
    name: "god",
    eventType: ["log:unsubscribe", "log:subscribe", "log:thread-name"],
    version: "1.0.0",
    credits: "SaGor",
    description: "Record bot activity notifications!",
    envConfig: {
        enable: true
    }
};

module.exports.run = async function({ api, event, Threads }) {
    const logger = require("../../main/utils/log");
    const modName = module.exports.config.name;

    const godCfg = (global.config && global.config.god) || {};
    if (godCfg.enable === false) return;
    if (!global.configModule[modName] || !global.configModule[modName].enable) return;

    const ADMINBOT = (global.config && global.config.ADMINBOT) || [];

    var formReport =
        "=== Bot Notification ===" +
        "\n\n禄 Thread ID: " + event.threadID +
        "\n禄 Action: {task}" +
        "\n禄 Action by userID: " + event.author +
        "\n禄 " + Date.now() + " 芦";

    let task = "";

    switch (event.logMessageType) {
        case "log:thread-name": {
            const threadRow = await Threads.getData(event.threadID).catch(() => null);
            const oldName = (threadRow && threadRow.name) ? threadRow.name : "No name";
            const newName = event.logMessageData.name || "No name";
            task = "Group name changed from: '" + oldName + "' to '" + newName + "'";
            await Threads.setData(event.threadID, { name: newName }).catch(() => {});
            break;
        }
        case "log:subscribe": {
            if (event.logMessageData.addedParticipants.some(i => i.userFbId == api.getCurrentUserID()))
                task = "Bot was added to a new group!";
            break;
        }
        case "log:unsubscribe": {
            if (event.logMessageData.leftParticipantFbId == api.getCurrentUserID())
                task = "Bot was kicked from a group!";
            break;
        }
        default:
            break;
    }

    if (task.length == 0) return;

    formReport = formReport.replace(/\{task}/g, task);

    for (const adminID of ADMINBOT) {
        if (!adminID) continue;
        api.sendMessage(formReport, adminID, (error) => {
            if (error) logger(formReport, "[ Logging Event ]");
        });
    }
};
