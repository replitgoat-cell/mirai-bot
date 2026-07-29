module.exports = function ({ Users, Threads, Currencies }) {
    const logger = require("../utils/log.js");

    return async function ({ event }) {
        try {
            const { allUserID, allCurrenciesID, allThreadID, userName, threadInfo } = global.data;
            const { autoCreateDB } = global.config;
            if (autoCreateDB == false) return;

            var { senderID, threadID } = event;
            senderID = String(senderID);
            threadID = String(threadID);

            const dbCfg = (global.config && global.config.database) || {};
            global._refreshedThreadsThisSession = global._refreshedThreadsThisSession || new Set();
            const _shouldRefresh = dbCfg.autoRefreshThreadInfoFirstTime
                && event.isGroup == true
                && allThreadID.includes(threadID)
                && !global._refreshedThreadsThisSession.has(threadID);

            if (_shouldRefresh) {
                global._refreshedThreadsThisSession.add(threadID);
                try {
                    const fresh = await Threads.getInfo(threadID);
                    if (fresh) {
                        const dataThread = {
                            threadName: fresh.threadName,
                            adminIDs: fresh.adminIDs || [],
                            nicknames: fresh.nicknames || {}
                        };
                        threadInfo.set(threadID, dataThread);
                        await Threads.setData(threadID, { threadInfo: dataThread });
                        logger(`autoRefreshThreadInfo: refreshed ${threadID}`, '[ DATABASE ]');
                    }
                } catch (refErr) {
                    logger(`autoRefreshThreadInfo failed (${threadID}): ${refErr.message}`, '[ WARN ]');
                }
            }

            if (!allThreadID.includes(threadID) && event.isGroup == true) {
                try {
                    const threadIn4 = await Threads.getInfo(threadID);
                    if (!threadIn4) throw new Error("No thread info returned");

                    const dataThread = {
                        threadName: threadIn4.threadName,
                        adminIDs: threadIn4.adminIDs || [],
                        nicknames: threadIn4.nicknames || {}
                    };

                    allThreadID.push(threadID);
                    threadInfo.set(threadID, dataThread);
                    await Threads.setData(threadID, { threadInfo: dataThread, data: {} });

                    if (Array.isArray(threadIn4.userInfo)) {
                        for (const singleData of threadIn4.userInfo) {
                            try {
                                userName.set(String(singleData.id), singleData.name);
                                const uid = String(singleData.id);
                                if (allUserID.includes(uid)) {
                                    await Users.setData(uid, { name: singleData.name });
                                } else {
                                    await Users.createData(uid, { name: singleData.name, data: {} });
                                    allUserID.push(uid);
                                    logger(global.getText('handleCreateDatabase', 'newUser', uid), '[ DATABASE ]');
                                }
                            } catch (userErr) {
                                logger(`User DB error (${singleData.id}): ${userErr.message}`, 'error');
                            }
                        }
                    }

                    logger(global.getText('handleCreateDatabase', 'newThread', threadID), '[ DATABASE ]');
                } catch (threadErr) {
                    logger(`Thread DB error (${threadID}): ${threadErr.message}`, 'error');
                }
            }

            if (!allUserID.includes(senderID) || !userName.has(senderID)) {
                try {
                    const infoUsers = await Users.getInfo(senderID);
                    if (infoUsers && infoUsers.name) {
                        await Users.createData(senderID, { name: infoUsers.name });
                        allUserID.push(senderID);
                        userName.set(senderID, infoUsers.name);
                        logger(global.getText('handleCreateDatabase', 'newUser', senderID), '[ DATABASE ]');
                    }
                } catch (userErr) {
                    logger(`User info error (${senderID}): ${userErr.message}`, 'error');
                }
            }

            if (!allCurrenciesID.includes(senderID)) {
                try {
                    await Currencies.createData(senderID, { data: {} });
                    allCurrenciesID.push(senderID);
                } catch (_) {}
            }

        } catch (outerErr) {
            logger(`handleCreateDatabase fatal: ${outerErr.message}`, 'error');
        }
    };
};
