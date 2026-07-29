module.exports = function ({ api, models, Users, Threads, Currencies }) {
    const logger = require("../utils/log.js");

    return function ({ event }) {
        try {
            const { allowInbox } = global.config;
            const { userBanned, threadBanned } = global.data;
            const { commands, eventRegistered } = global.client;
            var { senderID, threadID } = event;
            senderID = String(senderID);
            threadID = String(threadID);

            if (userBanned.has(senderID) || threadBanned.has(threadID) || (allowInbox == false && senderID == threadID)) return;

            for (const eventReg of eventRegistered) {
                const cmd = commands.get(eventReg);
                if (!cmd || typeof cmd.handleEvent !== 'function') continue;

                let getText2 = () => {};
                if (cmd.languages && typeof cmd.languages == 'object') {
                    getText2 = (...values) => {
                        const lang = cmd.languages[global.config.language];
                        if (!lang) return '';
                        var text = lang[values[0]] || '';
                        for (var i = values.length - 1; i >= 1; i--) {
                            text = text.replace(new RegExp('%' + i, 'g'), values[i]);
                        }
                        return text;
                    };
                }

                try {
                    cmd.handleEvent({ event, api, models, Users, Threads, Currencies, getText: getText2 });
                } catch (error) {
                    logger(global.getText('handleCommandEvent', 'moduleError', cmd.config.name), 'error');
                }
            }
        } catch (outerErr) {
            logger(`handleCommandEvent fatal: ${outerErr.message}`, 'error');
        }
    };
};
