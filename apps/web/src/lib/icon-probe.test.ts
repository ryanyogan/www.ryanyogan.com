import { describe, expect, it } from "vitest";
import { ICON_PATHS } from "./icon";
import { iconProbeResponse } from "./icon-probe";

const request = (path: string, method = "GET") =>
  new Request(`https://ryanyogan.com${path}`, { method });

describe("iconProbeResponse", () => {
  it("answers the icon names that have no file with an empty 404 that no cache keeps", async () => {
    for (const path of [
      "/apple-touch-icon-precomposed.png",
      "/apple-touch-icon-precomposed.png?v=2",
      "/apple-touch-icon-120x120.png",
      "/apple-touch-icon-120x120-precomposed.png",
    ]) {
      const response = iconProbeResponse(request(path));
      expect(response?.status, path).toBe(404);
      expect(response?.headers.get("cache-control"), path).toBe("no-store");
      expect(await response?.text(), path).toBe("");
    }
    const head = iconProbeResponse(request("/apple-touch-icon-precomposed.png", "HEAD"));
    expect(head?.status).toBe(404);
  });

  it("leaves the three icon files, and everything else, alone", () => {
    for (const path of [
      ...Object.values(ICON_PATHS),
      "/",
      "/writing/apple-touch-icon-precomposed.png",
      "/apple-touch-icon-precomposed.png/",
      "/no-such",
    ]) {
      expect(iconProbeResponse(request(path)), path).toBeNull();
    }
    expect(iconProbeResponse(request("/apple-touch-icon-precomposed.png", "POST"))).toBeNull();
  });
});
