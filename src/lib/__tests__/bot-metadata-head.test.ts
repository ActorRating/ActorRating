import { spawn, type ChildProcess } from "child_process";
import http from "http";
import net from "net";
import path from "path";

const ROOT = path.resolve(__dirname, "../../..");
const FIXTURE = path.join(ROOT, "test/fixtures/bot-metadata-app");
const NEXT_BIN = path.join(ROOT, "node_modules/next/dist/bin/next");

const GOOGLEBOT =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const CHROME =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const ACTOR_CANONICAL = "https://actorrating.com/actors/christopher-lee";
const PERFORMANCE_CANONICAL =
  "https://actorrating.com/rate/the-dark-knight-2008/heath-ledger";

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Could not allocate a port"));
        return;
      }
      const { port } = address;
      server.close(() => resolve(port));
    });
  });
}

function fetchHtml(port: number, pathname: string, userAgent: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = http.get(
      {
        hostname: "127.0.0.1",
        port,
        path: pathname,
        headers: { "user-agent": userAgent, accept: "text/html" },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const html = Buffer.concat(chunks).toString("utf8");
          if ((res.statusCode ?? 500) >= 400) {
            reject(new Error(`HTTP ${res.statusCode} for ${pathname}\n${html.slice(0, 500)}`));
            return;
          }
          resolve(html);
        });
      }
    );
    req.on("error", reject);
  });
}

function headInner(html: string): string {
  const start = html.search(/<head[\s>]/i);
  const end = html.search(/<\/head>/i);
  if (start < 0 || end < 0 || end < start) return "";
  return html.slice(start, end);
}

function bodyWithoutScripts(html: string): string {
  const end = html.search(/<\/head>/i);
  const body = end < 0 ? html : html.slice(end + "</head>".length);
  return body.replace(/<script[\s\S]*?<\/script>/gi, "");
}

function expectMetadataInHead(
  html: string,
  expected: { canonical: string; title: string; description: string }
) {
  const head = headInner(html);
  expect(head).toContain(`<link rel="canonical" href="${expected.canonical}"`);
  expect(head).toContain(`<title>${expected.title}</title>`);
  expect(head).toContain(`name="description" content="${expected.description}"`);
  expect(bodyWithoutScripts(html)).not.toContain('rel="canonical"');
}

describe("Next 15.4.8 htmlLimitedBots", () => {
  it("keeps Googlebot off the built-in blocking list and on the resolved app config", async () => {
    const { shouldServeStreamingMetadata } = require("next/dist/server/lib/streaming-metadata");
    const { HTML_LIMITED_BOT_UA_RE_STRING } = require("next/dist/shared/lib/router/utils/is-bot");

    expect(new RegExp(HTML_LIMITED_BOT_UA_RE_STRING, "i").test(GOOGLEBOT)).toBe(false);
    expect(shouldServeStreamingMetadata(GOOGLEBOT, undefined)).toBe(true);

    const config = await new Promise<{
      htmlLimitedBots?: string;
      experimentalHtmlLimitedBots?: string;
    }>((resolve, reject) => {
      const probe = spawn(
        process.execPath,
        [
          "-e",
          `const { default: loadConfig } = require("next/dist/server/config");
           const { PHASE_PRODUCTION_SERVER } = require("next/constants");
           loadConfig(PHASE_PRODUCTION_SERVER, process.cwd(), { silent: true })
             .then((config) => {
               process.stdout.write(JSON.stringify({
                 htmlLimitedBots: config.htmlLimitedBots,
                 experimentalHtmlLimitedBots: config.experimental && config.experimental.htmlLimitedBots,
               }));
             })
             .catch((error) => {
               console.error(error);
               process.exit(1);
             });`,
        ],
        { cwd: ROOT }
      );
      let stdout = "";
      let stderr = "";
      probe.stdout?.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      probe.stderr?.on("data", (chunk) => {
        stderr += chunk.toString();
      });
      probe.on("error", reject);
      probe.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`config probe exited ${code}\n${stderr}`));
          return;
        }
        resolve(JSON.parse(stdout));
      });
    });

    expect(typeof config.htmlLimitedBots).toBe("string");
    expect(config.htmlLimitedBots).toContain("Googlebot");
    expect(config.experimentalHtmlLimitedBots).toBeUndefined();
    expect(shouldServeStreamingMetadata(GOOGLEBOT, config.htmlLimitedBots)).toBe(false);
    expect(shouldServeStreamingMetadata(CHROME, config.htmlLimitedBots)).toBe(true);
  });
});

describe("server-rendered canonical metadata", () => {
  let child: ChildProcess | undefined;
  let port = 0;
  let logs = "";

  beforeAll(async () => {
    port = await freePort();
    const env = { ...process.env, NODE_ENV: "development" };
    delete env.NODE_OPTIONS;
    delete env.JEST_WORKER_ID;

    child = spawn(process.execPath, [NEXT_BIN, "dev", FIXTURE, "-p", String(port)], {
      cwd: ROOT,
      env,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout?.on("data", (chunk) => {
      logs += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      logs += chunk.toString();
    });

    const started = Date.now();
    while (Date.now() - started < 90_000) {
      if (child.exitCode != null) {
        throw new Error(`fixture server exited\n${logs.slice(-4000)}`);
      }
      try {
        await fetchHtml(port, "/", CHROME);
        return;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }
    throw new Error(`fixture server did not become ready\n${logs.slice(-4000)}`);
  }, 120_000);

  afterAll(() => {
    if (child?.pid) {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {
        child.kill("SIGTERM");
      }
    }
  });

  it("emits actor canonical, title, and description inside head for Googlebot", async () => {
    const html = await fetchHtml(port, "/actors/christopher-lee", GOOGLEBOT);
    expectMetadataInHead(html, {
      canonical: ACTOR_CANONICAL,
      title: "Actor christopher-lee",
      description: "How good is christopher-lee really?",
    });
  });

  it("emits performance canonical, title, and description inside head for Googlebot", async () => {
    const html = await fetchHtml(
      port,
      "/rate/the-dark-knight-2008/heath-ledger",
      GOOGLEBOT
    );
    expectMetadataInHead(html, {
      canonical: PERFORMANCE_CANONICAL,
      title: "Rate heath-ledger in the-dark-knight-2008",
      description: "heath-ledger in the-dark-knight-2008",
    });
  });

  it("still streams canonical into the body for a normal browser", async () => {
    const html = await fetchHtml(port, "/actors/christopher-lee", CHROME);
    expect(headInner(html)).not.toContain('rel="canonical"');
    expect(bodyWithoutScripts(html)).toContain(`href="${ACTOR_CANONICAL}"`);
  });
});
