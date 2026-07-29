module.exports.config = {
  name: "count",
  version: "0.0.2",
  hasPermssion: 0,
  credits: "SaGor",
  description: "Count group stats",
  commandCategory: "user",
  usages: "message/admin/member/male/female/gei/allgroup/alluser",
  cooldowns: 5,
};

module.exports.run = async function({ api, Threads, Users, event, args }) {
  var input = args.join("");
  var gendernam = [];
  var gendernu = [];
  var nope = [];
  let threadInfo = await api.getThreadInfo(event.threadID);

  for (let z in threadInfo.userInfo) {
    var g = threadInfo.userInfo[z].gender;
    if (g == "MALE") gendernam.push(g);
    else if (g == "FEMALE") gendernu.push(g);
    else nope.push(g);
  }

  var out = (msg) => api.sendMessage(msg, event.threadID, event.messageID);
  var boxget = await Threads.getAll(["threadID"]);
  var userget = await Users.getAll(["userID"]);

  if (!input) return out("Please enter a tag: message/admin/member/male/female/gei/allgroup/alluser");
  if (input == "message") return out(`This group has ${threadInfo.messageCount} messages`);
  if (input == "admin") return out(`This group has ${threadInfo.adminIDs.length} administrators`);
  if (input == "member") return out(`This group has ${threadInfo.participantIDs.length} members`);
  if (input == "male") return out(`This group has ${gendernam.length} male members`);
  if (input == "female") return out(`This group has ${gendernu.length} female members`);
  if (input == "gei") return out(`This group has ${nope.length} unspecified gender members`);
  if (input == "allgroup") return out(`Total ${boxget.length} groups using this bot`);
  if (input == "alluser") return out(`Total ${userget.length} users using this bot`);
};
