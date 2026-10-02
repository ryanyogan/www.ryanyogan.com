// The build's own preview images (vite-plugin-og.ts): route -> hashed asset path and alt text.
declare module "virtual:og-images" {
  const images: Record<string, { path: string; alt: string }>;
  export default images;
}

// A binary file bundled with the Worker as an ArrayBuffer (the Cloudflare Vite plugin).
declare module "*.bin" {
  const data: ArrayBuffer;
  export default data;
}
