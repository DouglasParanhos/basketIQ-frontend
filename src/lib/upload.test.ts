import { describe, expect, it } from "vitest";
import { sha256Hex } from "./upload";

describe("sha256Hex (RF-08)", () => {
  it("hashes file content like the backend does", async () => {
    const hash = await sha256Hex(new File(["abc"], "a.txt"));
    expect(hash).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});
