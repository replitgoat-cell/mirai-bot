module.exports.config = {
	name: "help",
	version: "2.2.0",
	hasPermssion: 0,
	credits: "SaGor",
	description: "Category help menu",
	commandCategory: "system",
	cooldowns: 5,
	aliases: ["menu"]
};

module.exports.run = async function({ api, event, args }) {
	try {
		const commands = global.client.commands;

		const isHelp = !args[0] || !commands.get(args[0]?.toLowerCase());
		const unsendCfg = isHelp
			? (global.config.help || {})
			: (global.config.menu || {});
		const shouldUnsend = unsendCfg.autoUnsend === true;
		const unsendDelay  = (typeof unsendCfg.delayUnsend === "number" ? unsendCfg.delayUnsend : 60) * 1000;

		function sendWithAutoUnsend(msg, quoteId) {
			api.sendMessage(msg, event.threadID, (err, info) => {
				if (!err && info && shouldUnsend) {
					setTimeout(() => {
						try { api.unsendMessage(info.messageID); } catch (_) {}
					}, unsendDelay);
				}
			}, quoteId);
		}

		if (!args[0]) {
			const categories = {};
			for (const [name, cmd] of commands) {
				const category = cmd.config.commandCategory || "other";
				if (!categories[category]) categories[category] = [];
				categories[category].push(name);
			}

			let msg = "";
			for (const category in categories) {
				msg += `╭─────『 ${category.toUpperCase()} 』\n`;
				for (const cmd of categories[category]) {
					msg += `│ ▸ ${cmd}\n`;
				}
				msg += `╰──────────────\n\n`;
			}

			return sendWithAutoUnsend(msg.trim(), event.messageID);
		}

		const cmdName = args[0].toLowerCase();
		const command = commands.get(cmdName);

		if (!command)
			return sendWithAutoUnsend("❌ Command not found", event.messageID);

		const config = command.config;
		const msg =
`╭─────『 COMMAND DETAILS 』
│ ▸ Name: ${config.name}
│ ▸ Author: ${config.credits || "Unknown"}
│ ▸ Category: ${config.commandCategory}
│ ▸ Description: ${config.description || "No description"}
│ ▸ Usage: ${config.usages || "No usage"}
│ ▸ Permission: ${config.hasPermssion == 0 ? "User" : config.hasPermssion == 1 ? "Admin" : "Bot Admin"}
╰──────────────`;

		return sendWithAutoUnsend(msg, event.messageID);

	} catch {
		return api.sendMessage("Error", event.threadID, event.messageID);
	}
};
