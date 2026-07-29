module.exports = function (input) {
    const force = false;

    const Users = require("./models/users")(input);
    const Threads = require("./models/threads")(input);
    const Currencies = require("./models/currencies")(input);

    const dbCfg = (global.config && global.config.database) || {};
    const autoSync = dbCfg.autoSyncWhenStart !== false;

    if (autoSync) {
        Users.sync({ force });
        Threads.sync({ force });
        Currencies.sync({ force });
    }

    return {
        model: { Users, Threads, Currencies },
        use: function (modelName) { return this.model[modelName]; }
    };
};
