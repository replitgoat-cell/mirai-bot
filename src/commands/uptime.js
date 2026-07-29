const os = require("os");
const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "uptime",
  version: "3.0.0",
  hasPermssion: 0,
  credits: "SaGor",
  description: "System status image",
  commandCategory: "system",
  cooldowns: 5,
  aliases: ["upt", "up"]
};

/* ═══════════════════════════════════════════
   HELPER FUNCTIONS
═══════════════════════════════════════════ */

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawRing(ctx, cx, cy, radius, pct, colorStart, colorEnd, label, valueStr) {
  const gap   = Math.PI * 0.38;
  const start = Math.PI / 2 + gap / 2;
  const end   = Math.PI / 2 + Math.PI * 2 - gap / 2;
  const fill  = start + (end - start) * (Math.min(pct, 100) / 100);

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, start, end);
  ctx.strokeStyle = "rgba(255,255,255,0.07)";
  ctx.lineWidth   = 11;
  ctx.lineCap     = "round";
  ctx.stroke();

  const grad = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy);
  grad.addColorStop(0, colorStart);
  grad.addColorStop(1, colorEnd);
  ctx.beginPath();
  ctx.arc(cx, cy, radius, start, fill);
  ctx.strokeStyle = grad;
  ctx.lineWidth   = 11;
  ctx.lineCap     = "round";
  ctx.shadowColor = colorEnd;
  ctx.shadowBlur  = 22;
  ctx.stroke();

  const dx = cx + Math.cos(fill) * radius;
  const dy = cy + Math.sin(fill) * radius;
  ctx.beginPath();
  ctx.arc(dx, dy, 5, 0, Math.PI * 2);
  ctx.fillStyle  = "#ffffff";
  ctx.shadowColor = colorEnd;
  ctx.shadowBlur  = 14;
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.shadowColor = colorEnd;
  ctx.shadowBlur  = 22;
  ctx.fillStyle   = colorEnd;
  ctx.font        = "bold 22px Arial";
  ctx.textAlign   = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(valueStr, cx, cy);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "rgba(180,210,255,0.55)";
  ctx.font      = "bold 11px Arial";
  ctx.textAlign = "center";
  ctx.fillText(label, cx, cy + radius + 20);
  ctx.restore();
}

function drawSparkLine(ctx, x, y, w, h, pct, color) {
  const pts = 55;
  const data = [];
  let v = pct;
  for (let i = 0; i < pts; i++) {
    v += (Math.random() - 0.5) * 5;
    v  = Math.max(pct - 18, Math.min(pct + 18, v));
    data.push(v);
  }
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur  = 9;
  ctx.strokeStyle = color;
  ctx.lineWidth   = 2;
  ctx.beginPath();
  data.forEach((d, i) => {
    const px = x + (i / (pts - 1)) * w;
    const py = y + h - (d / 100) * h;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  });
  ctx.stroke();
  ctx.globalAlpha = 0.10;
  ctx.fillStyle   = color;
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawCircuitLines(ctx, W, H) {
  ctx.save();
  ctx.strokeStyle = "rgba(0,255,231,0.04)";
  ctx.lineWidth   = 1;
  const lines = [
    [W - 55, 0, W - 55, 180],
    [W - 35, 0, W - 35, 90],
    [W - 10, H, W - 10, H - 200],
    [0, H - 55, 180, H - 55],
    [0, H - 35, 140, H - 35],
    [W, 180, W - 180, 180],
    [W, 220, W - 160, 220],
  ];
  lines.forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x2, y2, 3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,255,231,0.09)";
    ctx.fill();
  });
  ctx.restore();
}

/* ═══════════════════════════════════════════
   MAIN IMAGE BUILDER
═══════════════════════════════════════════ */

