export type SupportedExt = 'png' | 'jpg' | 'jpeg';

export type EditActionType =
  | 'rotate'
  | 'randomCrop'
  | 'randomScale'
  | 'resize'
  | 'hue'
  | 'exposure'
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'blur'
  | 'gaussianNoise';

export interface MinMaxRange {
  min: number;
  max: number;
}

export interface ResizeEdit {
  action: 'resize';
  resize: {
    width: number;
    height: number;
  };
}

export interface RandomCropEdit {
  action: 'randomCrop';
  randomCrop: {
    width: MinMaxRange;
    height: MinMaxRange;
  };
}

export interface RangeEdit {
  action:
    | 'rotate'
    | 'randomScale'
    | 'hue'
    | 'exposure'
    | 'brightness'
    | 'contrast'
    | 'saturation'
    | 'blur'
    | 'gaussianNoise';
  range: MinMaxRange;
}

export type EditObject = ResizeEdit | RandomCropEdit | RangeEdit;

export interface FlipConfig {
  enabled: boolean;
  probability: number; // 0 to 1
}

export interface AugmentationRequestPayload {
  count: number;
  ext: SupportedExt;
  edits: EditObject[];
  flip?: FlipConfig;
}

export interface TechniqueState {
  enabled: boolean;
  action: EditActionType;
  label: string;
  category: 'geometric' | 'color' | 'filter';
  description: string;
  // Parameters
  range?: MinMaxRange;
  resize?: { width: number; height: number };
  randomCrop?: { width: MinMaxRange; height: MinMaxRange };
  // Limits
  limits?: {
    minAllowed: number;
    maxAllowed: number;
    step: number;
    unit?: string;
  };
}

// All disabled by default with 0/neutral starting values as requested
export const INITIAL_TECHNIQUES: Record<EditActionType, TechniqueState> = {
  rotate: {
    enabled: false,
    action: 'rotate',
    label: 'Rotation',
    category: 'geometric',
    description: 'Rotate left (negative) or right (positive) with recalculated YOLO bounding boxes.',
    range: { min: 0, max: 0 },
    limits: { minAllowed: -360, maxAllowed: 360, step: 1, unit: '°' },
  },
  randomScale: {
    enabled: false,
    action: 'randomScale',
    label: 'Random Scale',
    category: 'geometric',
    description: 'Resizes full image by random scale factor (0.1x to 4.0x).',
    range: { min: 1.0, max: 1.0 },
    limits: { minAllowed: 0.1, maxAllowed: 4.0, step: 0.05, unit: 'x' },
  },
  randomCrop: {
    enabled: false,
    action: 'randomCrop',
    label: 'Random Crop',
    category: 'geometric',
    description: 'Crops random fraction of width and height, clipping bounding boxes.',
    randomCrop: {
      width: { min: 1.0, max: 1.0 },
      height: { min: 1.0, max: 1.0 },
    },
    limits: { minAllowed: 0.01, maxAllowed: 1.0, step: 0.05, unit: 'ratio' },
  },
  resize: {
    enabled: false,
    action: 'resize',
    label: 'Fixed Resize',
    category: 'geometric',
    description: 'Resize to target pixels (set one to 0 to preserve aspect ratio).',
    resize: { width: 0, height: 0 },
    limits: { minAllowed: 0, maxAllowed: 2000, step: 10, unit: 'px' },
  },
  brightness: {
    enabled: false,
    action: 'brightness',
    label: 'Brightness Adjustment',
    category: 'color',
    description: 'Adjusts light exposure intensity (-100% to +100%).',
    range: { min: 0, max: 0 },
    limits: { minAllowed: -100, maxAllowed: 100, step: 1, unit: '%' },
  },
  contrast: {
    enabled: false,
    action: 'contrast',
    label: 'Contrast Adjustment',
    category: 'color',
    description: 'Modifies dynamic tonal separation (-100% to +100%).',
    range: { min: 0, max: 0 },
    limits: { minAllowed: -100, maxAllowed: 100, step: 1, unit: '%' },
  },
  saturation: {
    enabled: false,
    action: 'saturation',
    label: 'Saturation',
    category: 'color',
    description: 'Boosts or dampens color richness (-100% to +100%).',
    range: { min: 0, max: 0 },
    limits: { minAllowed: -100, maxAllowed: 100, step: 1, unit: '%' },
  },
  hue: {
    enabled: false,
    action: 'hue',
    label: 'Hue Shift',
    category: 'color',
    description: 'Rotates color spectrum wheel (-360° to +360°).',
    range: { min: 0, max: 0 },
    limits: { minAllowed: -360, maxAllowed: 360, step: 1, unit: '°' },
  },
  exposure: {
    enabled: false,
    action: 'exposure',
    label: 'Exposure Stops',
    category: 'color',
    description: 'Photographic exposure adjustment in EV stops (-10 to +10).',
    range: { min: 0, max: 0 },
    limits: { minAllowed: -10, maxAllowed: 10, step: 0.1, unit: 'EV' },
  },
  blur: {
    enabled: false,
    action: 'blur',
    label: 'Gaussian Blur',
    category: 'filter',
    description: 'Blurs image with Gaussian sigma (0 to 100; 0 is none).',
    range: { min: 0, max: 0 },
    limits: { minAllowed: 0, maxAllowed: 100, step: 0.1, unit: 'σ' },
  },
  gaussianNoise: {
    enabled: false,
    action: 'gaussianNoise',
    label: 'Gaussian Noise',
    category: 'filter',
    description: 'Adds sensor noise in 8-bit RGB levels (0 to 255).',
    range: { min: 0, max: 0 },
    limits: { minAllowed: 0, maxAllowed: 255, step: 1, unit: 'lvl' },
  },
};

