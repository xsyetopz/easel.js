// Generated stand-ins for the sandbox's music, shared by both sides. The
// upstream tracks 358232 and 376737 are CC BY-NC-SA and are not copied, and
// Project_Utopia is replaced too; see the EASEL module's differences.

/**
 * Starts an oscillator whose loudness pulses at `pulseFrequency` Hz, built
 * only from native Web Audio nodes so no sample is computed in JavaScript.
 * Returns the gain node to use as an audio source and a `stop` function.
 */
export function createPulseTrack(
  context,
  { type, frequency, pulseFrequency, level },
) {
  const oscillator = context.createOscillator();
  oscillator.type = type;
  oscillator.frequency.value = frequency;

  const output = context.createGain();
  output.gain.value = level / 2;

  const pulse = context.createOscillator();
  pulse.type = "sine";
  pulse.frequency.value = pulseFrequency;
  const depth = context.createGain();
  depth.gain.value = level / 2;

  pulse.connect(depth);
  depth.connect(output.gain);
  oscillator.connect(output);
  oscillator.start(0);
  pulse.start(0);

  return {
    output,
    stop() {
      oscillator.stop();
      pulse.stop();
      oscillator.disconnect();
      pulse.disconnect();
      depth.disconnect();
      output.disconnect();
    },
  };
}

/** Replaces sounds/358232_j_s_song: a sawtooth pulsing twice a second. */
export const SONG_TRACK = {
  type: "sawtooth",
  frequency: 220,
  pulseFrequency: 2,
  level: 0.3,
};

/** Replaces sounds/376737_Skullbeatz___Bad_Cat_Maste: a fast square beat. */
export const SKULLBEATZ_TRACK = {
  type: "square",
  frequency: 55,
  pulseFrequency: 4,
  level: 0.3,
};

/** Replaces the looping sounds/Project_Utopia ambience: a slow triangle swell. */
export const UTOPIA_TRACK = {
  type: "triangle",
  frequency: 110,
  pulseFrequency: 0.1,
  level: 0.5,
};
