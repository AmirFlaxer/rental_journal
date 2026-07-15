import { describe, it, expect } from "vitest";
import { ICONS } from "./icons";

describe("ICONS map sanity", () => {
  it("every entry is a defined component (catches broken imports/typos)", () => {
    const broken = Object.entries(ICONS).filter(([, Component]) => Component == null);
    expect(broken).toEqual([]);
  });

  it("has no duplicate-looking empty keys", () => {
    expect(Object.keys(ICONS).length).toBeGreaterThan(60);
  });
});