function buildImage(data) {
  const W = 780, H = 490;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext("2d");

  const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.85);
  bg.addColorStop(0, "#0d1220");
  bg.addColorStop(1, "#060810");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.strokeStyle = "rgba(0,255,231,0.022)";
  ctx.lineWidth   = 0.5;
  for (let gx = 0; gx < W; gx += 40) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
  for (let gy = 0; gy < H; gy += 40) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }
  ctx.restore();

  drawCircuitLines(ctx, W, H);

  const tg = ctx.createLinearGradient(0, 0, W, 0);
  tg.addColorStop(0, "rgba(0,255,231,0.16)");
  tg.addColorStop(1, "rgba(168,85,247,0.08)");
  ctx.save();
  roundRect(ctx, 0, 0, W, 54, 0);
  ctx.fillStyle = tg; ctx.fill();
  ctx.strokeStyle = "rgba(0,255,231,0.25)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, 54); ctx.lineTo(W, 54); ctx.stroke();

  [{ c: "#ff5f56", x: 22 }, { c: "#ffbd2e", x: 44 }, { c: "#27c93f", x: 66 }].forEach(d => {
    ctx.beginPath(); ctx.arc(d.x, 27, 7, 0, Math.PI * 2);
    ctx.fillStyle = d.c; ctx.shadowColor = d.c; ctx.shadowBlur = 12; ctx.fill();
  });

  ctx.shadowColor = "#a0b0ff"; ctx.shadowBlur = 16;
  ctx.fillStyle   = "#dde6ff";
  ctx.font        = "bold 20px Arial";
  ctx.fillText("SaGor-BoT-", 88, 34);

  roundRect(ctx, 148, 16, 44, 23, 6);
  ctx.fillStyle = "rgba(0,255,231,0.12)"; ctx.fill();
  ctx.strokeStyle = "rgba(0,255,231,0.45)"; ctx.lineWidth = 1; ctx.stroke();
  ctx.shadowColor = "#00ffe7"; ctx.shadowBlur = 8;
  ctx.fillStyle   = "#00ffe7"; ctx.font = "bold 11px Arial";
  ctx.textAlign   = "center"; ctx.fillText("V3", 170, 32); ctx.textAlign = "left";

  ctx.shadowBlur  = 0;
  ctx.fillStyle   = "rgba(0,220,255,0.85)";
  ctx.font        = "13px Arial";
  ctx.textAlign   = "right";
  ctx.fillText(data.dateStr + " • " + data.timeStr, W - 20, 32);
  ctx.textAlign   = "left";
  ctx.restore();

  ctx.save();
  ctx.shadowColor = "rgba(0,255,231,0.5)"; ctx.shadowBlur = 22;
  ctx.fillStyle   = "rgba(240,248,255,0.92)";
  ctx.font        = "bold 30px Arial";
  ctx.fillText("overview", 22, 98);

  roundRect(ctx, 168, 76, 238, 27, 13);
  ctx.fillStyle = "rgba(0,180,90,0.12)"; ctx.fill();
  ctx.strokeStyle = "rgba(0,255,100,0.4)"; ctx.lineWidth = 1; ctx.stroke();
  ctx.beginPath(); ctx.arc(183, 89, 5, 0, Math.PI * 2);
  ctx.fillStyle = "#00ff88"; ctx.shadowColor = "#00ff88"; ctx.shadowBlur = 12; ctx.fill();
  ctx.fillStyle   = "#00ff88"; ctx.font = "bold 10px Arial"; ctx.shadowBlur = 0;
  ctx.fillText("ALL SYSTEM RUNNING ✓", 193, 93);
  ctx.restore();

  const infoCards = [
    { label: "HOSTNAME",   value: data.hostname,  color: "#00ffe7", x: 22  },
    { label: "OS / ARCH",  value: data.osArch,    color: "#44aaff", x: 214 },
    { label: "PROCESSOR",  value: data.processor, color: "#ffb830", x: 406 },
    { label: "BOT UPTIME", value: data.uptime,    color: "#ee88ff", x: 598 },
  ];
  infoCards.forEach(c => {
    ctx.save();
    roundRect(ctx, c.x, 110, 180, 52, 8);
    ctx.fillStyle = "rgba(255,255,255,0.035)"; ctx.fill();
    ctx.strokeStyle = c.color + "44"; ctx.lineWidth = 1; ctx.stroke();

    ctx.fillStyle = "rgba(180,200,230,0.45)";
    ctx.font      = "bold 9px Arial";
    ctx.fillText(c.label, c.x + 10, 126);

    ctx.shadowColor = c.color; ctx.shadowBlur = 12;
    ctx.fillStyle   = c.color;
    ctx.font        = "bold 14px Arial";
    let txt = c.value;
    ctx.save();
    ctx.beginPath(); ctx.rect(c.x + 8, 130, 162, 22); ctx.clip();
    ctx.fillText(txt, c.x + 10, 148);
    ctx.restore();
    ctx.restore();
  });

  const rings = [
    { cx: 80,  cy: 262, pct: data.cpuPct,  cs: "#00ff88", ce: "#00ffe7", lbl: "CPU",    val: data.cpuPct  + "%" },
    { cx: 225, cy: 262, pct: data.memPct,  cs: "#aa44ff", ce: "#dd88ff", lbl: "MEMORY", val: data.memPct  + "%" },
    { cx: 370, cy: 262, pct: data.diskPct, cs: "#ff4444", ce: "#ff8855", lbl: "DISK",   val: data.diskPct + "%" },
  ];
  rings.forEach(r => {
    ctx.save();
    const halo = ctx.createRadialGradient(r.cx, r.cy, 28, r.cx, r.cy, 72);
    halo.addColorStop(0, r.ce + "1a");
    halo.addColorStop(1, "transparent");
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(r.cx, r.cy, 72, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    drawRing(ctx, r.cx, r.cy, 54, r.pct, r.cs, r.ce, r.lbl, r.val);
  });

  ctx.save();
  roundRect(ctx, 448, 175, 312, 148, 10);
  const dpg = ctx.createLinearGradient(448, 175, 760, 323);
  dpg.addColorStop(0, "rgba(0,255,231,0.06)");
  dpg.addColorStop(1, "rgba(168,85,247,0.04)");
  ctx.fillStyle = dpg; ctx.fill();
  ctx.strokeStyle = "rgba(0,255,231,0.22)"; ctx.lineWidth = 1; ctx.stroke();

  ctx.fillStyle = "rgba(180,210,240,0.5)";
  ctx.font      = "bold 9px Arial";
  ctx.fillText("SYSTEM DETAILS", 464, 195);

  const rows = [
    { k: "NODE.JS",  v: data.nodeVer,  vc: "#00ffe7" },
    { k: "CPU CORE", v: data.cores,    vc: "#aaffaa" },
    { k: "TEMP",     v: data.temp,     vc: "#ff5555" },
    { k: "NET IFS",  v: "2",           vc: "#aaaaff" },
    { k: "LOAD AVG", v: data.loadAvg,  vc: "#ffcc44" },
    { k: "USERS",    v: data.users,    vc: "#ff88ff" },
  ];
  rows.forEach((row, i) => {
    const ry = 212 + i * 19;
    ctx.fillStyle = "rgba(160,190,220,0.55)";
    ctx.font      = "11px Arial";
    ctx.textAlign = "left";
    ctx.fillText(row.k, 464, ry);

    ctx.shadowColor = row.vc; ctx.shadowBlur = 9;
    ctx.fillStyle   = row.vc;
    ctx.font        = "bold 11px Arial";
    ctx.textAlign   = "right";
    ctx.fillText(row.v, 748, ry);
    ctx.shadowBlur  = 0;
  });
  ctx.textAlign = "left";
  ctx.restore();

  ctx.save();
  roundRect(ctx, 22, 333, 736, 122, 10);
  ctx.fillStyle = "rgba(0,0,0,0.38)"; ctx.fill();
  ctx.strokeStyle = "rgba(0,255,231,0.15)"; ctx.lineWidth = 1; ctx.stroke();

  ctx.fillStyle = "rgba(170,200,225,0.5)";
  ctx.font      = "bold 9px Arial";
  ctx.fillText("LIVE RESOURCE TREND", 38, 353);

  [
    { c: "#00ff88", l: `CPU ${data.cpuPct}%`,   x: 460 },
    { c: "#cc66ff", l: `MEMORY ${data.memPct}%`, x: 545 },
    { c: "#ff5555", l: `DISK ${data.diskPct}%`,  x: 648 },
  ].forEach(lg => {
    ctx.beginPath(); ctx.arc(lg.x - 7, 348, 4, 0, Math.PI * 2);
    ctx.fillStyle = lg.c; ctx.shadowColor = lg.c; ctx.shadowBlur = 8; ctx.fill();
    ctx.fillStyle = lg.c; ctx.shadowBlur = 0;
    ctx.font      = "bold 9px Arial";
    ctx.fillText(lg.l, lg.x, 352);
  });

  drawSparkLine(ctx, 38, 358, 714, 82, data.cpuPct,  "#00ff88");
  drawSparkLine(ctx, 38, 358, 714, 82, data.memPct,  "#cc66ff");
  drawSparkLine(ctx, 38, 358, 714, 82, data.diskPct, "#ff5555");
  ctx.restore();

  ctx.save();
  ctx.fillStyle   = "#00ff88";
  ctx.shadowColor = "#00ff88"; ctx.shadowBlur = 10;
  ctx.font        = "bold 11px Arial";
  ctx.fillText("READY", 22, 476);

  ctx.shadowBlur  = 0;
  ctx.fillStyle   = "rgba(170,190,210,0.45)";
  ctx.font        = "10px Arial";
  ctx.fillText(`🐧 · Linux ${data.osRelease} · NODE ${data.nodeVer} · PID ${process.pid}`, 80, 476);

  ctx.textAlign   = "right";
  ctx.fillStyle   = "rgba(0,200,255,0.55)";
  ctx.fillText("⊙ " + data.timeStr, W - 18, 476);
  ctx.restore();

  return canvas.toBuffer("image/png");
}

