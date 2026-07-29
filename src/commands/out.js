module.exports.config = {
  name: "out",
  version: "1.0.0",
  hasPermssion: 2,
  credits: "SaGor",
  description: "Bot leave group",
  commandCategory: "group",
  usages: "out",
  cooldowns: 5
};

module.exports.run = async function({ api, event }) {
  const { threadID, messageID } = event;

  api.sendMessage(
    "Goodbye everyone 👋",
    threadID,
    () => api.removeUserFromGroup(api.getCurrentUserID(), threadID),
    messageID
  );
};