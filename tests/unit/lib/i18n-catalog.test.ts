import { describe, it, expect } from "vitest";
import en from "@/messages/en.json";
import ar from "@/messages/ar.json";
import fr from "@/messages/fr.json";
import { compareCatalogs } from "@/lib/i18n/catalog";

describe("i18n catalogs", () => {
  it("Arabic has all English keys", () => {
    const { missing } = compareCatalogs(en, ar);
    expect(missing).toEqual([]);
  });

  it("French has all English keys", () => {
    const { missing } = compareCatalogs(en, fr);
    expect(missing).toEqual([]);
  });
});
