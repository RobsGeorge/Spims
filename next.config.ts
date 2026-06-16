import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { buildSecurityHeaders } from "@/lib/security/headers";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  typedRoutes: false,
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: buildSecurityHeaders(isProduction),
      },
    ];
  },
};

export default withNextIntl(nextConfig);
