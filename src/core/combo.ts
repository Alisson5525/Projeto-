// Four-hit M1 combo, ported from server/M1CombatServer.java + M1Timeline.
// Input arrives as discrete presses (swings); "held" decays 5 ticks after the
// last press, like the Java input heartbeat.

export type ComboHit = 1 | 2 | 3 | 4;

export const M1 = {
  contact: [3, 3, 3, 6] as const,
  recovery: [9, 9, 9, 20] as const,
  actionEnd: [9, 9, 9, 12] as const,
  window: 20,
  buffer: 3,
  heldTimeout: 5,
  heavyRecovery: 20,
  damage: [1.75, 1.75, 1.75, 3.25] as const,
  range: [2.5, 2.5, 2.5, 3.5] as const,
  stun: [12, 12, 15, 20] as const,
  knockback: [0.035, 0.035, 0.035, 0.4] as const,
  finisherProtection: 20,
  slow: 0.55,
};

export interface ComboEvents {
  started?: ComboHit;
  contact?: ComboHit;
  actionEnded?: boolean;
}

export class ComboState {
  combo = 0;
  started = -1000;
  nextAllowed = 0;
  activeUntil = 0;
  private held = false;
  private buffered = false;
  private hitDone = true;
  private lastInput = -1000;

  isAttacking(now: number): boolean {
    return this.combo > 0 && now < this.activeUntil;
  }

  interrupt(): void {
    this.combo = 0;
    this.buffered = false;
    this.hitDone = true;
    this.held = false;
  }

  press(now: number, canAttack: boolean): ComboEvents {
    this.held = true;
    this.lastInput = now;
    if (!canAttack) return {};
    const c = this.combo;
    if (c > 0 && c < 4 && now > this.started + M1.window) {
      this.combo = 0;
      this.buffered = false;
    }
    if (this.combo === 0 && now >= this.nextAllowed) return this.start(1, now);
    if (this.combo > 0 && this.combo < 4 && now >= this.nextAllowed - M1.buffer && now < this.nextAllowed) this.buffered = true;
    if (this.combo === 4 && now >= this.nextAllowed && now >= this.started + M1.heavyRecovery) return this.start(1, now);
    if (this.combo > 0 && this.combo < 4 && now >= this.nextAllowed && now <= this.started + M1.window)
      return this.start((this.combo + 1) as ComboHit, now);
    return {};
  }

  tick(now: number, canAttack: boolean): ComboEvents {
    if (now - this.lastInput > M1.heldTimeout) this.held = false;
    if (!canAttack) {
      const wasActive = this.combo > 0;
      this.interrupt();
      return wasActive ? { actionEnded: true } : {};
    }
    const events: ComboEvents = {};
    if (this.combo > 0 && !this.hitDone && now >= this.started + M1.contact[this.combo - 1]!) {
      this.hitDone = true;
      events.contact = this.combo as ComboHit;
    }
    if (this.combo > 0 && now >= this.activeUntil) events.actionEnded = true;
    if (this.combo > 0 && now >= this.nextAllowed) {
      const holding = this.held && now - this.lastInput <= M1.heldTimeout;
      if (this.combo === 4 || now > this.started + M1.window) {
        this.combo = 0;
        this.buffered = false;
        if (holding) Object.assign(events, this.start(1, now));
      } else if (this.buffered || holding) {
        Object.assign(events, this.start((this.combo + 1) as ComboHit, now));
      }
    }
    if (this.combo > 0 && now > this.started + M1.window && !this.held) {
      this.combo = 0;
      this.buffered = false;
    }
    return events;
  }

  private start(hit: ComboHit, now: number): ComboEvents {
    this.combo = hit;
    this.started = now;
    this.hitDone = false;
    this.buffered = false;
    this.nextAllowed = now + M1.recovery[hit - 1]!;
    this.activeUntil = now + M1.actionEnd[hit - 1]!;
    return { started: hit };
  }
}
