import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { createServer } from "node:http";

assert.deepEqual(process.argv.slice(2), ["serve", "--service"]);
const file = process.env.OPENCODE_STATUS_TEST_REGISTRATION;
assert.ok(file, "the fake service needs an isolated registration file");

const version = "2.3.0";
const server = createServer((request, response) => {
  if (request.url !== "/api/info") {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ version, pid: process.pid }));
});

server.listen(0, "127.0.0.1", async () => {
  const address = server.address();
  assert.ok(address && typeof address === "object");
  await writeFile(file, JSON.stringify({
    id: `fake-service-${process.pid}`,
    version,
    pid: process.pid,
    url: `http://127.0.0.1:${address.port}`,
    args: process.argv.slice(2),
  }));
});

// Bound the fake service lifetime even if a test is interrupted before cleanup.
setTimeout(() => server.close(() => process.exit()), 20_000).unref();
