import { createFileRoute } from "@tanstack/react-router";

// No component: a route without one renders its child, and has no chunk to fetch.
export const Route = createFileRoute("/projects")({});
