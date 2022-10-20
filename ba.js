export function autocomplete(data, args) {
	return [...data.servers]; // This script autocompletes the list of servers.
}

export async function main(ns) {
	const maxMoney = ns.getServerMaxMoney(ns.args[0]);
	const currentMoney = ns.getServerMoneyAvailable(ns.args[0]);
	const securityLevel = ns.getServerSecurityLevel(ns.args[0]);
	const minSecurityLevel = ns.getServerMinSecurityLevel(ns.args[0]);

	ns.tprint("Max money: $" + maxMoney.toLocaleString());
	ns.tprint("Current money: $" + currentMoney.toLocaleString());
	ns.tprint("Security level: " + securityLevel);
	ns.tprint("Min security level: " + minSecurityLevel);
}
