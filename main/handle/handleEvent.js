module.exports = function ({ api, models, Users, Threads, Currencies }) {
    const logger = require("../utils/log.js");
    const moment = require("moment-timezone");

    return function ({ event }) {
        try {
            const timeStart = Date.now();
            const time = moment.tz("Asia/Dhaka").format("HH:mm:ss DD/MM/YYYY");
            const { userBanned, threadBanned } = global.data;
            const { events } = global.client;
            const { allowInbox, DeveloperMode } = global.config;
            var { senderID, threadID } = event;
            senderID = String(senderID);
            threadID = String(threadID);

            if (userBanned.has(senderID) || threadBanned.has(threadID) || (allowInbox == false && senderID == threadID)) return;
            if (event.type == "change_thread_image") event.logMessageType = "change_thread_image";

            try {
                const features = require("../utils/features.js");
                const cfg = (global.config && global.config.threadApproval) || {};
                const isBotEvent =
                    event.logMessageType === "log:subscribe" &&
                    event.logMessageData &&
                    Array.isArray(event.logMessageData.addedParticipants) &&
                    event.logMessageData.addedParticipants.some(u => String(u.userFbId) === String(api.getCurrentUserID()));
                if (cfg.enable && senderID !== threadID && !isBotEvent && !features.isThreadApproved(threadID)) {
                    return;
                }
            } catch (_) {}

            let handledCount = 0;

            for (const [key, value] of events.entries()) {
                if (!value.config || !Array.isArray(value.config.eventType)) continue;
                if (value.config.eventType.indexOf(event.logMessageType) === -1) continue;

                const eventRun = events.get(key);
                try {
                    eventRun.run({ api, event, models, Users, Threads, Currencies });
                    handledCount++;
                    if (DeveloperMode)
                        logger(global.getText('handleEvent', 'executeEvent', time, eventRun.config.name, threadID, Date.now() - timeStart), '[ Event ]');
                } catch (error) {
                    const errMsg = String(error && (error.message || error)).split('\n')[0].slice(0, 100);
                    logger(
                        `Event Error | name: [${eventRun.config.name}] | type: ${event.logMessageType || 'unknown'} | err: ${errMsg}`,
                        'error'
                    );
                }
            }

            if (handledCount === 0 && event.logMessageType && DeveloperMode) {
                logger(
                    `Unknown event type gracefully skipped → "${event.logMessageType}" (thread: ${threadID})`,
                    '[ WARN ]'
                );
            }

        } catch (outerErr) {
            logger(`handleEvent fatal: ${outerErr.message}`, 'error');
        }
    };
};
