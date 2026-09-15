/**
 * Resolves the canonical base URL for the application based on current environment.
 * Handles production (https://autopilot-pos-saas.vercel.app), Vercel previews,
 * explicit environment overrides (NEXT_PUBLIC_SITE_URL / NEXT_PUBLIC_APP_URL),
 * and local development (http://localhost:3000).
 */
export function getAppBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    const url = process.env.VERCEL_URL;
    return url.startsWith("http") ? url.replace(/\/$/, "") : `https://${url}`.replace(/\/$/, "");
  }
  if (process.env.NODE_ENV === "production") {
    return "https://autopilot-pos-saas.vercel.app";
  }
  return "http://localhost:3000";
}
