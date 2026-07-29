const fs = require("fs-extra");

module.exports.config = {
 name: "wl",
 version: "1.0.0",
 hasPermssion: 3,
 credits: "SaGor",
 description: "Whitelist mode on/off",
 commandCategory: "Admin",
 usages: "wl on / wl off",
 cooldowns: 3
};

module.exports.run = async function ({ api, event, args }) {
 const { threadID, messageID } = event;
 const configPath = global.client.configPath;

 delete require.cache[require.resolve(configPath)];
 const config = require(configPath);

 if (!args[0]) {
 return api.sendMessage(
 "Example:\nwl on\nwl off",
 threadID,
 messageID
 );
 }

 const option = args[0].toLowerCase();

 if (option === "on") {
 config.adminOnly = true;
 } else if (option === "off") {
 config.adminOnly = false;
 } else {
 return api.sendMessage(
 "Example:\nwl on\nwl off",
 threadID,
 messageID
 );
 }

 fs.writeFileSync(configPath, JSON.stringify(config, null, 4));

 global.config.adminOnly = !!config.adminOnly;
 global.config.ADMINBOT = Array.isArray(config.ADMINBOT) ? config.ADMINBOT.map(String) : [];
 global.config.NDH = Array.isArray(config.NDH) ? config.NDH.map(String) : [];
 global.config.adminPaOnly = !!config.adminPaOnly;
 global.config.ndhOnly = !!config.ndhOnly;
 global.config.keyAdminOnly = !!config.keyAdminOnly;

 return api.sendMessage(
 config.adminOnly
 ? "enabled"
 : "disabled",
 threadID,
 messageID
 );
};
