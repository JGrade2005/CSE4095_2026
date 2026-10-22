import { afterEach, describe, expect, it, vi } from "vitest";
import { playResultSound } from "./sound";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("playResultSound", () => {
  it("does not throw without AudioContext", () => {
    expect(() => playResultSound(true)).not.toThrow();
    expect(() => playResultSound(false)).not.toThrow();
  });

  it("does not throw when the audio API fails", () => {
    vi.stubGlobal(
      "AudioContext",
      class {
        constructor() {
          throw new Error("blocked");
        }
      },
    );
    expect(() => playResultSound(true)).not.toThrow();
  });

  it("plays two notes for a correct answer and one for an incorrect answer", async () => {
    const oscillators: number[] = [];
    class FakeAudioContext {
      state = "running";
      currentTime = 0;
      destination = {};
      createGain() {
        return {
          gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
          connect: vi.fn(),
        };
      }
      createOscillator() {
        const oscillator = {
          type: "",
          frequency: { value: 0 },
          connect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        };
        oscillators.push(1);
        return oscillator;
      }
    }
    vi.stubGlobal("AudioContext", FakeAudioContext);
    vi.resetModules();
    const { playResultSound: freshPlay } = await import("./sound");

    freshPlay(true);
    expect(oscillators).toHaveLength(2);
    freshPlay(false);
    expect(oscillators).toHaveLength(3);
  });
});
