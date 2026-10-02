// A tiny stand-in for the Workers AI binding, started by Playwright (playwright.config.ts).
// The Worker posts `{ model, input }` here instead of calling `env.AI.run` when AI_STUB_URL
// is set and the local admin bypass applies (src/lib/admin/ai.ts). Loopback only.
import { createServer } from "node:http";

const PORT = Number(process.env.AI_STUB_PORT ?? 4176);
const filler = Array.from({ length: 160 }, (_, i) => `word${i}`).join(" ");

function send(res, status, body) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

createServer((req, res) => {
  if (req.url === "/health") return send(res, 200, { ok: true });
  if (req.method !== "POST" || req.url !== "/run") return send(res, 404, { error: "not found" });
  let text = "";
  req.on("data", (chunk) => (text += chunk));
  req.on("end", () => {
    const { input } = JSON.parse(text);
    const user = input.messages.find((m) => m.role === "user").content;
    // One fixture repo always answers as an overloaded model would.
    if (user.includes("Repository: ryanyogan/stub-http-home")) {
      return send(res, 429, { error: "3040: Capacity temporarily exceeded" });
    }
    // Three fixture repos (e2e/admin-fixtures.sql) get the other failures: an answer that is
    // not a draft, no answer at all (the Worker's timeout fires first), a dropped connection.
    if (user.includes("Repository: ryanyogan/stub-ai-malformed")) {
      return send(res, 200, { response: "Sure! Here is a lovely description of the project." });
    }
    if (user.includes("Repository: ryanyogan/stub-ai-timeout")) {
      return void setTimeout(() => send(res, 200, { response: {} }), 6000);
    }
    if (user.includes("Repository: ryanyogan/stub-ai-down")) return void req.socket.destroy();
    const delimited =
      /<<<README_UNTRUSTED_BEGIN>>>\n[\s\S]*secret-readme-text[\s\S]*\n<<<README_UNTRUSTED_END>>>/.test(
        user,
      );
    send(res, 200, {
      response: {
        tagline: "Stub AI tagline zq4",
        summary: "Stub AI summary zq4 sentence.",
        body: `Stub AI body zq4. readme-delimited:${delimited ? "yes" : "no"}\n\n${filler}`,
        tech: ["Zig", "WebAssembly"],
        suggestedGroup: "shipped",
        suggestedStatus: "prototype",
        caveats: ["Stub caveat zq4: the README does not say whether this is deployed."],
      },
    });
  });
}).listen(PORT, "127.0.0.1");
