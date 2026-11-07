// Same shell as the signed-in app, but outside the (app) group's loading.tsx
// boundary: that lets requireAdmin()'s notFound() return a real 404 status.
export { default } from "../(app)/layout";

// User-specific: never statically cache (route config can't be re-exported).
export const dynamic = "force-dynamic";
