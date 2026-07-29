const chalk = require('chalk');
module.exports.config = {
    name: "join",
    version: "1.0.1",
    hasPermssion: 2,
    credits: "𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭",
    description: "Join the Bot boxes are in",
    commandCategory: "System",
    usages: "",
    cooldowns: 5
};
 module.exports.onLoad = () => {
  }
module.exports.handleReply = async function({ api, event, handleReply, Threads }) {
  var { threadID, messageID, senderID, body } = event;
  var { ID } = handleReply;
  if (!body || !parseInt(body)) return api.sendMessage('Your selection must be a number.', threadID, messageID);
  if ((parseInt(body) - 1) > ID.length) return api.sendMessage("Your pick is not on the list", threadID, messageID);
  try {
    var threadInfo = await Threads.getInfo(ID[body - 1]);
    var { participantIDs, approvalMode, adminIDs } = threadInfo;
    if (participantIDs.includes(senderID)) return api.sendMessage(`You are already in this group.`, threadID, messageID);
    api.addUserToGroup(senderID, ID[body - 1]);
    if (approvalMode == true && !adminIDs.some(item => item.id == api.getCurrentUserID())) return api.sendMessage("Added you to the group's approval list...Custom yourself.", threadID, messageID);
    else return api.sendMessage(`My wife just added you to the group ${threadInfo.threadName} already. Check in the waiting or spam message section if you don't see the box \nA lot 💟`, threadID, messageID);
  } catch (error) {
    return api.sendMessage(`I'm wrong so I can't add you to that group:<.\n\n${error}`, threadID, messageID);
  }
}

module.exports.run = async function({ api, event, Threads }) {
  var { threadID, messageID, senderID } = event;
  var msg = `🔰==[ BOX LIST ]==🔰\n\n`, number = 0, ID = [];
  var allThreads = await Threads.getAll();
  for (var i of allThreads) {
    number++;
    msg += `${number}. ${i.threadInfo.threadName}\n`;
    ID.push(i.threadID)
  }
  msg += `\n👉 Reply this message with the number corresponding to the group you want to enter`
  return api.sendMessage(msg, threadID, (error, info) => {
    global.client.handleReply.push({
      name: this.config.name,
      author: senderID,
     messageID: info.messageID,
      ID: ID      
    })
  }, messageID)
}
