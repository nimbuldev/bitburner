export async function main(ns) {
	const ram = ns.getPurchasedServerMaxRam();
	const name = "weaken0";
	const cost = ns.getPurchasedServerCost(ram);
	ns.purchaseServer(name, ram);
}
