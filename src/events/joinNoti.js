module.exports.config = {
    name: "joinNoti",
    eventType: ["log:subscribe"],
    version: "1.0.7",
    credits: "SaGor",
    description: "Send multiple welcome videos when the bot joins and a text message when members join",
    dependencies: {
        "fs-extra": "",
        "path": "",
        "moment-timezone": ""
    }
};

module.exports.onLoad = function () {
    const { existsSync, mkdirSync } = global.nodemodule["fs-extra"];
    const { join } = global.nodemodule["path"];
    const basePath = join(__dirname, "cache", "joinGif");
    if (!existsSync(basePath)) mkdirSync(basePath, { recursive: true });
};

module.exports.run = async function ({ api, event }) {
    const { join, extname } = global.nodemodule["path"];
    const { createReadStream, existsSync, readdirSync } = global.nodemodule["fs-extra"];
    const moment = require("moment-timezone");
    const { threadID } = event;

    try {
        const threadInfo = await api.getThreadInfo(threadID);
        const threadName = threadInfo.threadName || "this group";
        const participantCount = threadInfo.participantIDs.length;
        const time = moment.tz("Asia/Dhaka").format("DD/MM/YYYY || HH:mm:ss");

        const isBotAdded = event.logMessageData.addedParticipants.some(
            user => user.userFbId == api.getCurrentUserID()
        );

        if (isBotAdded) {
            try {
                const cfg = (global.config && global.config.botLogging) || {};
                if (cfg.enable && cfg.logBotAdded && typeof global.sendBotLog === "function") {
                    global.sendBotLog(
                        `✅ Bot was added to a new thread\nThread: ${threadName} (${threadID})\nMembers: ${participantCount}\nTime: ${time}`
                    );
                }
            } catch (_) {}

            api.changeNickname(
                `「 ${global.config.PREFIX} 」➢ ${global.config.BOTNAME || "SAGOR BOT"}`,
                threadID,
                api.getCurrentUserID()
            );

            const videoDir = join(__dirname, "cache", "joinGif");
            let attachments = [];

            if (existsSync(videoDir)) {
                const files = readdirSync(videoDir).filter(file =>
                    extname(file).toLowerCase() === ".mp4"
                );
                attachments = files.map(file =>
                    createReadStream(join(videoDir, file))
                );
            }

            return api.sendMessage(
                {
                    body:
                        `「 ${global.config.BOTNAME || "SAGOR BOT"} 」 𝗶𝘀 𝗻𝗼𝘄 𝗰𝗼𝗻𝗻𝗲𝗰𝘁𝗲𝗱 𝘁𝗼 "${threadName}".\n\n` +
                        `𝗠𝗲𝗺𝗯𝗲𝗿𝘀: ${participantCount}\n` +
                        `𝗣𝗿𝗲𝗳𝗶𝘅: ${global.config.PREFIX}\n` +
                        `𝗧𝘆𝗽𝗲 ${global.config.PREFIX}𝗵𝗲𝗹𝗽 𝘁𝗼 𝘀𝗲𝗲 𝗮𝗹𝗹 𝗰𝗼𝗺𝗺𝗮𝗻𝗱𝘀.`,
                    attachment: attachments.length > 0 ? attachments : null
                },
                threadID
            );
        }

        if (typeof global.shouldSendGroupNoti === "function" && !global.shouldSendGroupNoti(threadID)) {
            return;
        }

        const names = event.logMessageData.addedParticipants.map(
            user => user.fullName
        );

        return api.sendMessage(
            {
                body:
                    `𝗪𝗘𝗟𝗖𝗢𝗠𝗘 ${names.join(", ")}\n` +
                    `𝗬𝗼𝘂 𝗮𝗿𝗲 𝗻𝗼𝘄 𝗺𝗲𝗺𝗯𝗲𝗿 𝗻𝘂𝗺𝗯𝗲𝗿 ${participantCount}.`,
                mentions: event.logMessageData.addedParticipants.map(user => ({
                    tag: user.fullName,
                    id: user.userFbId
                }))
            },
            threadID
        );

    } catch (error) {
    }
};
