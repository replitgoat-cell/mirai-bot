const os = require("os");

module.exports.config = {
 name: "up2",
 version: "4.1.0",
 hasPermssion: 0,
 credits: "SaGor",
 description: "System status with counters",
 commandCategory: "system",
 cooldowns: 5,
 aliases: []
};

module.exports.run = async function({ api, event }) {
 try {
 const startPing = Date.now();

 const t = process.uptime();
 const d = Math.floor(t / 86400);
 const h = Math.floor((t % 86400) / 3600);
 const m = Math.floor((t % 3600) / 60);
 const s = Math.floor(t % 60);
 const uptime = `${d}d ${h}h ${m}m ${s}s`;

 const osTime = os.uptime();
 const od = Math.floor(osTime / 86400);
 const oh = Math.floor((osTime % 86400) / 3600);
 const om = Math.floor((osTime % 3600) / 60);
 const osUp = `${od}d ${oh}h ${om}m`;

 const totalMem = os.totalmem() / 1024 / 1024 / 1024;
 const freeMem = os.freemem() / 1024 / 1024 / 1024;
 const usedMem = totalMem - freeMem;

 const mem = process.memoryUsage();
 const heap = (mem.heapUsed / 1024 / 1024).toFixed(2);
 const rss = (mem.rss / 1024 / 1024).toFixed(2);

 const cpuInfo = os.cpus();
 const cpu = cpuInfo[0]?.model || "Unknown";
 const cores = cpuInfo.length;

 const load = os.loadavg()[0].toFixed(2);

 const platform = os.platform();
 const release = os.release();
 const node = process.version;

 const restarts = global.countRestart || 0;
 const botName = global.config?.BOTNAME || "SaGor Bot";

 const cmdCount = global.commandCount || 0;
 const evtCount = global.eventCount || 0;

 const ping = Date.now() - startPing;

 const msg =
`━━━━━━━━━━━━━━━━
🤖 ${botName}
━━━━━━━━━━━━━━━━

⏱️ Bot Uptime : ${uptime}
🖥️ OS Uptime : ${osUp}
📶 Ping : ${ping} ms
🔄 Restarts : ${restarts}

💾 RAM:
 ├ Used : ${usedMem.toFixed(2)} GB
 ├ Free : ${freeMem.toFixed(2)} GB
 └ Total : ${totalMem.toFixed(2)} GB

🧠 Process:
 ├ Heap : ${heap} MB
 └ RSS : ${rss} MB

⚡ CPU:
 ├ ${cpu}
 ├ Cores : ${cores}
 └ Load : ${load}

💻 System:
 ├ ${platform} (${release})
 └ Node : ${node}

━━━━━━━━━━━━━━━━`;

 return api.sendMessage(msg, event.threadID, event.messageID);

 } catch (err) {
 const errMsg = err?.message || err?.error || JSON.stringify(err);
 return api.sendMessage(
 `❌ Uptime error: ${errMsg}`,
 event.threadID,
 event.messageID
 );
 }
};
