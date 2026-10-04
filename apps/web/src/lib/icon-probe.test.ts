import { describe, expect, it } from "vitest";
import { iconProbeResponse } from "./icon-probe";

const request = (path: string, method = "GET") =>
  new Request(`https://ryanyogan.com${path}`, { method });

describe("iconProbeResponse", () => {
  it("answers the icon paths with an empty 404 that no cache keeps", async () => {
    for (const path of [
      "/favicon.ico",
      "/favicon.ico?v=2",
      "/apple-touch-icon.png",
      "/apple-touch-icon-precomposed.png",
      "/apple-touch-icon-120x120.png",
      "/apple-touch-icon-120x120-precomposed.png",
    ]) {
      const response = iconProbeResponse(request(path));
      expect(response?.status, path).toBe(404);
      expect(response?.headers.get("cache-control"), path).toBe("no-store");
      expect(await response?.text(), path).toBe("");
    }
    expect(iconProbeResponse(request("/favicon.ico", "HEAD"))?.status).toBe(404);
  });

  it("leaves everything else to the router", () => {
    for (const path of ["/", "/favicon.svg", "/writing/favicon.ico", "/favicon.ico/", "/no-such"]) {
      expect(iconProbeResponse(request(path)), path).toBeNull();
    }
    expect(iconProbeResponse(request("/favicon.ico", "POST"))).toBeNull();
  });
});
