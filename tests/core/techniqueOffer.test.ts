import { describe, expect, it } from "vitest";
import { OfferTracker } from "../../src/core/techniqueOffer";

describe("technique choice offer", () => {
  it("picks the technique when the card is chosen", () => {
    expect(new OfferTracker().outcome({ selected: true, canceled: false, busy: false, openTicks: 40 })).toBe("choose");
  });

  it("asks a busy player again later without counting it as a failure", () => {
    const t = new OfferTracker();
    for (let i = 0; i < 5; i++) expect(t.outcome({ selected: false, canceled: true, busy: true, openTicks: 0 })).toBe("retry");
  });

  it("grants the only technique when the menu keeps closing by itself", () => {
    const t = new OfferTracker();
    expect(t.outcome({ selected: false, canceled: true, busy: false, openTicks: 1 })).toBe("retry");
    expect(t.outcome({ selected: false, canceled: true, busy: false, openTicks: 2 })).toBe("grant");
  });

  it("treats a menu that could not be shown at all as a failure", () => {
    const t = new OfferTracker();
    expect(t.outcome({ error: true })).toBe("retry");
    expect(t.outcome({ error: true })).toBe("grant");
  });

  it("does not force the choice on a player who read the menu and closed it", () => {
    const t = new OfferTracker();
    expect(t.outcome({ selected: false, canceled: true, busy: false, openTicks: 1 })).toBe("retry");
    expect(t.outcome({ selected: false, canceled: true, busy: false, openTicks: 80 })).toBe("retry");
    expect(t.outcome({ selected: false, canceled: true, busy: false, openTicks: 1 })).toBe("retry");
  });
});
