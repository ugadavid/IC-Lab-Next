"use strict";

const http = require("http");

const option = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const port = Number(option("port"));
const service = option("service") || "fixture";

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error("Fixture port invalide.");
  process.exit(2);
}

http.createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    return response.end(JSON.stringify({ ok: true, service, processId: process.pid }));
  }
  response.writeHead(404, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify({ error: "not_found" }));
}).listen(port, "127.0.0.1", () => {
  console.log(`${service} fixture listening on ${port}`);
});
