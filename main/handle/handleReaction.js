module.exports = function ({ api, models, Users, Threads, Currencies }) {
    return function ({ event }) {
        try {
            const { handleReaction, commands } = global.client;
            const { messageID, threadID } = event;
            if (!handleReaction || handleReaction.length === 0) return;

            const indexOfHandle = handleReaction.findIndex(e => e.messageID == messageID);
            if (indexOfHandle < 0) return;

            const indexOfMessage = handleReaction[indexOfHandle];
            const handleNeedExec = commands.get(indexOfMessage.name);

            if (!handleNeedExec || typeof handleNeedExec.handleReaction !== 'function') {
                return api.sendMessage(global.getText('handleReaction', 'missingValue'), threadID, messageID);
            }

            let getText2 = () => {};
            if (handleNeedExec.languages && typeof handleNeedExec.languages == 'object') {
                getText2 = (...value) => {
                    const lang = handleNeedExec.languages[global.config.language];
                    if (!lang) return '';
                    var text = lang[value[0]] || '';
                    for (var i = value.length - 1; i >= 1; i--) {
                        text = text.replace(new RegExp('%' + i, 'g'), value[i]);
                    }
                    return text;
                };
            }

            try {
                handleNeedExec.handleReaction({ api, event, models, Users, Threads, Currencies, handleReaction: indexOfMessage, getText: getText2 });
            } catch (error) {
                return api.sendMessage(global.getText('handleReaction', 'executeError', error), threadID, messageID);
            }
        } catch (outerErr) {
            require("../utils/log.js")(`handleReaction fatal: ${outerErr.message}`, 'error');
        }
    };
};
