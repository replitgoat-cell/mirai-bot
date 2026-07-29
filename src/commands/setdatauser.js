module.exports.config = {
    name: "setdatauser",
    version: "1.0",
    hasPermssion: 2,
    credits: "SaGor",
    description: "Add new user data to the database.",
    commandCategory: "System",
    usages: "",
    cooldowns: 5,
};

module.exports.run = async function ({ Users, event, api, Threads }) {
    const ADMINBOT = (global.config && global.config.ADMINBOT) || [];
    const NDH = (global.config && global.config.NDH) || [];
    if (!ADMINBOT.includes(event.senderID) && !NDH.includes(event.senderID))
        return api.sendMessage("You don't have permission to use this command.", event.threadID, event.messageID);

    const { threadID } = event;
    const threadIn4 = await Threads.getInfo(threadID).catch(() => null) || await api.getThreadInfo(threadID).catch(() => null);
    if (!threadIn4 || !Array.isArray(threadIn4.participantIDs))
        return api.sendMessage("Failed to get thread info.", threadID);

    for (const id of threadIn4.participantIDs) {
        let data = await api.getUserInfo(id);
        let userName = data[id].name;
        await Users.setData(id, { name: userName, data: {} });
    }
    return api.sendMessage("Member data in this group has been updated.", threadID);
};
