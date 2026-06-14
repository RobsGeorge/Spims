import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { errorResponse } from "@/lib/errors";

// Public endpoint — no auth required
export async function GET() {
  try {
    const theme = await db.theme.findFirst({ where: { isActive: true } });

    if (!theme) {
      // Return safe defaults so the app renders even before any theme is seeded
      return NextResponse.json({
        siteName: "Spims",
        logoLightUrl: null,
        logoDarkUrl: null,
        faviconUrl: null,
        tokens: {
          light: {},
          dark: {},
        },
      });
    }

    return NextResponse.json({
      siteName: theme.siteName,
      logoLightUrl: theme.logoLightUrl,
      logoDarkUrl: theme.logoDarkUrl,
      faviconUrl: theme.faviconUrl,
      tokens: theme.tokens,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
