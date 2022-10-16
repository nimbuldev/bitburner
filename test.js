export async function main(ns) {
	let server = ns.getServer(ns.args[0]);
	let player = ns.getPlayer();
	let hp = ns.formulas.hacking.hackPercent(server, player);
	ns.tprint(hp);
}
