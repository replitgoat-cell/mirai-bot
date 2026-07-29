module.exports.config = {
  name: "noprefix",
  version: "1.0.0",
  hasPermssion: 2,
  credits: "Sagor",
  description: "Turn ON/OFF no-prefix mode",
  commandCategory: "system",
  usages: "noprefix on/off",
  cooldowns: 3
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;

  if (!args[0]) {
    return api.sendMessage(
      "Usage:\nnoprefix on\nnoprefix off",
      threadID,
      messageID
    );
  }

  const input = args[0].toLowerCase();

  if (input === "on") {
    global.config.usePrefix.enable = false;
    return api.sendMessage(
      "No-prefix mode enabled",
      threadID,
      messageID
    );
  }

  if (input === "off") {
    global.config.usePrefix.enable = true;
    return api.sendMessage(
      "No-prefix mode disabled",
      threadID,
      messageID
    );
  }

  return api.sendMessage(
    "Invalid option. Use: noprefix on/off",
    threadID,
    messageID
  );
};
