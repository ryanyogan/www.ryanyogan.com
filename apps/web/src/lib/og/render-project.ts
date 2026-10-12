import { ImageResponse } from "@cf-wasm/og/workerd";
import roman from "./newsreader-latin-400.woff.bin";
import bold from "./newsreader-latin-700.woff.bin";
import { OG_FONT_FAMILY, OG_HEIGHT, OG_WIDTH, type OgCard, ogCard } from "./template";

/**
 * A card as a PNG response, drawn in the Worker (satori and resvg as WebAssembly). Imported
 * on first use only (routes/og.projects.$file.ts): no page request loads the renderer.
 * The two font files are bundled; nothing is fetched (a character they lack is not looked up).
 */
export function renderCardResponse(
  card: OgCard,
  headers: Record<string, string>,
): Promise<Response> {
  return ImageResponse.async(ogCard(card) as never, {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    format: "png",
    fonts: [
      { name: OG_FONT_FAMILY, data: roman, weight: 400, style: "normal" },
      { name: OG_FONT_FAMILY, data: bold, weight: 700, style: "normal" },
    ],
    loadAdditionalAsset: async () => [],
    headers,
  });
}
