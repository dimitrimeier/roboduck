import { isAbsolute } from "node:path";

import { OpenCode } from "@opencode/client";
import { Service } from "@opencode/client/service";

import { OpenCodeStatusSource } from "./adapters/opencode/open-code-source.js";
import { RelayFileReporter } from "./adapters/relay/relay-file-reporter.js";
import { StatusMonitor } from "./application/status-monitor.js";
import { StatusStore } from "./core/status-store.js";

const outputFile = process.argv[2];
if (outputFile === undefined || !isAbsolute(outputFile) || !outputFile.endsWith(".json")) {
  throw new Error("Usage: node collector.js <absolute-status-file.json>");
}

const controller = new AbortController();
process.once("SIGINT", () => controller.abort());
process.once("SIGTERM", () => controller.abort());

const reporter = new RelayFileReporter(outputFile);
const source = new OpenCodeStatusSource({
  clientFactory: {
    async create() {
      // Starting WSL must not start OpenCode or load its project plugins unnecessarily.
      const endpoint = await Service.discover();
      if (endpoint === undefined) {
        throw new Error("Waiting for the local OpenCode service");
      }
      return OpenCode.make({
        baseUrl: endpoint.url,
        headers: Service.headers({
          url: endpoint.url,
          ...(endpoint.auth === undefined ? {} : { auth: endpoint.auth }),
        }),
      });
    },
  },
});
const monitor = new StatusMonitor(source, new StatusStore(), reporter, { maximumRetryMs: 5_000 });

try {
  await Promise.all([monitor.run(controller.signal), reporter.run(controller.signal)]);
} catch {
  // Never send SDK errors (which may contain private data) to the service journal.
  controller.abort();
  console.error("WSL collector failed; systemd will retry. Check the relay path and permissions.");
  process.exitCode = 1;
}
