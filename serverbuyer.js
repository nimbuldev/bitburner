export async function main(ns) {
	const ram = ns.getPurchasedServerMaxRam();
	const cost = ns.getPurchasedServerCost(ram);
	let money = ns.getServerMoneyAvailable("home");

	let i = 1;
	while (money > cost && i <= 10) {
		const name = "server" + i;
		if (ns.serverExists(name)) {
			ns.scp(["shit2.js", "weaken.js", "grow.js", "hack.js"], name);
			ns.exec("shit2.js", name, 1, 1, 50, i);
			i++;
			continue;
		}
		let serverPurchased = ns.purchaseServer(name, ram);
		if (!serverPurchased) {
			ns.print(`ERROR: Failed purchasing server: ${name}`);
			return;
		}

		ns.scp(["shit2.js", "weaken.js", "grow.js", "hack.js"], name);
		ns.exec("shit2.js", name, 1, 1, 50, i);
		i++;
	}
}
