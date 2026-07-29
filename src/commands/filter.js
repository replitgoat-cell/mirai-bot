module.exports.config = {
    name: "die",
    version: "2.0.0",
    hasPermssion: 1,
    credits: "SaGor",
    description: "Filter Facebook User",
    commandCategory: "filter box",
    usages: "",
    cooldowns: 300
}
module.exports.run = async function({ api: a, event: b }) {
    var { userInfo: c, adminIDs: d } = await a.getThreadInfo(b.threadID), f = 0, e = 0, g = [];
    for (const d of c) void 0 == d.gender && g.push(d.id);
    return d = d.map((a) => a.id).some((b) => b == a.getCurrentUserID()), 0 == g.length ? a.sendMessage("In your group does not exist 'Facebook User'.", b.threadID) : a.sendMessage("Existing group of friends" + g.length + "'Facebook users'", b.threadID, function() {
        return d ? a.sendMessage("Start filtering...\nMade by SaGor", b.threadID, async function() {
            for (const c of g) try {
                await new Promise((a) => setTimeout(a, 1e3)),
                await a.removeUserFromGroup(parseInt(c), b.threadID),
                f++
            } catch (a) {
                e++
            }
            a.sendMessage("Filtered successfully" + f + "peoples.", b.threadID, function() {
                if (0 != e) return a.sendMessage("Filtered Failed" + e + "peoples.", b.threadID)
            })
        }) : a.sendMessage("But bot is not admin so it can't filter.", b.threadID)
    })
};
