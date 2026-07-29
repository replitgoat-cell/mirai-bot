module.exports.config = {
	name: "nameCommand",
	version: "version",
	hasPermssion: 0/1/2,
	credits: "SaGor",
	description: "say bla bla ở đây",
	commandCategory: "group",
	usages: "[option] [text]",
	cooldowns: 5,
	dependencies: {
		"packageName": "version"
	},
	envConfig: {
	}
};

module.exports.languages = {
	"vi": {
	},
	"en": {
	}
}

module.exports.onLoad = function ({ configValue }) {
}

module.exports.handleReaction = function({ api, event, models, Users, Threads, Currencies, handleReaction }) {
}

module.exports.handleReply = function({ api, event, models, Users, Threads, Currencies, handleReply }) {
}

module.exports.handleEvent = function({ event, api, models, Users, Threads, Currencies }) {
}

module.exports.handleSedule = function({ event, api, models, Users, Threads, Currencies, scheduleItem }) {
}

module.exports.run = function({ api, event, args, models, Users, Threads, Currencies, permssion }) {
}
