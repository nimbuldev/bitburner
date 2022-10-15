export function autocomplete(data, args) {
	return [...data.servers]; // This script autocompletes the list of servers.
}

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
		const optimalTargetHackLevel = Math.floor(ns.getHackingLevel() / 3);
		servers.sort((a, b) => {
			const aHackLevel = ns.getServerRequiredHackingLevel(a);
			const bHackLevel = ns.getServerRequiredHackingLevel(b);

			if (ns.getServerMaxMoney(a) === 0) {
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

	sortByOptimalServerToHack(servers);

	while (true) {
		for (let i = 0; i < servers.length; i++) {
			const server = servers[i];
			if (!ns.hasRootAccess(server)) {
				attemptNuke(server);
			}
		}
		for (let i = 0; i < numTargets; i++) {
			const server = servers[i];
			if (ns.hasRootAccess(server)) {
				// TODO: Time these better, you can hack while growing and weakening.

				const securityLevel = ns.getServerSecurityLevel(server);
				const minSecurityLevel = ns.getServerMinSecurityLevel(server);
				const money = ns.getServerMoneyAvailable(server);
				const maxMoney = ns.getServerMaxMoney(server);

				const hackTime = ns.getHackTime(server);
				const weakenTime = ns.getWeakenTime(server);
				const growTime = ns.getGrowTime(server);

				if (securityLevel > minSecurityLevel + 5) {
					ns.kill("hack.js", "home");
					ns.kill("weaken.js", "home");
					ns.exec("weaken.js", "home", maxWeakenThreads, server);
				} else if (money < maxMoney * 0.75) {
					ns.kill("weaken.js", "home");
					ns.kill("hack.js", "home");
					ns.exec("grow.js", "home", maxGrowThreads, server);
				} else {
					ns.kill("grow.js", "home");
					ns.kill("weaken.js", "home");
					ns.exec("hack.js", "home", maxHackThreads, server);
				}
			}
		}
		await ns.sleep(5000);
	}
}
