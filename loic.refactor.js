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
		// The batcher should calculate the RAM usage instead of the hack methods so ramPart is not identical between all methods.

		const maxRam = ns.getServerMaxRam("home") - ns.getScriptRam("loic.js");
		const ramNeededForBatch = 0;
		const ramPerTarget = Math.floor(maxRam / numTargets);
		const ramPart = Math.floor(ramPerTarget / 4);

		for (let i = 0; i < targets.length; i++) {
			const server = targets[i];
			const ps = ns.ps();

			if (ps.some(process => process.args[0] === server)) {
				continue;
			}

			ns.tprint("Starting batch for " + server);

			if (ns.hasRootAccess(server)) {
				const securityLevel = ns.getServerSecurityLevel(server);
				const minSecurityLevel = ns.getServerMinSecurityLevel(server);
				const money = ns.getServerMoneyAvailable(server);
				const maxMoney = ns.getServerMaxMoney(server);

				let formulasServer = ns.getServer(server);
				let player = ns.getPlayer();

				if (securityLevel > minSecurityLevel * 1.1) {
					weaken(server, formulasServer, player, ramPerTarget, 0);
				} else if (money < maxMoney * 0.95) {
					grow(server, formulasServer, player, ramPerTarget, 0);
				} else {
					hack(server, formulasServer, player, ramPerTarget, 0);
				}
			}
		}
	}

	function weaken(server, formulasServer, player, maxRam, delay) {
		const maxWeakenThreads = Math.floor(maxRam / weakenRam);
		const securityLevel = ns.getServerSecurityLevel(server);
		const minSecurityLevel = ns.getServerMinSecurityLevel(server);
		const weakenThreads = Math.min((securityLevel - minSecurityLevel) / 0.05, maxWeakenThreads);

		let weakenTime = Math.ceil(ns.formulas.hacking.weakenTime(formulasServer, player));
		let growTime = Math.ceil(ns.formulas.hacking.growTime(formulasServer, player));

		ns.exec("weaken.js", "home", weakenThreads, server, 0, 0);
		maxRam -= weakenThreads * weakenRam;

		if (securityLevel - weakenThreads * 0.05 < minSecurityLevel * 1.1) {
			let growDelay = 500;
			if (weakenTime + delay > growTime) {
				growDelay = weakenTime - growTime + 500;
			}
			grow(server, formulasServer, player, maxRam, growDelay);
		}
	}

	function grow(server, formulasServer, player, maxRam, delay) {
		// let maxGrowThreads = Math.floor((maxRam * 0.75) / growRam);
		let maxGrowThreads = Math.floor(maxRam / growRam);

		let maxGrowMult = ns.formulas.hacking.growPercent(formulasServer, maxGrowThreads, player, formulasServer.cpuCores);
		let hackTime = ns.formulas.hacking.hackTime(formulasServer, player);
		const money = ns.getServerMoneyAvailable(server);
		const maxMoney = ns.getServerMaxMoney(server);

		let neededMult = maxMoney / money;

		let growThreads = approximateGrowThreads(formulasServer, player, neededMult);

		growThreads = Math.min(growThreads, maxGrowThreads);
		let growMult = ns.formulas.hacking.growPercent(formulasServer, growThreads, player, formulasServer.cpuCores);

		const maxWeakenThreads = Math.floor(maxRam / weakenRam);
		const growTime = Math.ceil(ns.formulas.hacking.growTime(formulasServer, player));
		const weakenTime = Math.ceil(ns.formulas.hacking.weakenTime(formulasServer, player));

		// security level will grow by threads * 0.004
		let weakenThreads = Math.min((maxGrowThreads * 0.004) / 0.05, maxWeakenThreads);

		ns.exec("grow.js", "home", growThreads, server, delay);

		let weakenDelay = 500;
		if (growTime + delay > weakenTime) {
			weakenDelay = growTime + delay - weakenTime + 500;
		}

		maxRam -= growThreads * growRam;

		ns.exec("weaken.js", "home", weakenThreads, server, weakenDelay, 1);

		if (money * growMult > maxMoney * 0.95) {
			let larger = Math.max(growTime + delay, weakenTime + weakenDelay);

			let hackDelay = 500;
			if (hackTime < larger) {
				hackDelay = Math.ceil(larger - hackTime + 500);
			}
			hack(server, formulasServer, player, maxRam, hackDelay);
		}
	}

	function hack(server, formulasServer, player, maxRam, delay) {
		let threadsRequiredToHackHalfCash = Math.floor(0.5 / ns.formulas.hacking.hackPercent(formulasServer, player));
		const maxHackThreads = Math.floor(maxRam / hackRam);
		const hackTime = ns.formulas.hacking.hackTime(formulasServer, player);
		const weakenTime = Math.ceil(ns.formulas.hacking.weakenTime(formulasServer, player));

		let hackThreads = Math.min(threadsRequiredToHackHalfCash, maxHackThreads);

		ns.exec("hack.js", "home", hackThreads, server, delay);

		// let weakenDelay = 0;
		// if (weakenTime < hackTime + delay) {
		// 	weakenDelay = hackTime - weakenTime + delay;
		// }

		// weaken(server, formulasServer, player, maxRam, weakenDelay);
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
