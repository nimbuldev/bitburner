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

	// Returns an array that sequentially contains the path from home to the target server.
	function traceToHome(server, servers, chain) {
		if (!chain) {
			chain = [];
		}

		if (chain.includes(server)) {
			return;
		}

		if (!servers.includes(server)) {
			ns.tprint("Server " + server + " does not exist.");
			return;
		}
		chain.push(server);
		if (server === "home") {
			return chain.reverse();
		}
		const connected = ns.scan(server);
		for (const connectedServer of connected) {
			let out = traceToHome(connectedServer, servers, chain);
			if (out) {
				return out;
			}
		}
		return;
	}

	let target = ns.args[0];
	let allServers = getAllServers();
	let chain = traceToHome(target, allServers);
	if (!chain) {
		return;
	}

	let print = "";
	for (const server of chain) {
		print += server + " -> ";
	}
	ns.tprint(print.slice(0, -4));
}
