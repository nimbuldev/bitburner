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

		const optimalTargetHackLevel = Math.floor(ns.getHackingLevel() / 3);
		servers.sort((a, b) => {
			const aHackLevel = ns.getServerRequiredHackingLevel(a);
			const bHackLevel = ns.getServerRequiredHackingLevel(b);

			if (a === "home") {
				return 1;
			}

			if (b === "home") {
				return -1;
			}

			if (!ns.hasRootAccess(a)) {
				return 1;
			}

			if (!ns.hasRootAccess(b)) {
				return -1;
			}

			if (aHackLevel > ns.getHackingLevel()) {
				return 1;
			}

			if (bHackLevel > ns.getHackingLevel()) {
				return -1;
			}

			if (ns.getServerMaxMoney(a) === 0) {
				return 1;
			}

			if (ns.getServerMaxMoney(b) === 0) {
				return -1;
			}

			return Math.abs(aHackLevel - optimalTargetHackLevel) - Math.abs(bHackLevel - optimalTargetHackLevel);
		});
	}

	function retarget(targets) {
		targets = targets.slice(0, numTargets);
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
		const maxRam = ns.args[3];
		const ramPerTarget = Math.floor(maxRam / numTargets);

		for (let i = 0; i < numTargets; i++) {
			// const server = targets[i + offset];
			const server = ns.args[4];

			const ps = ns.ps();
			if (ps.some(process => process.args[0] === server && hackList.includes(process.filename))) {
				continue;
			}

			for (let i = 0; i < numTargets; i++) {
				let batchNo = 0;
				let ramRemaining = ramPerTarget;
				let timeBetweenBatches = 0;
				let badFlag = false;
				ns.tprint("Starting batch for " + server);

				if (ns.hasRootAccess(server)) {
					do {
						await ns.sleep(timeBetweenBatches);
						let maxWeakenThreads = Math.floor((ramRemaining * 0.95) / weakenRam);

						const securityLevel = ns.getServerSecurityLevel(server);
						const minSecurityLevel = ns.getServerMinSecurityLevel(server);
						const money = ns.getServerMoneyAvailable(server);
						const maxMoney = ns.getServerMaxMoney(server);
						let neededGrowthMultiplier = maxMoney / (money + 1);
						if (neededGrowthMultiplier < 1) {
							neededGrowthMultiplier = 1;
						}

						let hackPercent = 0.5;
						if (ns.args[1]) {
							if (isNaN(ns.args[1])) {
								ns.tprint("Invalid argument for hack percent");
								ns.exit();
							}
							hackPercent = ns.args[1] / 100;
						}

						const hackMoneyAmount = maxMoney * hackPercent;

						let weakenThreads = Math.min(Math.ceil((securityLevel - minSecurityLevel) / 0.05), maxWeakenThreads);
						ramRemaining -= weakenThreads * weakenRam;
						const maxGrowThreads = Math.min(Math.floor((ramRemaining * 0.95) / growRam));

						let growthThreads = Math.ceil(ns.growthAnalyze(server, neededGrowthMultiplier));
						// let growthThreads = Math.min(temp, maxGrowThreads);
						let flag = false;
						if (maxGrowThreads < growthThreads) {
							growthThreads = maxGrowThreads;
							flag = true;
							badFlag = true;
						}

						if (growthThreads == 0) {
							growthThreads = 1;
							badFlag = true;
						}
						if (weakenThreads == 0) {
							weakenThreads = 1;
						}

						ramRemaining -= growthThreads * growRam;
						const maxHackThreads = Math.floor((ramRemaining * 0.95) / hackRam);

						const weakenTime = ns.getWeakenTime(server);
						const hackTime = ns.getHackTime(server);
						const growTime = ns.getGrowTime(server);

						ns.exec("weaken.js", runningServerName, weakenThreads, server, 0, 0, batchNo, Math.random());
						let growDelay = 300;
						if (weakenTime > growTime) {
							growDelay = Math.ceil(weakenTime - growTime + 300);
						}
						ns.exec("grow.js", runningServerName, growthThreads, server, growDelay, batchNo, Math.random());

						maxWeakenThreads = ramRemaining / weakenRam;
						weakenThreads = Math.ceil(Math.min((growthThreads * 0.004) / 0.05, maxWeakenThreads));

						if (weakenThreads <= 0) {
							weakenThreads = 1;
							badFlag = true;
						}

						let weakenDelay = 300;
						if (growTime + growDelay > weakenTime) {
							weakenDelay = Math.ceil(growTime + growDelay - weakenTime + 300);
						}

						ns.exec("weaken.js", runningServerName, weakenThreads, server, weakenDelay, 1, batchNo, Math.random());

						let takesLonger = Math.max(growTime + growDelay, weakenTime + weakenDelay);
						let hackDelay = 300;
						if (takesLonger > hackTime) {
							hackDelay = Math.ceil(takesLonger - hackTime + 300);
						}

						let hackThreads = hackPercent / ns.hackAnalyze(server);

						hackThreads = Math.min(hackThreads, maxHackThreads);

						let takesLongest = Math.max(growTime + growDelay, weakenTime + weakenDelay, hackTime + hackDelay);
						let takesShortest = Math.min(growTime + growDelay, weakenTime + weakenDelay, hackTime + hackDelay);

						timeBetweenBatches = takesLongest - takesShortest + 600;

						if (!flag) {
							ns.exec("hack.js", runningServerName, hackThreads, server, hackDelay, batchNo, Math.random());
							ramRemaining -= hackThreads * hackRam;
						}

						ns.tprint("Ram remaining: " + ramRemaining);

						const batchRamUsage = weakenRam * weakenThreads + growRam * growthThreads + hackRam * hackThreads;

						batchNo++;
					} while (ramRemaining > weakenRam + growRam + hackRam && !badFlag);
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

	let offset = 0;
	offset = ns.args[2];
	if (isNaN(offset)) {
		ns.tprint("Invalid offset, assuming 0");
		offset = 0;
	}

	let runningServerName = ns.getHostname();

	if (isNaN(numTargets)) {
		ns.tprint("Invalid number of targets");
		return;
	}

	while (true) {
		// nukeAllServers(servers);
		sortByOptimalServerToHack(servers);
		// retarget(servers);
		await batcher(servers);
		await ns.sleep(5000);
	}
}
