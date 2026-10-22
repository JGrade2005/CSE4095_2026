interface Note {
  frequency: number;
  start: number;
  duration: number;
}

const CORRECT_NOTES: Note[] = [
  { frequency: 523.25, start: 0, duration: 0.1 },
  { frequency: 783.99, start: 0.1, duration: 0.12 },
];
const INCORRECT_NOTES: Note[] = [{ frequency: 220, start: 0, duration: 0.2 }];
const PEAK_VOLUME = 0.08;

type AudioContextConstructor = typeof AudioContext;

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (audioContext) return audioContext;
  const scope = globalThis as {
    AudioContext?: AudioContextConstructor;
    webkitAudioContext?: AudioContextConstructor;
  };
  const Constructor = scope.AudioContext ?? scope.webkitAudioContext;
  if (!Constructor) return null;
  audioContext = new Constructor();
  return audioContext;
}

function playNote(context: AudioContext, note: Note): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const startAt = context.currentTime + note.start;
  const endAt = startAt + note.duration;

  oscillator.type = "sine";
  oscillator.frequency.value = note.frequency;
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(PEAK_VOLUME, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(endAt + 0.02);
}

export function playResultSound(correct: boolean): void {
  try {
    const context = getAudioContext();
    if (!context) return;
    if (context.state === "suspended") {
      void context.resume().catch(() => undefined);
    }
    for (const note of correct ? CORRECT_NOTES : INCORRECT_NOTES) {
      playNote(context, note);
    }
  } catch {
    // Sound is optional; a failure must never affect practice.
  }
}
