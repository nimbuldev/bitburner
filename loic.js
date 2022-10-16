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

	function weaken(server, formulasServer, player, maxRam, delay) {
		const maxWeakenThreads = Math.floor(maxRam / weakenRam);
		const securityLevel = ns.getServerSecurityLevel(server);
		const minSecurityLevel = ns.getServerMinSecurityLevel(server);
		ns.exec("weaken.js", "home", maxWeakenThreads, server, delay);
		let weakenTime = Math.ceil(ns.formulas.hacking.weakenTime(formulasServer, player));
		let growTime = Math.ceil(ns.formulas.hacking.growTime(formulasServer, player));

		if (securityLevel - maxWeakenThreads * 0.05 < minSecurityLevel * 1.1) {
			let growDelay = 0;
			if (weakenTime + delay > growTime) {
				growDelay = weakenTime - growTime + delay;
			}

			grow(server, formulasServer, player, growDelay, growTime, weakenTime, maxRam, maxWeakenThreads);
		}
	}

	function grow(server, formulasServer, player, delay, growTime, weakenTime, maxRam, maxWeakenThreads) {
		let maxGrowThreads = Math.floor(maxRam / growRam);
		let growPercent = ns.formulas.hacking.growPercent(formulasServer, maxGrowThreads, player, formulasServer.cpuCores);
		let hackTime = ns.formulas.hacking.hackTime(formulasServer, player);

		const money = ns.getServerMoneyAvailable(server);
		const maxMoney = ns.getServerMaxMoney(server);

		ns.exec("grow.js", "home", maxGrowThreads, server, delay);
		let weakenDelay = delay + growTime;
		ns.exec("weaken.js", "home", maxWeakenThreads, server, weakenDelay);

		if (money * growPercent > maxMoney * 0.85) {
			let larger = Math.max(growTime + delay, weakenTime + weakenDelay);

			let hackDelay = 0;
			if (hackTime < larger) {
				hackDelay = larger - hackTime;
			}

			hack(server, formulasServer, player, hackDelay, hackTime, maxRam);
		}
	}
	function hack(server, formulasServer, player, delay, hackTime, maxRam) {
		let threadsRequiredToHackHalfCash = Math.floor(0.5 / ns.formulas.hacking.hackPercent(formulasServer, player));

		if (threadsRequiredToHackHalfCash < maxHackThreads) {
			ns.exec("hack.js", "home", threadsRequiredToHackHalfCash, server, delay);
		} else {
			ns.exec("hack.js", "home", maxHackThreads, server, delay);
		}
		let weakenDelay = 0;
		if (weakenTime < hackTime + delay) {
			weakenDelay = hackTime - weakenTime + delay;
		}
		weaken(server, formulasServer, player, maxRam, weakenDelay);
	}

	let servers = getAllServers();

	const numTargets = ns.args[0];
	if (isNaN(numTargets)) {
		ns.tprint("Invalid number of targets");
		return;
	}

	const weakenRam = ns.getScriptRam("weaken.js");
	const growRam = ns.getScriptRam("grow.js");
	const hackRam = ns.getScriptRam("hack.js");

	const killList = ["weaken.js", "grow.js", "hack.js"];

	while (true) {
		const maxRam = ns.getServerMaxRam("home") - ns.getScriptRam("loic.js");
		const ramPerTarget = Math.floor(maxRam / numTargets);
		for (let i = 0; i < servers.length; i++) {
			const server = servers[i];
			if (!ns.hasRootAccess(server)) {
				attemptNuke(server);
			}
		}
		sortByOptimalServerToHack(servers);
		const targets = servers.slice(0, numTargets);
		const ps = ns.ps();
		for (let i = 0; i < ps.length; i++) {
			const process = ps[i];
			if (!targets.includes(process.args[0]) && killList.includes(process.filename)) {
				ns.kill(process.pid);
			}
		}

		for (let i = 0; i < targets.length; i++) {
			const server = servers[i];
			if (ns.hasRootAccess(server)) {
				const ramPart = Math.floor(ramPerTarget / 4);
				const securityLevel = ns.getServerSecurityLevel(server);
				const minSecurityLevel = ns.getServerMinSecurityLevel(server);

				let formulasServer = ns.getServer(server);
				let player = ns.getPlayer();

				if (securityLevel > minSecurityLevel * 1.1) {
					weaken(server, formulasServer, player, ramPart, 0);
				}
			}
		}
		await ns.sleep(5000);
	}
}
