const moment = require("moment-timezone");
const { readdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } = require("fs-extra");
const _fs = require("fs-extra");
const { join, resolve } = require("path");
const { execSync } = require('child_process');
const logger = require("./log.js");
const login = require("sagor-fca");
const axios = require("axios");
const listPackage = JSON.parse(readFileSync('./package.json')).dependencies;
const listbuiltinModules = require("module").builtinModules;
const features = require("./features.js");

global.client = new Object({
    commands: new Map(),
    events: new Map(),
    cooldowns: new Map(),
    eventRegistered: new Array(),
    handleSchedule: new Array(),
    handleReaction: new Array(),
    handleReply: new Array(),
    mainPath: process.cwd(),
    configPath: new String(),
    getTime: function (option) {
        switch (option) {
            case "seconds":  return `${moment.tz("Asia/Dhaka").format("ss")}`;
            case "minutes":  return `${moment.tz("Asia/Dhaka").format("mm")}`;
            case "hours":    return `${moment.tz("Asia/Dhaka").format("HH")}`;
            case "date":     return `${moment.tz("Asia/Dhaka").format("DD")}`;
            case "month":    return `${moment.tz("Asia/Dhaka").format("MM")}`;
            case "year":     return `${moment.tz("Asia/Dhaka").format("YYYY")}`;
            case "fullHour": return `${moment.tz("Asia/Dhaka").format("HH:mm:ss")}`;
            case "fullYear": return `${moment.tz("Asia/Dhaka").format("DD/MM/YYYY")}`;
            case "fullTime": return `${moment.tz("Asia/Dhaka").format("HH:mm:ss DD/MM/YYYY")}`;
        }
    }
});

global.data = new Object({
    threadInfo:    new Map(),
    threadData:    new Map(),
    userName:      new Map(),
    userBanned:    new Map(),
    threadBanned:  new Map(),
    commandBanned: new Map(),
    threadAllowNSFW: new Array(),
    allUserID:     new Array(),
    allCurrenciesID: new Array(),
    allThreadID:   new Array()
});

global.utils       = require("./index");
global.nodemodule  = new Object();
global.config      = new Object();
global.configModule = new Object();
global.moduleData  = new Array();
global.language    = new Object();

var configValue;
try {
    global.client.configPath = join(global.client.mainPath, "config.json");
    configValue = require(global.client.configPath);
    logger.loader("Found file config: config.json");
} catch {
    const tempPath = global.client.configPath.replace(/\.json/g, "") + ".temp";
    if (existsSync(tempPath)) {
        configValue = JSON.parse(readFileSync(tempPath));
        logger.loader(`Found: ${tempPath}`);
    } else {
        return logger.loader("config.json not found!", "error");
    }
}

try {
    for (const key in configValue) global.config[key] = configValue[key];
    logger.loader("Config loaded successfully!");
} catch { return logger.loader("Cannot load config file!", "error"); }

const _cfgIssues = [];
if (!global.config.PREFIX)                  _cfgIssues.push("⚠️  PREFIX is empty — bot may not respond to commands");
if (!global.config.BOTNAME)                 _cfgIssues.push("💡  BOTNAME is not set — using default name");
if (!global.config.ADMINBOT || global.config.ADMINBOT.length === 0 || (global.config.ADMINBOT.length === 1 && !global.config.ADMINBOT[0]))
                                             _cfgIssues.push("👑  ADMINBOT list is empty — no admins configured!");
if (!global.config.APPSTATEPATH)            _cfgIssues.push("🍪  APPSTATEPATH not set — defaulting to cookie.txt");
if (global.config.DeveloperMode === true)   _cfgIssues.push("🔧  DeveloperMode is ON — disable in production");
if (global.config.database && global.config.database.type === "mongodb" && !global.config.database.uriMongodb)
                                             _cfgIssues.push("🗄️  database.type is 'mongodb' but uriMongodb is empty!");
