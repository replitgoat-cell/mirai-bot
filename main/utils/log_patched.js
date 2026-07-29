const original = require("./log");

const patchedLogger = function(data, option) {
    const cfg = global.config && global.config.log;
    if (cfg && cfg.enable === false) {
        const opt = String(option || "").toUpperCase();
        if (!opt.includes("ERROR") && !opt.includes("ERR")) return;
    }
    return original(data, option);
};

Object.keys(original).forEach(k => { patchedLogger[k] = original[k]; });

patchedLogger.loader = function(data, option) {
    const cfg = global.config && global.config.log;
    if (cfg && cfg.enable === false) return;
    return original.loader(data, option);
};

module.exports = patchedLogger;
