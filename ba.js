export function autocomplete(data, args) {
	return [...data.servers]; // This script autocompletes the list of servers.
}

export async function main(ns) {
	const money = ns.getServerMaxMoney(ns.args[0]);

	ns.tprint("Max money: $" + money.toLocaleString());
}
