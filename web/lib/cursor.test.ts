import { describe, expect, it } from "bun:test";
import { getCursorDocumentSize } from "@web/lib/cursor";

describe("cursor document sizing", () => {
  it("captures the full scroll dimensions", () => {
    expect(getCursorDocumentSize({ scrollWidth: 1440, scrollHeight: 5600 })).toEqual({
      width: 1440,
      height: 5600,
    });
  });
});
