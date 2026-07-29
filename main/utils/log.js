const chalk = require('chalk');
const gradient = require('gradient-string');

const gradientBot    = gradient('#243aff', '#4687f0', '#5800d4');
const gradientCmd    = gradient('#00c853', '#b2ff59');
const gradientEvent  = gradient('#ff6f00', '#ffca28');
const gradientDB     = gradient('#00bcd4', '#80deea');
const gradientSystem = gradient('#ab47bc', '#ce93d8');
const gradientServer = gradient('#f06292', '#f48fb1');
const gradientSuccess = gradient('#00e676', '#69f0ae');
const gradientPing    = gradient('#40c4ff', '#00e5ff');
const gradientCrash   = gradient('#ff6d00', '#ffab40');
const gradientBoot    = gradient('#e040fb', '#7c4dff', '#00bcd4');

const _bootTime = Date.now();

function ts() {
  return chalk.gray('[' + new Date().toLocaleTimeString('en-BD', { hour12: false }) + ']');
}

function getUptime() {
  const s = Math.floor((Date.now() - _bootTime) / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function logger(data, option) {
  option = String(option || '[ BOT ]').toUpperCase();

  if (option.includes('ERROR') || option.includes('ERR')) {
    return console.log(ts(), chalk.bold.bgRed.white(' ✖ ERROR '), chalk.red('▶'), chalk.red(data));
  }
  if (option.includes('WARN')) {
    return console.log(ts(), chalk.bold.bgYellow.black(' ⚠ WARN '), chalk.yellow('▶'), chalk.yellow(data));
  }
  if (option.includes('DATABASE') || option.includes('DB')) {
    const d = String(data).toLowerCase();
    if (d.includes('successfully') || d.includes('success')) {
      return console.log(ts(), chalk.bold.bgGreen.black(' ✔ DATABASE '), chalk.greenBright('▶'), chalk.cyan(data));
    }
    if (d.includes('fail') || d.includes('error')) {
      return console.log(ts(), chalk.bold.bgRed.white(' ✖ DATABASE '), chalk.red('▶'), chalk.red(data));
    }
    if (d.includes('retry') || d.includes('retrying')) {
      return console.log(ts(), chalk.bold.bgYellow.black(' 🔄 DATABASE '), chalk.yellow('▶'), chalk.yellow(data));
    }
    return console.log(ts(), chalk.bold(gradientDB(' ◈ DATABASE ')), chalk.cyan('▶'), chalk.cyan(data));
  }
  if (option.includes('SERVER')) {
    return console.log(ts(), chalk.bold(gradientServer(' ◈ SERVER ')), chalk.magenta('▶'), chalk.magenta(data));
  }
  if (option.includes('UPDATE')) {
    const d = String(data).toLowerCase();
    if (d.includes('available')) {
      return console.log(ts(), chalk.bold.bgBlue.white(' 🔔 UPDATE '), chalk.blueBright('▶'), chalk.blueBright(data));
    }
    return console.log(ts(), chalk.bold.bgGreen.black(' ✔ UPDATE '), chalk.green('▶'), chalk.green(data));
  }
  if (option.includes('BOT ONLINE')) {
    console.log('\n' + chalk.bold(gradientBot('━'.repeat(58))));
    console.log(ts(), chalk.bold(gradientBot('  🟢 BOT ONLINE ── ')) + chalk.white(data));
    console.log(chalk.bold(gradientBot('━'.repeat(58))) + '\n');
    return;
  }
  if (option.includes('LOGIN')) {
    const d = String(data).toLowerCase();
    if (d.includes('success') || d.includes('logged')) {
      return console.log(ts(), chalk.bold.bgGreen.black(' 🔐 LOGIN '), chalk.greenBright('▶'), chalk.greenBright(data));
    }
    if (d.includes('fail') || d.includes('error')) {
      return console.log(ts(), chalk.bold.bgRed.white(' 🔒 LOGIN '), chalk.red('▶'), chalk.red(data));
    }
    return console.log(ts(), chalk.bold.bgYellow.black(' 🔑 LOGIN '), chalk.yellow('▶'), chalk.yellow(data));
  }
  if (option.includes('COOKIE')) {
    const d = String(data).toLowerCase();
    if (d.includes('switch')) {
      return console.log(ts(), chalk.bold.bgBlue.white(' 🔄 COOKIE '), chalk.blueBright('▶'), chalk.blueBright(data));
    }
    if (d.includes('exhaust') || d.includes('invalid') || d.includes('expired')) {
      return console.log(ts(), chalk.bold.bgRed.white(' 🍪 COOKIE '), chalk.red('▶'), chalk.bold.red(data));
    }
    return console.log(ts(), chalk.bold.bgCyan.black(' 🍪 COOKIE '), chalk.cyan('▶'), chalk.cyan(data));
  }
  if (option.includes('RESTART') || option.includes('WATCHDOG') || option.includes('SHUTDOWN')) {
    const tag = option.replace(/[\[\]\s]/g, '');
    return console.log(ts(), chalk.bold.bgMagenta.white(` 🔄 ${tag} `), chalk.magenta('▶'), chalk.magenta(data));
  }
  if (option.includes('PING') || option.includes('LATENCY') || option.includes('NETWORK')) {
    return console.log(ts(), chalk.bold(gradientPing(' 📡 PING ')), chalk.cyan('▶'), chalk.cyan(data));
  }
  if (option.includes('UPTIME')) {
    return console.log(ts(), chalk.bold.bgCyan.black(' ⏱  UPTIME '), chalk.cyan('▶'), chalk.cyan(data));
  }
  if (option.includes('SYSTEM') || option.includes('CONFIG')) {
    return console.log(ts(), chalk.bold(gradientSystem(' ⚙ SYSTEM ')), chalk.magenta('▶'), chalk.white(data));
  }
  if (option.includes('TWO ID') || option.includes('ACCOUNT') || option.includes('RELOGIN')) {
    return console.log(ts(), chalk.bold.bgMagenta.white(' 👥 ACCOUNT '), chalk.magenta('▶'), chalk.magenta(data));
  }
  if (option.includes('DASHBOARD')) {
    return console.log(ts(), chalk.bold.bgBlue.white(' 🖥  DASHBOARD '), chalk.blue('▶'), chalk.blue(data));
  }
  if (option.includes('RECONNECT') || option.includes('CONNECTION')) {
    return console.log(ts(), chalk.bold.bgYellow.black(' 🔗 CONNECTION '), chalk.yellow('▶'), chalk.yellow(data));
  }
  console.log(ts(), chalk.bold(gradientBot(option + ' ')), chalk.white('▶'), chalk.white(data));
}

logger.bootScreen = function (botName, version, prefix, adminCount) {
  const art = [
    '  ███████╗ █████╗  ██████╗  ██████╗ ██████╗      ██████╗  ██████╗ ████████╗',
    '  ██╔════╝██╔══██╗██╔════╝ ██╔═══██╗██╔══██╗     ██╔══██╗██╔═══██╗╚══██╔══╝',
    '  ███████╗███████║██║  ███╗██║   ██║██████╔╝     ██████╔╝██║   ██║   ██║   ',
    '  ╚════██║██╔══██║██║   ██║██║   ██║██╔══██╗     ██╔══██╗██║   ██║   ██║   ',
    '  ███████║██║  ██║╚██████╔╝╚██████╔╝██║  ██║     ██████╔╝╚██████╔╝   ██║   ',
    '  ╚══════╝╚═╝  ╚═╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═╝     ╚═════╝  ╚═════╝   ╚═╝   ',
  ];
  console.log('\n' + chalk.bold(gradientBoot('═'.repeat(76))));
  for (const line of art) console.log(chalk.bold(gradientBoot(line)));
  console.log(chalk.bold(gradientBoot('═'.repeat(76))));
  console.log();
  console.log(chalk.bold(gradientBot('  🤖  Bot Name  : ')) + chalk.white(botName || 'SAGOR Bot'));
  if (version)    console.log(chalk.bold(gradientSystem('  📦  Version   : ')) + chalk.white(version));
  if (prefix)     console.log(chalk.bold(gradientCmd('  🔧  Prefix    : ')) + chalk.white(prefix));
  if (adminCount !== undefined) console.log(chalk.bold(gradientEvent('  👑  Admins    : ')) + chalk.white(adminCount));
  console.log(chalk.bold(gradientBot('  🕐  Boot Time : ')) + chalk.white(new Date().toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' })));
  console.log(chalk.bold(gradientBot('  🌐  Platform  : ')) + chalk.white(process.platform + ' / Node.js ' + process.version));
  console.log('\n' + chalk.bold(gradientBoot('═'.repeat(76))) + '\n');
};

logger.loader = function (data, option) {
  option = String(option || '').toUpperCase();
  if (option === 'ERROR' || option === 'ERR') {
    return console.log(ts(), chalk.bold.bgRed.white(' ✖ LOAD ERR '), chalk.red('▶'), chalk.bold.red(data));
  }
  if (option === 'WARN') {
    return console.log(ts(), chalk.bold.bgYellow.black(' ⚠ LOAD WARN '), chalk.yellow('▶'), chalk.yellow(data));
  }
  const d = String(data).toLowerCase();
  if (d.includes('success') || d.includes('loaded') || d.includes('found')) {
    return console.log(ts(), chalk.bold.bgGreen.black(' ✔ LOADER '), chalk.greenBright('▶'), chalk.white(data));
  }
  console.log(ts(), chalk.bold(gradientBot('〘 SAGOR-V3 〙')), chalk.white('▶'), chalk.white(data));
};

logger.cmd = function (name) {
  console.log(ts(), chalk.bold(gradientCmd(' ✔ CMD ')), chalk.greenBright('▶ Loaded:'), chalk.bold.white(name));
};

logger.event = function (name) {
  console.log(ts(), chalk.bold(gradientEvent(' ✔ EVT ')), chalk.yellow('▶ Loaded:'), chalk.bold.white(name));
};

logger.fail = function (name, err) {
  const errStr  = String(err || '');
  const firstLine = errStr.split('\n')[0].slice(0, 130);
  const errType = firstLine.includes('SyntaxError') ? '🔴 Syntax Error'
    : firstLine.includes('Cannot find module') ? '📦 Missing Dependency'
    : firstLine.includes('TypeError') ? '🟠 Type Error'
    : '💥 Load Error';

  console.log(
    ts(),
    chalk.bold.bgRed.white(' ✖ FAIL '),
    chalk.red('▶'),
    chalk.bold.white(name),
    chalk.gray('─'),
    chalk.bold.redBright(errType)
  );
  console.log(chalk.gray('         ↳ ') + chalk.red(firstLine));
};

logger.section = function (title) {
  const pad = '─'.repeat(Math.max(0, 48 - title.length));
  console.log('\n' + chalk.bold(gradientSystem(`╔══ ${title.toUpperCase()} ${pad}`)));
};

logger.summary = function (cmdCount, evtCount, ms) {
  const timeEmoji = ms < 2000 ? '⚡' : ms < 5000 ? '✅' : '⏳';
  const timeColor = ms < 2000 ? chalk.greenBright : ms < 5000 ? chalk.yellow : chalk.red;

  console.log('\n' + chalk.bold(gradientBot('╔' + '═'.repeat(52) + '╗')));
  console.log(chalk.bold(gradientBot('║')) + chalk.bold.white('        📊  SAGOR BOT — STARTUP REPORT             ') + chalk.bold(gradientBot('║')));
  console.log(chalk.bold(gradientBot('╠' + '═'.repeat(52) + '╣')));
  console.log(chalk.bold(gradientBot('║ ')) + chalk.bold(gradientCmd('  ✔ Commands : ')) + chalk.white((cmdCount + '').padEnd(36)) + chalk.bold(gradientBot('║')));
  console.log(chalk.bold(gradientBot('║ ')) + chalk.bold(gradientEvent('  ✔ Events   : ')) + chalk.white((evtCount + '').padEnd(36)) + chalk.bold(gradientBot('║')));
  console.log(chalk.bold(gradientBot('║ ')) + chalk.bold(gradientSystem(`  ${timeEmoji} Boot time  : `)) + timeColor((ms + 'ms  (' + (ms / 1000).toFixed(2) + 's)').padEnd(36)) + chalk.bold(gradientBot('║')));
  console.log(chalk.bold(gradientBot('╚' + '═'.repeat(52) + '╝')) + '\n');
};

logger.dbConnect = function (dbType, storage) {
  console.log('\n' + chalk.bold(gradientDB('┌─── DATABASE CONNECTION ─────────────────────────────')));
  console.log(chalk.bold(gradientDB('│  ')) + chalk.bold.greenBright('✔ STATUS  : ') + chalk.white('Connected Successfully'));
  console.log(chalk.bold(gradientDB('│  ')) + chalk.bold.cyan('◈ TYPE    : ') + chalk.white(dbType || 'SQLite'));
  if (storage) console.log(chalk.bold(gradientDB('│  ')) + chalk.bold.cyan('◈ FILE    : ') + chalk.white(storage));
  console.log(chalk.bold(gradientDB('└─────────────────────────────────────────────────────')) + '\n');
};

logger.dbError = function (msg, attempt, maxAttempts) {
  console.log('\n' + chalk.bold.bgRed.white(' ✖ DATABASE ERROR '));
  console.log(chalk.red('  ▶ ') + chalk.bold.red(msg));
  if (attempt) console.log(chalk.yellow(`  ↻ Retry attempt: ${attempt}${maxAttempts ? '/' + maxAttempts : ''}`));
  console.log();
};

logger.loginSuccess = function (userID, cookieFile, accountIndex) {
  console.log('\n' + chalk.bold(gradientSuccess('┌─── LOGIN SUCCESS ───────────────────────────────────')));
  console.log(chalk.bold(gradientSuccess('│  ')) + chalk.bold.greenBright('✔ STATUS  : ') + chalk.white('Logged in successfully'));
  if (userID)                       console.log(chalk.bold(gradientSuccess('│  ')) + chalk.bold.cyan('◈ USER ID : ') + chalk.white(userID));
  if (cookieFile)                   console.log(chalk.bold(gradientSuccess('│  ')) + chalk.bold.cyan('◈ COOKIE  : ') + chalk.white(cookieFile));
  if (accountIndex !== undefined)   console.log(chalk.bold(gradientSuccess('│  ')) + chalk.bold.cyan('◈ ACCOUNT : ') + chalk.white('#' + (accountIndex + 1)));
  console.log(chalk.bold(gradientSuccess('└─────────────────────────────────────────────────────')) + '\n');
};

logger.loginFail = function (msg, cookieIndex, willSwitchTo) {
  console.log('\n' + chalk.bold.bgRed.white(' ✖ LOGIN FAILED '));
  console.log(chalk.red('  ▶ ') + chalk.bold.red(String(msg).slice(0, 120)));
  if (cookieIndex !== undefined)    console.log(chalk.yellow(`  ◈ Cookie #${cookieIndex + 1} rejected`));
  if (willSwitchTo !== undefined)   console.log(chalk.cyan(`  ↷ Switching to Cookie #${willSwitchTo + 1}...`));
  console.log();
};

logger.ping = function (latencyMs, label) {
  let indicator, color;
  if (latencyMs < 200)       { indicator = '🟢 Excellent'; color = chalk.greenBright; }
  else if (latencyMs < 500)  { indicator = '🟡 Good';      color = chalk.yellow; }
  else if (latencyMs < 1000) { indicator = '🟠 Moderate';  color = chalk.yellow; }
  else                       { indicator = '🔴 High';      color = chalk.red; }
  console.log(ts(), chalk.bold(gradientPing(' 📡 PING ')), chalk.cyan('▶'), color(`${label || 'Latency'}: ${latencyMs}ms — ${indicator}`));
};

logger.networkError = function (msg, retryIn) {
  console.log(ts(), chalk.bold.bgRed.white(' 🌐 NETWORK '), chalk.red('▶'), chalk.bold.red(msg));
  if (retryIn) console.log(ts(), chalk.bold.bgYellow.black(' 🔄 RECONNECT '), chalk.yellow('▶'), chalk.yellow(`Auto-reconnecting in ${retryIn}s...`));
};

logger.crash = function (exitCode, restartCount, delayMs) {
  console.log('\n' + chalk.bold(gradientCrash('╔══ 💥 BOT CRASHED ════════════════════════════════')));
  console.log(chalk.bold(gradientCrash('║  ')) + chalk.bold.red('Exit Code  : ') + chalk.white(exitCode ?? 'unknown'));
  console.log(chalk.bold(gradientCrash('║  ')) + chalk.bold.red('Restart #  : ') + chalk.white(restartCount));
  if (delayMs) console.log(chalk.bold(gradientCrash('║  ')) + chalk.bold.yellow('Wait       : ') + chalk.white((delayMs / 1000).toFixed(1) + 's before restart'));
  console.log(chalk.bold(gradientCrash('╚════════════════════════════════════════════════════')) + '\n');
};

logger.configValidation = function (issues) {
  if (!issues || issues.length === 0) return;
  console.log('\n' + chalk.bold.bgYellow.black(' ⚠ CONFIG VALIDATION — MISSING / INVALID FIELDS '));
  for (const issue of issues) console.log(chalk.yellow('  ▶ ') + chalk.white(issue));
  console.log();
};

logger.accounts = function (accountList) {
  console.log('\n' + chalk.bold(gradientSystem('┌─── MULTI-ACCOUNT STATUS ───────────────────────────')));
  accountList.forEach((acc, i) => {
    const status = acc.active ? chalk.bold.greenBright('✔ ACTIVE') : chalk.gray('○ standby');
    const label  = acc.active ? chalk.white(acc.file) : chalk.gray(acc.file);
    console.log(chalk.bold(gradientSystem('│  ')) + `Account #${i + 1}  [${status}]  ${label}`);
  });
  console.log(chalk.bold(gradientSystem('└────────────────────────────────────────────────────')) + '\n');
};

logger.getUptime = getUptime;

module.exports = logger;