/**
 * Builds the canonical metadata request object adhering to the Go backend API specs.
 */
export function buildPayload(
  techniques: Record<EditActionType, TechniqueState>,
  globalCount: number,
  globalExt: SupportedExt,
  flip: FlipConfig
): { payload: AugmentationRequestPayload; errors: string[] } {
  const errors: string[] = [];

  const enabledEdits: EditObject[] = [];

  for (const tech of Object.values(techniques)) {
    if (!tech.enabled) continue;

    if (tech.action === 'resize') {
      if (!tech.resize) {
        errors.push('Resize edit parameters missing');
        continue;
      }
      enabledEdits.push({
        action: 'resize',
        resize: {
          width: Math.max(0, Math.round(tech.resize.width)),
          height: Math.max(0, Math.round(tech.resize.height)),
        },
      });
    } else if (tech.action === 'randomCrop') {
      if (!tech.randomCrop) {
        errors.push('RandomCrop parameters missing');
        continue;
      }
      const wMin = Math.min(tech.randomCrop.width.min, tech.randomCrop.width.max);
      const wMax = Math.max(tech.randomCrop.width.min, tech.randomCrop.width.max);
      const hMin = Math.min(tech.randomCrop.height.min, tech.randomCrop.height.max);
      const hMax = Math.max(tech.randomCrop.height.min, tech.randomCrop.height.max);

      enabledEdits.push({
        action: 'randomCrop',
        randomCrop: {
          width: { min: Number(wMin.toFixed(2)), max: Number(wMax.toFixed(2)) },
          height: { min: Number(hMin.toFixed(2)), max: Number(hMax.toFixed(2)) },
        },
      });
    } else {
      // Range edits
      if (!tech.range) {
        errors.push(`Missing range for ${tech.action}`);
        continue;
      }
      const rMin = Math.min(tech.range.min, tech.range.max);
      const rMax = Math.max(tech.range.min, tech.range.max);
      enabledEdits.push({
        action: tech.action,
        range: { min: rMin, max: rMax },
      });
    }
  }

  if (enabledEdits.length === 0) {
    errors.push('No augmentation technique selected. Please check at least one technique in Step 2.');
  }

  if (globalCount < 1 || globalCount > 50) {
    errors.push('Output count per image must be between 1 and 50.');
  }

  // Backend spec rule: "count must be at least the number of edits"
  if (globalCount < enabledEdits.length) {
    errors.push(
      `Count (${globalCount}) must be at least the number of selected edits (${enabledEdits.length}).`
    );
  }

  const payload: AugmentationRequestPayload = {
    count: Math.max(1, globalCount),
    ext: globalExt,
    edits: enabledEdits,
  };

  if (flip.enabled) {
    const prob = Math.max(0, Math.min(1, flip.probability));
    payload.flip = {
      enabled: true,
      probability: Number(prob.toFixed(2)),
    };
  }

  return { payload, errors };
}

