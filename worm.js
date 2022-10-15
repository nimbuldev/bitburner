export async function main(ns) {
	const target = ns.args[0];

	while (true) {
		if (ns.getServerSecurityLevel(target) > ns.getServerMinSecurityLevel(target) + 3) {
			await ns.weaken(target);
		}
		if (ns.getServerMoneyAvailable(target) < ns.getServerMaxMoney(target) * 0.75) {
			await ns.grow(target);
		} else {
			await ns.hack(target);
		}
	}
}
