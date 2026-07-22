import { describe, it, expect } from "vitest";
import { enableStaticRendering, isUsingStaticRendering } from "../src/static-rendering";

describe("static-rendering", () => {
  it("isUsingStaticRendering returns false by default", () => {
    expect(isUsingStaticRendering()).toBe(false);
  });

  it("enableStaticRendering(true) enables static rendering", () => {
    enableStaticRendering(true);
    expect(isUsingStaticRendering()).toBe(true);
    // reset
    enableStaticRendering(false);
  });

  it("enableStaticRendering(false) disables static rendering", () => {
    enableStaticRendering(true);
    expect(isUsingStaticRendering()).toBe(true);
    enableStaticRendering(false);
    expect(isUsingStaticRendering()).toBe(false);
  });

  it("can be toggled multiple times", () => {
    enableStaticRendering(true);
    expect(isUsingStaticRendering()).toBe(true);
    enableStaticRendering(false);
    expect(isUsingStaticRendering()).toBe(false);
    enableStaticRendering(true);
    expect(isUsingStaticRendering()).toBe(true);
    // reset
    enableStaticRendering(false);
  });
});
