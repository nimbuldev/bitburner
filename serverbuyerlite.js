export async function main(ns) {
	function getMaxRam(money) {
		let maxRam = ns.getPurchasedServerMaxRam();

		while (money < ns.getPurchasedServerCost(maxRam)) {
			maxRam = maxRam / 2;
		}

		return maxRam;
	}

	const money = ns.getServerMoneyAvailable("home");
	const maxRam = getMaxRam(money);
	ns.purchaseServer("server0", maxRam);
	ns.scp(["shit2.js", "weaken.js", "grow.js", "hack.js"], "server0");
}
