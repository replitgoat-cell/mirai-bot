const chalk = require("chalk");
const moment = require("moment-timezone");

module.exports.config = {
  name: "console",
  version: "2.0.0",
  hasPermssion: 3,
  credits: "SaGor",
  description: "Beautiful console logger",
  commandCategory: "Admin-bot system",
  usages: "console",
  cooldowns: 0
};

module.exports.handleEvent = async function ({
  api,
  Users,
  event
}) {
  const { threadID, senderID, body } = event;

  if (senderID === global.data.botID) return;

  const threadData = global.data.threadData.get(threadID) || {};
  if (threadData.console === true) return;

  const threadInfo = global.data.threadInfo.get(threadID) || {};
  const threadName = threadInfo.threadName || "Unknown Group";

  const userName = await Users.getNameUser(senderID);
  const message = body || "Media/Attachment";

  const time = moment.tz("Asia/Dhaka").format("LLLL");

  const colors = [
    "#FF9900", "#FFFF33", "#33FFFF", "#FF99FF", "#FF3366",
    "#FFFF66", "#FF00FF", "#66FF99", "#00CCFF", "#FF0099",
    "#FF0066", "#7900FF", "#93FFD8", "#CFFFDC", "#FF5B00",
    "#3B44F6", "#A6D1E6", "#7F5283", "#A66CFF", "#F05454",
    "#FCF8E8", "#94B49F", "#47B5FF", "#B8FFF9", "#42C2FF",
    "#FF7396"
  ];

  const getColor = () => colors[Math.floor(Math.random() * colors.length)];

  console.log(
    chalk.hex(getColor())(`GROUP : ${threadName}`),
    "\n" + chalk.hex(getColor())(`THREAD: ${threadID}`),
    "\n" + chalk.hex(getColor())(`USER  : ${userName}`),
    "\n" + chalk.hex(getColor())(`UID   : ${senderID}`),
    "\n" + chalk.hex(getColor())(`MSG   : ${message}`),
    "\n" + chalk.hex(getColor())(`[ ${time} ]`),
    "\n" + chalk.hex(getColor())("━━━━━━━━━ SAGOR ━━━━━━━━━\n")
  );
};

module.exports.languages = {
  en: {
    on: "on",
    off: "off",
    successText: "console success!"
  }
};

module.exports.run = async function ({
  api,
  event,
  Threads,
  getText
}) {
  const { threadID, messageID } = event;

  let data = (await Threads.getData(threadID)).data || {};

  data.console = !(data.console === true);

  await Threads.setData(threadID, { data });
  global.data.threadData.set(threadID, data);

  const status = data.console ? getText("off") : getText("on");

  return api.sendMessage(
    `${status} ${getText("successText")}`,
    threadID,
    messageID
  );
};