if (_cfgIssues.length > 0) logger.configValidation(_cfgIssues);

const { Sequelize, sequelize } = require("../database");

logger.bootScreen(
    global.config.BOTNAME,
    global.config.version,
    global.config.PREFIX,
    (global.config.ADMINBOT || []).filter(Boolean).length
);

writeFileSync(global.client.configPath + ".temp", JSON.stringify(global.config, null, 4), 'utf8');

const langFile = (readFileSync(join(global.client.mainPath, `main/languages/${global.config.language || "en"}.lang`), { encoding: 'utf-8' })).split(/\r?\n|\r/);
const langData  = langFile.filter(item => item.indexOf('#') !== 0 && item !== '');
for (const item of langData) {
    const getSeparator = item.indexOf('=');
    const itemKey   = item.slice(0, getSeparator);
    const itemValue = item.slice(getSeparator + 1, item.length);
    const head  = itemKey.slice(0, itemKey.indexOf('.'));
    const key   = itemKey.replace(head + '.', '');
    const value = itemValue.replace(/\\n/gi, '\n');
    if (typeof global.language[head] === "undefined") global.language[head] = new Object();
    global.language[head][key] = value;
}

global.getText = function (...args) {
    const langText = global.language;
    if (!langText.hasOwnProperty(args[0])) throw `${__filename} - Not found key language: ${args[0]}`;
    var text = langText[args[0]][args[1]];
    for (var i = 1; i <= args.length - 2; i++) {
        const regEx = RegExp(`%${i}`, 'g');
        text = text.replace(regEx, args[i + 1]);
    }
    return text;
};

