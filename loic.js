export function autocomplete(data, args) {
	return [...data.servers]; // This script autocompletes the list of servers.
}

export async function main(ns) {
	function getAllServers(serverList, server) {
		if (server === undefined) {
			server = "home";
		}
		if (serverList.includes(server)) {
			return;
		}
		serverList.push(server);
		const connected = ns.scan(server);
		for (const connectedServer of connected) {
			getAllServers(serverList, connectedServer);
		}
	}

	function countTools() {
		let count = 0;

		if (ns.fileExists("BruteSSH.exe")) {
			count++;
		}
		if (ns.fileExists("FTPCrack.exe")) {
			count++;
		}
		if (ns.fileExists("relaySMTP.exe")) {
			count++;
		}
		if (ns.fileExists("HTTPWorm.exe")) {
			count++;
		}
		if (ns.fileExists("SQLInject.exe")) {
			count++;
		}
		return count;
	}

	function attemptNuke(server) {
		const numTools = countTools();
		if (numTools < ns.getServerNumPortsRequired(server)) {
			ns.print("Not enough tools to nuke " + server);
			return false;
		}
		if (ns.fileExists("BruteSSH.exe")) {
			ns.brutessh(server);
		}
		if (ns.fileExists("FTPCrack.exe")) {
			ns.ftpcrack(server);
		}
		if (ns.fileExists("relaySMTP.exe")) {
			ns.relaysmtp(server);
		}
		if (ns.fileExists("HTTPWorm.exe")) {
			ns.httpworm(server);
		}
		if (ns.fileExists("SQLInject.exe")) {
			ns.sqlinject(server);
		}
		ns.nuke(server);
		if (ns.hasRootAccess(server)) {
			ns.tprint("Successfully nuked " + server);
			return true;
		} else {
			ns.tprint("Failed to nuke " + server + "for some reason");
			return false;
		}
	}

	let servers = [];
	getAllServers(servers);

	const target = ns.args[0];

	// Todo: Allow multiple targets and dynamically allocate RAM for each target.
	// Run weaken, grow, and hack simultaneously within the allocated RAM.

	while (true) {
		for (let i = 0; i < servers.length; i++) {
			const server = servers[i];
			if (!ns.hasRootAccess(server)) {
				attemptNuke(server);
			}
			if (ns.hasRootAccess(server)) {
				if (ns.getServerMaxRam(server) > 0) {
					let numThreads = ns.getServerMaxRam(server) / ns.getScriptRam("worm.js");
					if (server === "home") {
						numThreads = (ns.getServerMaxRam(server) - ns.getScriptRam("loic.js")) / ns.getScriptRam("worm.js");
					}

					await ns.scp("worm.js", server);
					ns.exec("worm.js", server, numThreads, target);
				}
			}
		}
		await ns.sleep(60 * 5000);
	}
}
