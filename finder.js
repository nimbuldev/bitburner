export function autocomplete(data, args) {
	return [...data.servers]; // This script autocompletes the list of servers.
}

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
	function traceToHome(server, servers, chain) {
		if (!chain) {
			chain = [];
		}

		if (chain.includes(server)) {
			return;
		}

		if (!servers.includes(server)) {
			ns.tprint("Server " + server + " is not connected to home.");
			return;
		}
		chain.push(server);
		if (server === "home") {
			let out = "";
			chain.reverse();
			for (const server of chain) {
				out += server + " -> ";
			}
			ns.tprint(out.slice(0, -4));
			return;
		}
		const connected = ns.scan(server);
		for (const connectedServer of connected) {
			traceToHome(connectedServer, servers, chain);
		}
	}

	let target = ns.args[0];
	let allServers = getAllServers();
	traceToHome(target, allServers);
}