export interface PresetDefinition {
  id: string;
  name: string;
  description: string;
  count: number;
  flipEnabled: boolean;
  flipProb: number;
  techniques: Partial<Record<EditActionType, Partial<TechniqueState>>>;
}

export const PRESETS: PresetDefinition[] = [
  {
    id: 'reset',
    name: 'Clear All (0 Selected)',
    description: 'Resets all technique checkboxes and ranges to 0.',
    count: 10,
    flipEnabled: false,
    flipProb: 0,
    techniques: {
      rotate: { enabled: false, range: { min: 0, max: 0 } },
      randomScale: { enabled: false, range: { min: 1, max: 1 } },
      brightness: { enabled: false, range: { min: 0, max: 0 } },
      contrast: { enabled: false, range: { min: 0, max: 0 } },
      blur: { enabled: false, range: { min: 0, max: 0 } },
      randomCrop: { enabled: false },
      resize: { enabled: false },
      saturation: { enabled: false, range: { min: 0, max: 0 } },
      hue: { enabled: false, range: { min: 0, max: 0 } },
      exposure: { enabled: false, range: { min: 0, max: 0 } },
      gaussianNoise: { enabled: false, range: { min: 0, max: 0 } },
    },
  },
  {
    id: 'balanced',
    name: 'Object Detection Standard',
    description: 'Rotations, gentle scaling, brightness and contrast variance with 25% flip.',
    count: 10,
    flipEnabled: true,
    flipProb: 0.25,
    techniques: {
      rotate: { enabled: true, range: { min: -15, max: 15 } },
      randomScale: { enabled: true, range: { min: 0.85, max: 1.15 } },
      brightness: { enabled: true, range: { min: -15, max: 15 } },
      contrast: { enabled: true, range: { min: -15, max: 15 } },
      blur: { enabled: false },
      randomCrop: { enabled: false },
      saturation: { enabled: false },
      gaussianNoise: { enabled: false },
    },
  },
  {
    id: 'heavy_yolo',
    name: 'Heavy YOLO Training',
    description: 'Random crop, scale, rotation, color jitter, and blur for robust detection.',
    count: 20,
    flipEnabled: true,
    flipProb: 0.5,
    techniques: {
      randomCrop: {
        enabled: true,
        randomCrop: { width: { min: 0.75, max: 1.0 }, height: { min: 0.75, max: 1.0 } },
      },
      rotate: { enabled: true, range: { min: -25, max: 25 } },
      randomScale: { enabled: true, range: { min: 0.7, max: 1.3 } },
      brightness: { enabled: true, range: { min: -25, max: 25 } },
      contrast: { enabled: true, range: { min: -20, max: 20 } },
      saturation: { enabled: true, range: { min: -30, max: 30 } },
      blur: { enabled: true, range: { min: 0.5, max: 2.0 } },
      gaussianNoise: { enabled: false },
    },
  },
  {
    id: 'noise_sensor',
    name: 'Sensor Noise & Lighting',
    description: 'Gaussian sensor noise, exposure changes, and motion blur simulation.',
    count: 8,
    flipEnabled: false,
    flipProb: 0,
    techniques: {
      gaussianNoise: { enabled: true, range: { min: 10, max: 35 } },
      blur: { enabled: true, range: { min: 0.8, max: 3.0 } },
      exposure: { enabled: true, range: { min: -1.5, max: 1.5 } },
      rotate: { enabled: false },
      randomScale: { enabled: false },
    },
  },
];
