const PRODUCTION_HSTS = "max-age=31536000; includeSubDomains; preload";
const PERMISSIONS_POLICY = ["camera=()", "geolocation=()", "microphone=()", "payment=()"].join(
  ", ",
);

export function applySecureHeaders(headers: Record<string, string | number>) {
  headers["x-content-type-options"] ??= "nosniff";
  headers["x-frame-options"] ??= "DENY";
  headers["referrer-policy"] ??= "strict-origin-when-cross-origin";
  headers["permissions-policy"] ??= PERMISSIONS_POLICY;
  headers["cross-origin-opener-policy"] ??= "same-origin";

  if (Bun.env.NODE_ENV === "production") {
    headers["strict-transport-security"] ??= PRODUCTION_HSTS;
  }
}