function convertToAppState(raw) {

    if (Array.isArray(raw) && raw.length > 0 && raw[0].key && raw[0].value) return raw;

    if (typeof raw === "string") {
        try {
            const parsed = JSON.parse(raw);
            return convertToAppState(parsed);
        } catch (_) {}

        if (raw.includes("\t")) {
            const lines = raw.split("\n").filter(l => l && !l.startsWith("#"));
            const cookies = [];
            for (const line of lines) {
                const parts = line.trim().split("\t");
                if (parts.length >= 7) {
                    cookies.push({
                        key:         parts[5],
                        value:       parts[6],
                        domain:      parts[0].replace(/^#HttpOnly_/, ""),
                        path:        parts[2],
                        hostOnly:    parts[1] !== "TRUE",
                        creation:    new Date().toISOString(),
                        lastAccessed: new Date().toISOString()
                    });
                }
            }
            if (cookies.length > 0) return cookies;
        }

        if (raw.includes("=")) {

            var decoded = raw;
            try { decoded = decodeURIComponent(raw.replace(/\+/g, " ")); } catch (_) {}
            const cookies = [];
            const pairs = decoded.split(/;\s*/);
            for (const pair of pairs) {
                const idx = pair.indexOf("=");
                if (idx === -1) continue;
                const key   = pair.substring(0, idx).trim();
                const value = pair.substring(idx + 1).trim();
                if (key) {
                    cookies.push({
                        key,
                        value,
                        domain:      ".facebook.com",
                        path:        "/",
                        hostOnly:    false,
                        creation:    new Date().toISOString(),
                        lastAccessed: new Date().toISOString()
                    });
                }
            }
            if (cookies.length > 0) return cookies;
        }
    }

    if (typeof raw === "object" && !Array.isArray(raw)) {
        const cookies = [];
        for (const [key, value] of Object.entries(raw)) {
            cookies.push({
                key,
                value: String(value),
                domain:      ".facebook.com",
                path:        "/",
                hostOnly:    false,
                creation:    new Date().toISOString(),
                lastAccessed: new Date().toISOString()
            });
        }
        if (cookies.length > 0) return cookies;
    }

    if (Array.isArray(raw) && raw.length > 0 && raw[0].name && raw[0].value) {
        return raw.map(c => ({
            key:         c.name,
            value:       c.value,
            domain:      c.domain || ".facebook.com",
            path:        c.path   || "/",
            hostOnly:    c.hostOnly !== undefined ? c.hostOnly : false,
            creation:    new Date().toISOString(),
            lastAccessed: new Date().toISOString()
        }));
    }

    throw new Error("Cookie format not recognized! Please provide appstate array, cookie string, or JSON object.");
}

var _cookieFiles = [
    global.config.APPSTATEPATH || "cookie.txt",
    "cookie2.txt",
    "cookie3.txt"
].map(f => resolve(join(global.client.mainPath, f)));

const _activeCookieFlag = resolve(join(global.client.mainPath, ".active_cookie_index"));
if (typeof global._activeCookieIndex !== "number") {
    try {
        if (_fs.existsSync(_activeCookieFlag)) {
            const _idx = parseInt(_fs.readFileSync(_activeCookieFlag, "utf8").trim(), 10);
            global._activeCookieIndex = isNaN(_idx) ? 0 : _idx;
        } else {
            global._activeCookieIndex = 0;
        }
    } catch (_) { global._activeCookieIndex = 0; }
}
function _persistCookieIndex(i) {
    try { _fs.writeFileSync(_activeCookieFlag, String(i), "utf8"); } catch (_) {}
}

function loadCookieFile(filePath) {
    var _rawText = _fs.readFileSync(filePath, "utf8").trim();
    var rawCookie;
    var _needSave = false;
    try {
        rawCookie = JSON.parse(_rawText);
    } catch (_jsonErr) {
        rawCookie = _rawText;
        _needSave = true;
    }
    var _state = convertToAppState(rawCookie);
    if (_needSave || !Array.isArray(rawCookie) || (Array.isArray(rawCookie) && rawCookie[0] && rawCookie[0].name)) {
        _fs.writeFileSync(filePath, JSON.stringify(_state, null, "\t"), "utf8");
        logger.loader("[ COOKIE ] Cookie converted: " + filePath);
    }
    return { state: _state, file: filePath };
}

function findActiveCookie() {
    for (var _i = global._activeCookieIndex; _i < _cookieFiles.length; _i++) {
        if (_fs.existsSync(_cookieFiles[_i])) {
            try {
                var result = loadCookieFile(_cookieFiles[_i]);
                global._activeCookieIndex = _i;
                _persistCookieIndex(_i);
                logger.loader("[ COOKIE ] Using cookie #" + (_i + 1) + ": " + _cookieFiles[_i]);
                return result;
            } catch (err) {
                logger.loader("[ COOKIE WARN ] Failed to load cookie #" + (_i + 1) + ": " + err.message, "warn");
            }
        }
    }
    if (global._activeCookieIndex > 0) {
        global._activeCookieIndex = 0;
        return findActiveCookie();
    }
    return null;
}

var _cookieResult = findActiveCookie();
if (!_cookieResult) {
    logger.loader("[ COOKIE ERROR ] No valid cookie file found (cookie.txt, cookie2.txt, cookie3.txt)", "error");
    return logger.loader(global.getText("sagor", "notFoundPathAppstate"), "error");
}

var appStateFile = _cookieResult.file;
var appState     = _cookieResult.state;
logger.loader(global.getText("sagor", "foundPathAppstate"));

function loadModule(modulePath, moduleName) {
    try {
        var mod = require(modulePath);
        if (!mod.config || (!mod.run && !mod.handleEvent) || !mod.config.commandCategory)
            throw new Error(global.getText('sagor', 'errorFormat'));
        if (global.client.commands.has(mod.config.name || ''))
            throw new Error(global.getText('sagor', 'nameExist'));
        if (!mod.languages || typeof mod.languages !== 'object' || Object.keys(mod.languages).length === 0)
            logger.loader(global.getText('sagor', 'notFoundLanguage', mod.config.name), 'warn');

        if (mod.config.dependencies && typeof mod.config.dependencies === 'object') {
            for (const reqDep in mod.config.dependencies) {
                const reqDepPath = join(__dirname, 'nodemodules', 'node_modules', reqDep);
                try {
                    if (!global.nodemodule.hasOwnProperty(reqDep)) {
                        if (listPackage.hasOwnProperty(reqDep) || listbuiltinModules.includes(reqDep))
                            global.nodemodule[reqDep] = require(reqDep);
                        else global.nodemodule[reqDep] = require(reqDepPath);
                    }
                } catch {
                    logger.loader(global.getText('sagor', 'notFoundPackage', reqDep, mod.config.name), 'warn');
                    try {
                        execSync(
                            'npm --package-lock false --save install ' + reqDep +
                            (mod.config.dependencies[reqDep] === '*' || mod.config.dependencies[reqDep] === ''
                                ? '' : '@' + mod.config.dependencies[reqDep]),
                            { stdio: 'inherit', env: process.env, shell: true, cwd: join(__dirname, 'nodemodules') }
                        );
                        global.nodemodule[reqDep] = listPackage.hasOwnProperty(reqDep) || listbuiltinModules.includes(reqDep)
                            ? require(reqDep) : require(reqDepPath);
                    } catch (installErr) {
                        logger.fail(mod.config.name, `dep install failed: ${reqDep} — ${installErr.message}`);
                        return false;
                    }
                }
            }
        }

        if (mod.config.envConfig) {
            try {
                for (const envConf in mod.config.envConfig) {
                    if (typeof global.configModule[mod.config.name] === 'undefined') global.configModule[mod.config.name] = {};
                    if (typeof global.config[mod.config.name] === 'undefined') global.config[mod.config.name] = {};
                    if (typeof global.config[mod.config.name][envConf] !== 'undefined')
                        global.configModule[mod.config.name][envConf] = global.config[mod.config.name][envConf];
                    else global.configModule[mod.config.name][envConf] = mod.config.envConfig[envConf] || '';
                    if (typeof global.config[mod.config.name][envConf] === 'undefined')
                        global.config[mod.config.name][envConf] = mod.config.envConfig[envConf] || '';
                }
            } catch (error) {
                throw new Error(global.getText('sagor', 'loadedConfig', mod.config.name, JSON.stringify(error)));
            }
        }

        return mod;
    } catch (err) {
        logger.fail(moduleName, String(err));
        return false;
    }
}

function onBot({ models: botModel }) {
    const loginData = { appState };
    login(loginData, async (loginError, loginApiData) => {
        if (loginError) {
            logger(JSON.stringify(loginError), `[ LOGIN ERROR ]`);

            const _errStr = (() => {
                try { return JSON.stringify(loginError) + " " + (loginError && loginError.error ? loginError.error : "") + " " + (loginError && loginError.message ? loginError.message : ""); }
                catch (_) { return String(loginError); }
            })().toLowerCase();
            const _isCookieError = /cookiestate|appstate|not\s*valid|invalid\s*cookie|login[-\s]?approval|checkpoint|session\s*expired/.test(_errStr) || _errStr.trim() === "{}";

            var _nextIndex = global._activeCookieIndex + 1;
            var _switched = false;
            for (var _ci = _nextIndex; _ci < _cookieFiles.length; _ci++) {
                if (_fs.existsSync(_cookieFiles[_ci])) {
                    try {
                        var result = loadCookieFile(_cookieFiles[_ci]);
                        global._activeCookieIndex = _ci;
                        _persistCookieIndex(_ci);
                        appState = result.state;
                        appStateFile = result.file;
                        logger.loginFail(`Login failed with cookie #${global._activeCookieIndex + 1}`, global._activeCookieIndex, _ci);
            logger(`[ COOKIE SWITCH ] Switching to Cookie #${_ci + 1}: ${_cookieFiles[_ci]}`, `[ COOKIE ]`);
                        _switched = true;
                        return onBot({ models: botModel });
                    } catch (_loadErr) {
                        logger(`[ COOKIE SWITCH ] Cookie #${_ci + 1} load Couldn't: ${_loadErr.message}`, `[ WARN ]`);
                    }
                }
            }
            if (!_switched) {
                global._activeCookieIndex = 0;
                _persistCookieIndex(0);
                logger(`[ COOKIE ] All cookies exhausted. Last error: ${_errStr.trim() || "(empty)"}`, `[ ERROR ]`);
                logger("[ COOKIE ] No valid cookies remain — bot is shutting down. Update cookie files & restart.", `[ ERROR ]`);
                process.exit(78);
            }
            return;
        }

        loginApiData.setOptions(global.config.FCAOption);
        writeFileSync(appStateFile, JSON.stringify(loginApiData.getAppState(), null, '\x09'));
        global.client.api     = loginApiData;

        
        try {
            const _uid = loginApiData.getCurrentUserID();
            logger.loginSuccess(_uid, _cookieFiles[global._activeCookieIndex || 0], global._activeCookieIndex || 0);
        } catch (_) { logger('Login successful!', '[ LOGIN ]'); }

        
        if (_cookieFiles.filter(f => require('fs-extra').existsSync(f)).length > 1) {
            const _acList = _cookieFiles.map((f, i) => ({
                file: require('path').basename(f),
                active: i === (global._activeCookieIndex || 0)
            }));
            logger.accounts(_acList);
        }

        global.client.timeStart = Date.now();

        logger.section('Loading Commands');

        const autoLoadCfg = global.config.autoLoadScripts || {};
        if (autoLoadCfg.enable && autoLoadCfg.url) {
            try {
                const _axios = require("axios");
                logger.loader("autoLoadScripts: fetching script list...");
                const _res = await _axios.get(autoLoadCfg.url, { timeout: 15000 });
                const _scriptList = Array.isArray(_res.data) ? _res.data : [];
                const _ignoreCmds   = (autoLoadCfg.ignoreCmds   || "").split(",").map(s => s.trim()).filter(Boolean);
                const _ignoreEvents = (autoLoadCfg.ignoreEvents || "").split(",").map(s => s.trim()).filter(Boolean);
                for (const _script of _scriptList) {
                    if (!_script.name || !_script.content || !_script.type) continue;
                    if (_script.type === "command" && !_ignoreCmds.includes(_script.name)) {
                        const _dest = join(global.client.mainPath, "src/commands", _script.name + ".js");
                        if (!existsSync(_dest)) {
                            writeFileSync(_dest, _script.content, "utf8");
                            logger.loader("autoLoadScripts: saved command → " + _script.name);
                        }
                    } else if (_script.type === "event" && !_ignoreEvents.includes(_script.name)) {
                        const _dest = join(global.client.mainPath, "src/events", _script.name + ".js");
                        if (!existsSync(_dest)) {
                            writeFileSync(_dest, _script.content, "utf8");
                            logger.loader("autoLoadScripts: saved event → " + _script.name);
                        }
                    }
                }
            } catch (_e) {
                logger.loader("autoLoadScripts fetch failed: " + _e.message, "warn");
            }
        }

        const listCommand = readdirSync(global.client.mainPath + '/src/commands')
            .filter(cmd => cmd.endsWith('.js') && !cmd.includes('example') && !global.config.commandDisabled.includes(cmd));

        let cmdLoaded = 0, cmdFailed = 0;

        for (const command of listCommand) {
            try {
                const mod = loadModule(global.client.mainPath + '/src/commands/' + command, command);
                if (!mod) { cmdFailed++; continue; }

                if (mod.onLoad) {
                    try {
                        mod.onLoad({ api: loginApiData, models: botModel });
                    } catch (onLoadErr) {
                        logger.loader(`onLoad failed for ${mod.config.name}: ${onLoadErr.message}`, 'warn');
                        cmdFailed++;
                        continue;
                    }
                }

                if (mod.handleEvent) global.client.eventRegistered.push(mod.config.name);
                global.client.commands.set(mod.config.name, mod);

                logger.cmd(mod.config.name);
                cmdLoaded++;
            } catch (error) {
                logger.fail(command, String(error));
                cmdFailed++;
            }
        }

        logger.section('Loading Events');

        const eventFiles = readdirSync(global.client.mainPath + '/src/events')
            .filter(ev => ev.endsWith('.js') && !global.config.eventDisabled.includes(ev));

        let evtLoaded = 0, evtFailed = 0;

        for (const ev of eventFiles) {
            try {
                const event = require(global.client.mainPath + '/src/events/' + ev);
                if (!event.config || !event.run) throw new Error(global.getText('sagor', 'errorFormat'));
                if (global.client.events.has(event.config.name)) throw new Error(global.getText('sagor', 'nameExist'));

                if (event.config.dependencies && typeof event.config.dependencies === 'object') {
                    for (const dep in event.config.dependencies) {
                        const depPath = join(__dirname, 'nodemodules', 'node_modules', dep);
                        try {
                            if (!global.nodemodule.hasOwnProperty(dep)) {
                                global.nodemodule[dep] = listPackage.hasOwnProperty(dep) || listbuiltinModules.includes(dep)
                                    ? require(dep) : require(depPath);
                            }
                        } catch {
                            try {
                                execSync('npm --package-lock false --save install ' + dep,
                                    { stdio: 'inherit', env: process.env, shell: true, cwd: join(__dirname, 'nodemodules') });
                                global.nodemodule[dep] = require(dep);
                            } catch (e) {
                                logger.loader(`Event dep install failed: ${dep} (${ev})`, 'warn');
                                continue;
                            }
                        }
                    }
                }

                if (event.onLoad) {
                    try {
                        event.onLoad({ api: loginApiData, models: botModel });
                    } catch (e) {
                        logger.loader(`Event onLoad failed: ${ev}: ${e.message}`, 'warn');
                        evtFailed++;
                        continue;
                    }
                }

                global.client.events.set(event.config.name, event);

                logger.event(event.config.name);
                evtLoaded++;
            } catch (error) {
                logger.fail(ev, String(error));
                evtFailed++;
            }
        }

        logger.summary(
            `${cmdLoaded} ok / ${cmdFailed} failed`,
            `${evtLoaded} ok / ${evtFailed} failed`,
            Date.now() - global.client.timeStart
        );
        process.stdout.write(`MODULE_COUNTS:${cmdLoaded}:${evtLoaded}\n`);

        writeFileSync(global.client.configPath, JSON.stringify(global.config, null, 4), 'utf8');

        const tempPath = global.client.configPath + '.temp';
        if (existsSync(tempPath)) unlinkSync(tempPath);

        const listenerData = { api: loginApiData, models: botModel };
        const listener     = require('../listen')(listenerData);

        try { await features.maybeUpdateBio(loginApiData, logger); } catch (_) {}
        try { await features.sendStartupNotification(loginApiData, logger); } catch (_) {}

        if (global.config.twoIdMode && global.config.twoIdMode.enable && global.config.twoIdMode.autoSwitchOnError) {
            global._autoRestartOnMqttError = true;
            logger("twoIdMode enabled — bot will restart on MQTT errors to switch accounts", "[ TWO ID ]");
        }

        async function sendMqttErrorNotification(errorMsg) {
            const notiCfg = global.config.notiWhenListenMqttError || {};
            const botName = global.config.BOTNAME || "Bot";
            const time    = new Date().toLocaleString("en-BD", { timeZone: global.config.timeZone || "Asia/Dhaka" });
            const text    = `🔴 [${botName}] MQTT Error\n\nTime: ${time}\nError: ${errorMsg}`;

            const tgCfg = notiCfg.telegram || {};
            if (tgCfg.enable && tgCfg.botToken && tgCfg.chatId) {
                try {
                    await axios.post(
                        `https://api.telegram.org/bot${tgCfg.botToken}/sendMessage`,
                        { chat_id: tgCfg.chatId, text, parse_mode: "HTML" },
                        { timeout: 10000 }
                    );
                } catch (e) {
                    logger(`Telegram noti failed: ${e.message}`, '[ WARN ]');
                }
            }

            const discordCfg = notiCfg.discordHook || {};
            if (discordCfg.enable && discordCfg.webhookUrl) {
                try {
                    await axios.post(
                        discordCfg.webhookUrl,
                        {
                            username: botName,
                            embeds: [{
                                title: "🔴 MQTT Error",
                                description: `**Error:** ${errorMsg}`,
                                color: 0xFF0000,
                                footer: { text: time }
                            }]
                        },
                        { timeout: 10000 }
                    );
                } catch (e) {
                    logger(`Discord noti failed: ${e.message}`, '[ WARN ]');
                }
            }
        }

        function listenerCallback(error, message) {
            if (error) {
                if (error.type === 'ready' && error.error === null) return;
                const errStr = JSON.stringify(error);
                logger(global.getText('sagor', 'handleListenError', errStr), '[ ERROR ]');

                sendMqttErrorNotification(errStr).catch(() => {});

                if (global._autoRestartOnMqttError) {
                    logger("autoRestartWhenListenMqttError: MQTT error detected — restarting...", "[ RESTART ]");
                    setTimeout(() => process.exit(0), 2000);
                }
                return;
            }
            if (!message) return;

            if (!['presence', 'typ', 'read_receipt'].includes(message.type)) {
                process.stdout.write('HEARTBEAT\n');
            }
            if (['presence', 'typ', 'read_receipt'].some(t => t === message.type)) return;
            if (global.config.DeveloperMode) console.log(message);

            try {
                return listener(message);
            } catch (listenerErr) {
                logger(`Listener error: ${listenerErr.message}`, '[ ERROR ]');
            }
        }

        function startMqtt() {
            try {
                const mqttHandle = loginApiData.listenMqtt(listenerCallback);
                global.handleListen = mqttHandle;
            } catch (mqttErr) {
                logger.networkError(`MQTT start failed: ${mqttErr.message}`, 30);
                sendMqttErrorNotification(`MQTT start failed: ${mqttErr.message}`).catch(() => {});
                if (global._autoRestartOnMqttError) {
                    logger("autoRestartWhenListenMqttError: MQTT start failed — restarting...", "[ RESTART ]");
                    setTimeout(() => process.exit(0), 2000);
                } else {
                    setTimeout(startMqtt, 30000);
                }
            }
        }
        startMqtt();

        setInterval(() => { process.stdout.write('HEARTBEAT\n'); }, 2 * 60 * 1000);

        
        const _pingCfg = global.config.pingMonitor || {};
        if (_pingCfg.enable !== false) {
            const _pingInterval = (_pingCfg.intervalMinutes || 5) * 60 * 1000;
            let _lastPingTime = null;

            setInterval(async () => {
                try {
                    const _start = Date.now();
                    await loginApiData.getFriendsList().catch(() => {});
                    const _lat = Date.now() - _start;
                    _lastPingTime = _lat;
                    logger.ping(_lat, 'Facebook API');
                } catch (e) {
                    logger.networkError(`Ping failed: ${e.message}`, null);
                }
            }, _pingInterval);
            logger('Ping/latency monitor started', '[ SYSTEM ]');
        }

        setInterval(() => {
            try {
                const now = Date.now();
                for (const [, timestamps] of global.client.cooldowns) {
                    for (const [uid, ts] of timestamps) {
                        if (now - ts > 60 * 60 * 1000) timestamps.delete(uid);
                    }
                }
            } catch (_) {}
        }, 30 * 60 * 1000);

        setInterval(() => {
            try {
                const newState = loginApiData.getAppState();
                if (newState && newState.length > 0)
                    writeFileSync(appStateFile, JSON.stringify(newState, null, '\x09'));
            } catch (e) {
                logger(`AppState save failed: ${e.message}`, '[ WARN ]');
            }
        }, 10 * 60 * 1000);

        if (global.config.autoRefreshFbstate === true) {
            setInterval(async () => {
                try {
                    const freshState = loginApiData.getAppState();
                    if (freshState && freshState.length > 0) {
                        writeFileSync(appStateFile, JSON.stringify(freshState, null, '\x09'));
                        logger("AppState refreshed successfully", "[ FBSTATE ]");
                    }
                } catch (e) {
                    logger(`autoRefreshFbstate failed: ${e.message}`, "[ WARN ]");
                }
            }, 6 * 60 * 60 * 1000);
            logger("autoRefreshFbstate enabled — refresh every 6h", "[ SYSTEM ]");
        }

       if (global.config.autoRestartWhenListenMqttError === true) {
            global._autoRestartOnMqttError = true;
            logger("autoRestartWhenListenMqttError enabled", "[ SYSTEM ]");
        }

        if (global.config.autoReloginWhenChangeAccount === true) {
            let _trackedUserID = null;
            try { _trackedUserID = loginApiData.getCurrentUserID(); } catch (_) {}

            setInterval(async () => {
                try {
                    const currentUID = loginApiData.getCurrentUserID();
                    if (_trackedUserID && currentUID && currentUID !== _trackedUserID) {
                        logger(
                            `Account changed: ${_trackedUserID} → ${currentUID}. Restarting bot...`,
                            "[ RELOGIN ]"
                        );
                        process.exit(0);
                    }
                    _trackedUserID = currentUID;
                } catch (_) {}
            }, 5 * 60 * 1000);
            logger("autoReloginWhenChangeAccount enabled — polling every 5min", "[ SYSTEM ]");
        }

        global.checkBan = true;
    });
}

(async () => {
    try {
        await sequelize.authenticate();
        const authentication = { Sequelize, sequelize };
        const models = require('../database/model')(authentication);
        logger.dbConnect(global.config.database && global.config.database.type, global.config.database && global.config.database.storage);
        if (global.config.database && global.config.database.autoSyncWhenStart) {
            logger("autoSyncWhenStart enabled — models registered & synced", "[ DATABASE ]");
        } else {
            logger("autoSyncWhenStart disabled — skipping model sync()", "[ DATABASE ]");
        }
        try { features.checkBotAccountConfigured(logger); } catch (_) {}
        onBot({ models });
    } catch (error) {
        logger.dbError(`Database connection failed: ${error.message}`, 1, 2);
        logger('Retrying in 10 seconds...', '[ DATABASE ]');
        setTimeout(async () => {
            try {
                await sequelize.authenticate();
                const authentication = { Sequelize, sequelize };
                const models = require('../database/model')(authentication);
                logger.dbConnect(global.config.database && global.config.database.type, global.config.database && global.config.database.storage);
                onBot({ models });
            } catch (e2) {
                logger.dbError(`Database retry failed: ${e2.message}`);
                process.exit(1);
            }
        }, 10000);
    }
})();

process.on('unhandledRejection', (err) => {
    if (err) {
        logger(`Unhandled Rejection: ${err && (err.message || err)}`, '[ ERROR ]');
        if (err && err.stack) logger(`Stack: ${err.stack}`, '[ ERROR ]');
    }
});

process.on('uncaughtException', (err) => {
    logger(`Uncaught Exception: ${err && (err.message || err)}`, '[ ERROR ]');
});
