export interface SliderControl {
  type: "slider";
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
}

export interface ColorControl {
  type: "color";
  key: string;
  label: string;
  default: string;
}

export interface SelectControl {
  type: "select";
  key: string;
  label: string;
  options: string[];
  default: string;
}

export type ControlDefinition = SliderControl | ColorControl | SelectControl;
