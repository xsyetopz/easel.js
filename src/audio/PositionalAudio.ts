import { Quaternion } from "../math/Quaternion.ts";
import { Vector3 } from "../math/Vector3.ts";
import type { AudioListener } from "./AudioListener.ts";
import { Audio } from "./Audio.ts";
import type { AudioNodeLike, PannerNodeLike } from "./AudioTypes.ts";

const _position = new Vector3();
const _quaternion = new Quaternion();
const _scale = new Vector3();
const _orientation = new Vector3();

/**
 * Positional audio object with a PannerNode for 3D spatial audio.
 * Extends {@link Audio} and adds distance and cone-based attenuation.
 */
export class PositionalAudio extends Audio {
  /** Panner node controlling 3D position and directional attenuation. */
  readonly panner: PannerNodeLike | undefined;

  /** Constructs a positional audio bound to the given listener. */
  constructor(listener: AudioListener) {
    super(listener);
    this.panner = this.context?.createPanner?.();
    if (this.panner) {
      this.panner.panningModel = "HRTF";
      try {
        if (this.gain) this.panner.connect(this.gain);
      } catch {
        // Context may be closed.
      }
    }
  }

  /** Panner node as the output, or the gain fallback. */
  override get output(): AudioNodeLike | undefined {
    return this.panner ?? this.gain;
  }

  /** Connects the source through the filter chain to the panner. */
  override connect(): this {
    super.connect();
    if (this.panner && this.gain) {
      try {
        this.panner.connect(this.gain);
      } catch {
        // Already connected or closed context.
      }
    }
    return this;
  }

  /** Disconnects the panner from the gain node. */
  override disconnect(): this | undefined {
    super.disconnect();
    if (this.panner && this.gain) {
      try {
        this.panner.disconnect?.(this.gain);
      } catch {
        // Already disconnected.
      }
    }
    return this;
  }

  /** Panner's reference distance. */
  get refDistance(): number {
    return this.panner?.refDistance ?? 1;
  }

  /** Sets the reference distance for volume reduction. */
  set refDistance(value: number) {
    if (this.panner) this.panner.refDistance = value;
  }

  /** Panner's rolloff factor. */
  get rolloffFactor(): number {
    return this.panner?.rolloffFactor ?? 1;
  }

  /** Sets the rolloff factor controlling volume reduction speed. */
  set rolloffFactor(value: number) {
    if (this.panner) this.panner.rolloffFactor = value;
  }

  /** Panner's distance model. */
  get distanceModel(): string {
    return this.panner?.distanceModel ?? "inverse";
  }

  /** Sets the distance model for volume reduction. */
  set distanceModel(value: string) {
    if (this.panner) this.panner.distanceModel = value;
  }

  /** Panner's maximum distance. */
  get maxDistance(): number {
    return this.panner?.maxDistance ?? 10000;
  }

  /** Sets the maximum distance for the linear distance model. */
  set maxDistance(value: number) {
    if (this.panner) this.panner.maxDistance = value;
  }

  /** Sets the panner's panning model. */
  setPanningModel(value: string): this {
    if (this.panner) this.panner.panningModel = value;
    return this;
  }

  /** Sets the directional cone for volume attenuation. */
  setDirectionalCone(
    coneInnerAngle: number,
    coneOuterAngle: number,
    coneOuterGain: number,
  ): this {
    if (this.panner) {
      this.panner.coneInnerAngle = coneInnerAngle;
      this.panner.coneOuterAngle = coneOuterAngle;
      this.panner.coneOuterGain = coneOuterGain;
    }
    return this;
  }

  /** Updates the panner position and orientation from the world matrix. */
  override updateMatrixWorld(force: boolean = false): void {
    super.updateMatrixWorld(force);
    if (!this.panner || !this.context) return;
    if (this.hasPlaybackControl && !this.isPlaying) return;

    this.matrixWorld.decompose(_position, _quaternion, _scale);
    _orientation.set(0, 0, 1).applyQuaternion(_quaternion);

    if (this.panner.positionX) {
      const endTime = this.context.currentTime + this.listener.timeDelta;
      try {
        this.panner.positionX.linearRampToValueAtTime?.(_position.x, endTime);
        this.panner.positionY?.linearRampToValueAtTime?.(_position.y, endTime);
        this.panner.positionZ?.linearRampToValueAtTime?.(_position.z, endTime);
        this.panner.orientationX?.linearRampToValueAtTime?.(
          _orientation.x,
          endTime,
        );
        this.panner.orientationY?.linearRampToValueAtTime?.(
          _orientation.y,
          endTime,
        );
        this.panner.orientationZ?.linearRampToValueAtTime?.(
          _orientation.z,
          endTime,
        );
      } catch {
        // Ramp may fail on closed context.
      }
    } else {
      try {
        this.panner.setPosition?.(_position.x, _position.y, _position.z);
        this.panner.setOrientation?.(
          _orientation.x,
          _orientation.y,
          _orientation.z,
        );
      } catch {
        // Legacy API may be unavailable.
      }
    }
  }
}
