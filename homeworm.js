export function autocomplete(data, args) {
	return [...data.servers]; // This script autocompletes the list of servers.
}

export async function main(ns) {
	const numThreads = ns.getServerMaxRam("home") / ns.getScriptRam("worm.js") - 20;
	ns.exec("worm.js", "home", numThreads, ns.args[0], 0);
}
