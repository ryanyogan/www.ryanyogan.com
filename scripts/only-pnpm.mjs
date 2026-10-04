// `preinstall`: stops an install started with npm, yarn or Bun before it writes a second
// lockfile and a node_modules this repo's scripts do not expect. No dependency, no network.
const agent = process.env.npm_config_user_agent ?? "";
if (!agent.startsWith("pnpm/")) {
  console.error(
    `\nThis repo uses pnpm (see "packageManager" in package.json), not ${agent.split("/")[0] || "this package manager"}.\n` +
      "Run `corepack enable` (or `npm i -g pnpm`), then `pnpm install && pnpm dev`.\n",
  );
  process.exit(1);
}
