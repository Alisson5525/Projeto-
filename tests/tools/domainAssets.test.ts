import { describe, expect, it } from "vitest";
import anim from "../../packs/JJK_RP/animations/jjk_domain.animation.json";
import { closureThreshold } from "../../src/core/domainRules";

describe("Unlimited Void barrier shell", () => {
  it("closes each plate at the Java threshold of its latitude/longitude", () => {
    const bones = anim.animations["animation.jjk.domain_barrier.closure"].bones as Record<string, { scale: string }>;
    for (let band = 0; band < 8; band++) {
      for (let column = 0; column < 16; column++) {
        const lat = -Math.PI / 2 + ((band + 0.5) * Math.PI) / 8;
        const lon = ((column + 0.5) * 2 * Math.PI) / 16;
        expect(bones[`plate_${band}_${column}`]!.scale).toContain(closureThreshold(lon, lat).toFixed(4));
      }
    }
  });
});
