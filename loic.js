export async function main(ns) {
	function getAllServers(server, servers) {
		if (!server) {
			server = "home";
		}
		if (!servers) {
			servers = [];
		}
		if (servers.includes(server)) {
			return;
		}
		servers.push(server);
		const connected = ns.scan(server);
		for (const connectedServer of connected) {
			getAllServers(connectedServer, servers);
		}
		return servers;
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

	function sortByOptimalServerToHack(servers) {
		// Todo: Add weight to servers based on max money, add weight based on time to hack, grow, and weaken

		const optimalTargetHackLevel = Math.floor(ns.getHackingLevel() / 2);
		servers.sort((a, b) => {
			const aHackLevel = ns.getServerRequiredHackingLevel(a);
			const bHackLevel = ns.getServerRequiredHackingLevel(b);

			if (ns.getServerMaxMoney(a) === 0) {
				return 1;
			}

			if (aHackLevel > ns.getHackingLevel()) {
				return 1;
			}

			return Math.abs(aHackLevel - optimalTargetHackLevel) - Math.abs(bHackLevel - optimalTargetHackLevel);
		});
	}

	let servers = getAllServers();

	const numTargets = ns.args[0];
	if (isNaN(numTargets)) {
		ns.tprint("Invalid number of targets");
		return;
	}

	const maxRam = ns.getServerMaxRam("home") - ns.getScriptRam("loic.js");
	const ramPerTarget = Math.floor(maxRam / numTargets);
	const weakenRam = ns.getScriptRam("weaken.js");
	const growRam = ns.getScriptRam("grow.js");
	const hackRam = ns.getScriptRam("hack.js");
	const maxWeakenThreads = Math.floor(ramPerTarget / weakenRam);
	const maxGrowThreads = Math.floor(ramPerTarget / growRam);
	const maxHackThreads = Math.floor(ramPerTarget / hackRam);

	while (true) {
		sortByOptimalServerToHack(servers);
		for (let i = 0; i < servers.length; i++) {
			const server = servers[i];
			if (!ns.hasRootAccess(server)) {
				attemptNuke(server);
			}
		}
		for (let i = 0; i < numTargets; i++) {
			const server = servers[i];
			if (ns.hasRootAccess(server)) {
				// TODO: Implement a weaken->grow->weaken->hack loop with calculated timings to hack while growing and weakening. (Divide the allocated ram up)
				const ramPart = Math.floor(ramPerTarget / 4);
				const securityLevel = ns.getServerSecurityLevel(server);
				const minSecurityLevel = ns.getServerMinSecurityLevel(server);
				const money = ns.getServerMoneyAvailable(server);
				const maxMoney = ns.getServerMaxMoney(server);

				if (securityLevel > minSecurityLevel * 1.1) {
					if (!ns.isRunning("weaken.js", "home", server)) {
						ns.kill("hack.js", "home", server);
						ns.kill("grow.js", "home", server);
						ns.exec("weaken.js", "home", maxWeakenThreads, server);
					}
				} else if (money < maxMoney * 0.85) {
					if (!ns.isRunning("grow.js", "home", server)) {
						ns.kill("weaken.js", "home", server);
						ns.kill("hack.js", "home", server);
						ns.exec("grow.js", "home", maxGrowThreads, server);
					}
				} else {
					if (!ns.isRunning("hack.js", "home", server)) {
						ns.kill("grow.js", "home", server);
						ns.kill("weaken.js", "home", server);
						ns.exec("hack.js", "home", maxHackThreads, server);
					}
				}
			}
		}
		await ns.sleep(5000);
	}
}
