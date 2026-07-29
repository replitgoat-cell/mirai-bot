const Sequelize = require("sequelize");
const { resolve } = require("path");
let database = global.config.database;
if (!database) {
  const legacy = global.config.DATABASE;
  if (legacy && typeof legacy === "object") {
    const legacyType = Object.keys(legacy)[0] || "sqlite";
    database = {
      type: legacyType,
      storage: (legacy[legacyType] && legacy[legacyType].storage) || "data.sqlite",
      uriMongodb: "",
      autoSyncWhenStart: false,
      autoRefreshThreadInfoFirstTime: true
    };
  } else {
    database = { type: "sqlite", storage: "data.sqlite" };
  }
}

const type = database.type ? String(database.type).toLowerCase() : "sqlite";

let sequelize;

if (type === "mongodb") {
  if (!database.uriMongodb) {
    throw new Error("[ DATABASE ] database.type is 'mongodb' but database.uriMongodb is empty. Set the URI in config.json.");
  }
  console.warn("[ DATABASE ] MongoDB selected; Sequelize models will continue to use SQLite.");
  const storage = resolve(__dirname, `../${database.storage || "data.sqlite"}`);
  sequelize = new Sequelize({
    dialect: "sqlite",
    storage,
    logging: false,
    transactionType: "IMMEDIATE",
    pool: { max: 20, min: 0, acquire: 60000, idle: 20000 },
    retry: { match: [/SQLITE_BUSY/], name: "query", max: 20 },
    define: {
      underscored: false,
      freezeTableName: true,
      charset: "utf8",
      dialectOptions: { collate: "utf8_general_ci" },
      timestamps: true
    },
    sync: { force: false }
  });
} else if (type === "json") {
  sequelize = new Sequelize({
    dialect: "sqlite",
    storage: ":memory:",
    logging: false,
    define: {
      underscored: false,
      freezeTableName: true,
      charset: "utf8",
      dialectOptions: { collate: "utf8_general_ci" },
      timestamps: true
    },
    sync: { force: false }
  });
} else {
  const storage = resolve(__dirname, `../${database.storage || "data.sqlite"}`);
  sequelize = new Sequelize({
    dialect: "sqlite",
    storage,
    pool: { max: 20, min: 0, acquire: 60000, idle: 20000 },
    retry: { match: [/SQLITE_BUSY/], name: "query", max: 20 },
    logging: false,
    transactionType: "IMMEDIATE",
    define: {
      underscored: false,
      freezeTableName: true,
      charset: "utf8",
      dialectOptions: { collate: "utf8_general_ci" },
      timestamps: true
    },
    sync: { force: false }
  });
}

module.exports = { sequelize, Sequelize };
