// Just some Set testing, turned out to be a poor use case for sets
// because we already do the logic for checking if a server is a duplicate.

function getAllServers(server, servers) {
	if (servers === undefined) {
		servers = new Set();
	}
	if (server === undefined) {
		server = "home";
	}
	if (servers.has(server)) {
		return server;
	}
	servers.add(server);
	const connected = ns.scan(server);
	for (const connectedServer of connected) {
		servers.add(...getAllServers(connectedServer, servers));
	}
	return Array.from(servers);
}