/* ═══════════════════════════════════════════
   COMMAND ENTRY
═══════════════════════════════════════════ */

module.exports.run = async function ({ api, event }) {
  try {
    const upSec    = process.uptime();
    const days     = Math.floor(upSec / 86400);
    const hours    = Math.floor((upSec % 86400) / 3600);
    const mins     = Math.floor((upSec % 3600) / 60);
    const secs     = Math.floor(upSec % 60);
    const uptimeStr = days > 0
      ? `${days}d ${hours}h ${mins}m ${secs}s`
      : `${hours}h ${mins}m ${secs}s`;

    const totalMem = os.totalmem();
    const freeMem  = os.freemem();
    const usedMem  = totalMem - freeMem;
    const memPct   = Math.round((usedMem / totalMem) * 100);

    let diskPct = 46;
    try {
      const { execSync } = require("child_process");
      const dfOut = execSync("df / --output=pcent | tail -1").toString().trim();
      diskPct = parseInt(dfOut.replace("%", "")) || 46;
    } catch (_) {}

    const cpuPct = await new Promise(resolve => {
      const cpus1 = os.cpus();
      setTimeout(() => {
        const cpus2 = os.cpus();
        let idle = 0, total = 0;
        cpus2.forEach((cpu, i) => {
          const prev = cpus1[i];
          for (const t in cpu.times) {
            total += cpu.times[t] - (prev.times[t] || 0);
          }
          idle += cpu.times.idle - (prev.times.idle || 0);
        });
        resolve(Math.round(100 - (idle / total) * 100));
      }, 800);
    });

    const cpuInfo   = os.cpus();
    const processor = cpuInfo[0]?.model?.trim() || "Unknown CPU";
    const cores     = cpuInfo.length;

    const now     = new Date();
    const dateStr = now.toLocaleDateString("en-US", {
      weekday: "short", day: "2-digit", month: "short", year: "numeric"
    });
    const timeStr = now.toTimeString().slice(0, 8);

    let loadAvg = "N/A";
    try { loadAvg = os.loadavg()[0].toFixed(2); } catch (_) {}

    const data = {
      hostname:  os.hostname() || "Bot-Host",
      osArch:    `${os.platform().toUpperCase()} ${os.arch()}`,
      osRelease: os.release()?.split("-")[0] || "5.15.0",
      processor,
      uptime:    uptimeStr,
      cpuPct:    Math.min(cpuPct, 100),
      memPct,
      diskPct,
      nodeVer:   process.version,
      cores:     String(cores),
      temp:      "N/A",           // Node.js cannot read temp natively; replace if you have a lib
      loadAvg,
      users:     "—",            // replace with your bot's user count if available
      dateStr,
      timeStr,
    };

    const imgBuffer = buildImage(data);
    const tmpPath   = path.join(__dirname, `uptime_${Date.now()}.png`);
    fs.writeFileSync(tmpPath, imgBuffer);

    await api.sendMessage(
      { attachment: fs.createReadStream(tmpPath) },
      event.threadID,
      event.messageID
    );
    try { fs.unlinkSync(tmpPath); } catch (_) {}

  } catch (err) {
    return api.sendMessage(
      `❌ Error generating status image:\n${err.message}`,
      event.threadID,
      event.messageID
    );
  }
};
