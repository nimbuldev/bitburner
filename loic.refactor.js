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

	function nukeAllServers(servers) {
		for (let i = 0; i < servers.length; i++) {
			const server = servers[i];
			if (!ns.hasRootAccess(server)) {
				attemptNuke(server);
			}
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

	function retarget(targets) {
		let ps = ns.ps();
		for (let i = 0; i < ps.length; i++) {
			const process = ps[i];
			if (!targets.includes(process.args[0]) && hackList.includes(process.filename)) {
				ns.kill(process.pid);
			}
		}
	}

	function approximateGrowThreads(formulasServer, player, neededMult) {
		let growThreads = 1;
		let currentMult = ns.formulas.hacking.growPercent(formulasServer, growThreads, player, formulasServer.cpuCores);

		while (currentMult < neededMult) {
			growThreads++;
			currentMult = ns.formulas.hacking.growPercent(formulasServer, growThreads, player, formulasServer.cpuCores);
		}

		return growThreads;
	}

	async function batcher(targets) {
		const maxRam = ns.getServerMaxRam("home") - ns.getScriptRam("loic.js");
		const ramPerTarget = Math.floor(maxRam / numTargets);

		for (let i = 0; i < targets.length; i++) {
			const server = targets[i];
			const ps = ns.ps();

			if (ps.some(process => process.args[0] === server)) {
				continue;
			}

			for (let i = 0; i < targets.length; i++) {
				const server = targets[i];
				let batchNo = 0;

				if (ns.hasRootAccess(server)) {
					const maxWeakenThreads = Math.floor((ramPerTarget * 0.95) / weakenRam);

					let ramRemaining = ramPerTarget;

					const securityLevel = ns.getServerSecurityLevel(server);
					const minSecurityLevel = ns.getServerMinSecurityLevel(server);
					const money = ns.getServerMoneyAvailable(server);
					const maxMoney = ns.getServerMaxMoney(server);
					const neededGrowthMultiplier = maxMoney / money;

					const hackMoneyAmount = maxMoney / 2;
					let weakenThreads = Math.min(Math.ceil((securityLevel - minSecurityLevel) / 0.05), maxWeakenThreads);
					ramRemaining -= weakenThreads * weakenRam;
					const maxGrowThreads = Math.min(Math.floor((ramRemaining * 0.95) / growRam));

					let growthThreads = Math.min(Math.ceil(ns.growthAnalyze(server, neededGrowthMultiplier)), maxGrowThreads);

					if (growthThreads == 0) {
						growthThreads = 1;
					}
					if (weakenThreads == 0) {
						weakenThreads = 1;
					}

					ramRemaining -= growthThreads * growRam;
					const maxHackThreads = Math.floor((ramRemaining * 0.95) / hackRam);

					const weakenTime = ns.getWeakenTime(server);
					const hackTime = ns.getHackTime(server);
					const growTime = ns.getGrowTime(server);

					ns.exec("weaken.js", "home", weakenThreads, server, 0, 0, batchNo);
					let growDelay = 400;
					if (weakenTime > growTime) {
						growDelay = Math.ceil(weakenTime - growTime + 400);
					}
					ns.tprint(growthThreads);
					ns.exec("grow.js", "home", growthThreads, server, growDelay, batchNo);

					let weakenDelay = 400;
					if (growTime + growDelay > weakenTime) {
						weakenDelay = Math.ceil(growTime + growDelay - weakenTime + 400);
					}
					ns.exec("weaken.js", "home", weakenThreads, server, weakenDelay, 1, batchNo);

					let takesLonger = Math.max(growTime + growDelay, weakenTime + weakenDelay);
					let hackDelay = 400;
					if (takesLonger > hackTime) {
						hackDelay = Math.ceil(takesLonger - hackTime + 400);
					}

					let hackThreads = 0;
					if (money > maxMoney * 0.95) {
						hackThreads = Math.min(Math.ceil(ns.hackAnalyzeThreads(server, hackMoneyAmount)), maxHackThreads);
						ns.exec("hack.js", "home", hackThreads, server, hackDelay, batchNo);
						ramRemaining -= hackThreads * hackRam;
					}

					const batchRamUsage = weakenRam * weakenThreads + growRam * growthThreads + hackRam * hackThreads;
				}
			}
		}
	}

	const servers = getAllServers();
	const numTargets = ns.args[0];
	const weakenRam = ns.getScriptRam("weaken.js");
	const growRam = ns.getScriptRam("grow.js");
	const hackRam = ns.getScriptRam("hack.js");
	const hackList = ["weaken.js", "grow.js", "hack.js"];

	if (isNaN(numTargets)) {
		ns.tprint("Invalid number of targets");
		return;
	}

	while (true) {
		await ns.sleep(5000);

		nukeAllServers(servers);
		sortByOptimalServerToHack(servers);
		const targets = servers.slice(0, numTargets);
		retarget(targets);
		await batcher(targets);
	}
}
