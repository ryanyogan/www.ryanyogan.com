import { ImageResponse } from "@cf-wasm/og/workerd";
import font from "./hanken-grotesk-latin-500.woff.bin";
import {
  OG_FONT_FAMILY,
  OG_FONT_WEIGHT,
  OG_HEIGHT,
  OG_WIDTH,
  type OgCard,
  ogCard,
} from "./template";

/**
 * A card as a PNG response, drawn in the Worker (satori and resvg as WebAssembly). Imported
 * on first use only (routes/og.projects.$file.ts): no page request loads the renderer.
 * The one font is bundled; nothing is fetched (a character the font lacks is not looked up).
 */
export function renderCardResponse(
  card: OgCard,
  headers: Record<string, string>,
): Promise<Response> {
  return ImageResponse.async(ogCard(card) as never, {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    format: "png",
    fonts: [{ name: OG_FONT_FAMILY, data: font, weight: OG_FONT_WEIGHT, style: "normal" }],
    loadAdditionalAsset: async () => [],
    headers,
  });
}
