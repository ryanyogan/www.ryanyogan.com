// The build's own preview images (vite-plugin-og.ts): route -> hashed asset path and alt text.
declare module "virtual:og-images" {
  const images: Record<string, { path: string; alt: string }>;
  export default images;
}

// What the build knows about the files in public/images (vite-plugin-images.ts).
declare module "virtual:prose-images" {
  const images: import("../markdown").ProseImages;
  export default images;
}

// A binary file bundled with the Worker as an ArrayBuffer (the Cloudflare Vite plugin).
declare module "*.bin" {
  const data: ArrayBuffer;
  export default data;
}
