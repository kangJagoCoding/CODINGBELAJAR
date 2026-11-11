import React, { useState } from 'react';
import {
  Sliders,
  RotateCw,
  Crop,
  Maximize2,
  Sun,
  Eye,
  Bookmark,
  Code,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import {
  TechniqueState,
  EditActionType,
  SupportedExt,
  FlipConfig,
  PRESETS,
  buildPayload,
} from '../utils/augmentationSchema';
import { generateCurlCommand } from '../utils/apiService';

interface ConfigViewProps {
  techniques: Record<EditActionType, TechniqueState>;
  setTechniques: React.Dispatch<
    React.SetStateAction<Record<EditActionType, TechniqueState>>
  >;
  globalCount: number;
  setGlobalCount: (cnt: number) => void;
  globalExt: SupportedExt;
  setGlobalExt: (ext: SupportedExt) => void;
  flip: FlipConfig;
  setFlip: React.Dispatch<React.SetStateAction<FlipConfig>>;
  backendUrl: string;
  imageFiles: File[];
  annotationFiles: File[];
  onBackToUpload: () => void;
  onProceedToTransform: () => void;
}

export const ConfigView: React.FC<ConfigViewProps> = ({
  techniques,
  setTechniques,
  globalCount,
  setGlobalCount,
  globalExt,
  setGlobalExt,
  flip,
  setFlip,
  backendUrl,
  imageFiles,
  annotationFiles,
  onBackToUpload,
  onProceedToTransform,
}) => {
  const [activeTabCategory, setActiveTabCategory] = useState<
    'all' | 'geometric' | 'color' | 'filter'
  >('all');
  const [showJsonInspector, setShowJsonInspector] = useState(false);

  const { payload, errors: payloadErrors } = buildPayload(
    techniques,
    globalCount,
    globalExt,
    flip
  );

  const enabledCount = Object.values(techniques).filter((t) => t.enabled).length;
  const totalOutputs = imageFiles.length * globalCount;

  // Toggle technique
  const handleToggle = (action: EditActionType) => {
    setTechniques((prev) => ({
      ...prev,
      [action]: {
        ...prev[action],
        enabled: !prev[action].enabled,
      },
    }));
  };

  // Update min/max range
  const handleRangeChange = (
    action: EditActionType,
    field: 'min' | 'max',
    val: number
  ) => {
    setTechniques((prev) => {
      const current = prev[action];
      if (!current.range) return prev;
      return {
        ...prev,
        [action]: {
          ...current,
          range: {
            ...current.range,
            [field]: val,
          },
        },
      };
    });
  };

  // Set symmetrical rotation (e.g. -deg to +deg)
  const handleSetSymmetricRotation = (deg: number) => {
    setTechniques((prev) => ({
      ...prev,
      rotate: {
        ...prev.rotate,
        enabled: true,
        range: { min: -Math.abs(deg), max: Math.abs(deg) },
      },
    }));
  };

  // Apply preset
  const handleApplyPreset = (presetId: string) => {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    if (preset.id === 'reset') {
      setFlip({ enabled: false, probability: 0 });
    } else {
      setGlobalCount(Math.max(preset.count, Object.keys(preset.techniques).length));
      setFlip({
        enabled: preset.flipEnabled,
        probability: preset.flipProb,
      });
    }

    setTechniques((prev) => {
      const next = structuredClone(prev);
      // Turn off all first
      Object.keys(next).forEach((k) => {
        next[k as EditActionType].enabled = false;
      });

      // Turn on preset techniques
      for (const [actionStr, overrides] of Object.entries(preset.techniques)) {
        const action = actionStr as EditActionType;
        if (next[action]) {
          next[action] = {
            ...next[action],
            ...overrides,
          };
        }
      }
      return next;
    });
  };

  const curlCommand = generateCurlCommand(
    backendUrl,
    imageFiles,
    annotationFiles,
    payload
  );

  const categories = [
    { id: 'all', label: `All Techniques (${Object.keys(techniques).length})` },
    { id: 'geometric', label: 'Geometric (YOLO BBox Synced)' },
    { id: 'color', label: 'Color & Lighting' },
    { id: 'filter', label: 'Filters & Noise' },
  ];

  const filteredTechniques = Object.values(techniques).filter((t) => {
    if (activeTabCategory === 'all') return true;
    return t.category === activeTabCategory;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner: Global Settings & Presets */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-600" />
                Augmentation Configuration
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700">
                {enabledCount} Selected
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Select augmentation methods and drag sliders to define ranges. Output format is configured here once for all outputs.
            </p>
          </div>

          {/* Preset Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <Bookmark className="w-3.5 h-3.5" /> Presets:
            </span>
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleApplyPreset(p.id)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  p.id === 'reset'
                    ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                    : 'bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border-slate-200'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Global Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {/* Control 1: Output count */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800">
                Count per Source Image
              </label>
              <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                {globalCount}
              </span>
            </div>
            <input
              type="range"
              min={Math.max(1, enabledCount || 1)}
              max={50}
              value={globalCount}
              onChange={(e) => setGlobalCount(parseInt(e.target.value, 10))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1">
              <span>Min: {Math.max(1, enabledCount)} (1-50)</span>
              <span>
                Total: <strong>{totalOutputs}</strong> images
              </span>
            </div>
          </div>

          {/* Control 2: Output Format (Configured once at the top) */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <label className="block text-xs font-bold text-slate-800 mb-2">
              Output Format (`ext`)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['png', 'jpg', 'jpeg'] as SupportedExt[]).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setGlobalExt(fmt)}
                  className={`py-1.5 text-xs font-mono font-semibold uppercase rounded-lg border transition-all ${
                    globalExt === fmt
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  .{fmt}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Format for all generated images inside results.zip.
            </p>
          </div>

          {/* Control 3: Vertical Flip Probability */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={flip.enabled}
                  onChange={(e) =>
                    setFlip((prev) => ({
                      ...prev,
                      enabled: e.target.checked,
                      probability: e.target.checked && prev.probability === 0 ? 0.25 : prev.probability,
                    }))
                  }
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
                Vertical Flip (`flip`)
              </label>
              {flip.enabled && (
                <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  {Math.round(flip.probability * 100)}%
                </span>
              )}
            </div>
            {flip.enabled ? (
              <>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={flip.probability}
                  onChange={(e) =>
                    setFlip((prev) => ({
                      ...prev,
                      probability: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Chance of flipping each result. Inverts YOLO Y box coordinates.
                </p>
              </>
            ) : (
              <p className="text-[11px] text-slate-400 mt-2 italic">
                Disabled (0% flip). Check box to enable vertical flip variance.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveTabCategory(cat.id as any)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTabCategory === cat.id
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Techniques List / Grid with Real Interactive Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTechniques.map((tech) => {
          const isEnabled = tech.enabled;

          return (
            <div
              key={tech.action}
              className={`rounded-xl border transition-all p-5 ${
                isEnabled
                  ? 'bg-white border-indigo-300 shadow-sm ring-1 ring-indigo-200'
                  : 'bg-slate-50/50 border-slate-200 opacity-75 hover:opacity-100'
              }`}
            >
              {/* Header with Checkbox */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={() => handleToggle(tech.action)}
                    className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4.5 h-4.5 cursor-pointer"
                  />
                  <div>
                    <span className="text-sm font-bold text-slate-900 block">
                      {tech.label}
                    </span>
                    <span className="text-xs text-slate-500 leading-tight block mt-0.5">
                      {tech.description}
                    </span>
                  </div>
                </label>

                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                    tech.category === 'geometric'
                      ? 'bg-sky-50 text-sky-700'
                      : tech.category === 'color'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-purple-50 text-purple-700'
                  }`}
                >
                  {tech.category}
                </span>
              </div>

              {/* Slider Controls */}
              {isEnabled && (
                <div className="mt-4 space-y-4">
                  {/* Specialized Bidirectional Rotation Slider */}
                  {tech.action === 'rotate' && tech.range && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700">
                          Rotation Range:
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            {tech.range.min}° to {tech.range.max}°
                          </span>
                        </div>
                      </div>

                      {/* Min Angle Slider (Rotate Left / CCW) */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-slate-600">
                          <span className="flex items-center gap-1 font-medium text-rose-700">
                            <RotateCcw className="w-3 h-3" /> Min Angle (Left / CCW):
                          </span>
                          <span className="font-mono font-bold">{tech.range.min}°</span>
                        </div>
                        <input
                          type="range"
                          min={-180}
                          max={tech.range.max}
                          step={1}
                          value={tech.range.min}
                          onChange={(e) =>
                            handleRangeChange('rotate', 'min', parseInt(e.target.value, 10))
                          }
                          className="w-full accent-rose-600 cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>-180° (Max Left)</span>
                          <span>0° (Center)</span>
                          <span>{tech.range.max}° (Upper limit)</span>
                        </div>
                      </div>

                      {/* Max Angle Slider (Rotate Right / CW) */}
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-[11px] text-slate-600">
                          <span className="flex items-center gap-1 font-medium text-indigo-700">
                            <RotateCw className="w-3 h-3" /> Max Angle (Right / CW):
                          </span>
                          <span className="font-mono font-bold">{tech.range.max}°</span>
                        </div>
                        <input
                          type="range"
                          min={tech.range.min}
                          max={180}
                          step={1}
                          value={tech.range.max}
                          onChange={(e) =>
                            handleRangeChange('rotate', 'max', parseInt(e.target.value, 10))
                          }
                          className="w-full accent-indigo-600 cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>{tech.range.min}° (Lower limit)</span>
                          <span>0° (Center)</span>
                          <span>+180° (Max Right)</span>
                        </div>
                      </div>

                      {/* Quick angle symmetry shortcuts */}
                      <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-semibold text-slate-400">Quick:</span>
                        {[5, 15, 30, 45, 90].map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => handleSetSymmetricRotation(d)}
                            className="px-2 py-0.5 text-[11px] font-mono bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded border border-slate-200 transition-colors"
                          >
                            ±{d}°
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => handleSetSymmetricRotation(0)}
                          className="px-2 py-0.5 text-[11px] font-mono bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition-colors text-slate-600"
                        >
                          Reset 0°
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Standard Range Sliders (Brightness, Contrast, Saturation, Hue, Exposure, Scale, Blur, Noise) */}
                  {tech.action !== 'rotate' && tech.action !== 'randomCrop' && tech.action !== 'resize' && tech.range && tech.limits && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700">
                          Range Adjustment:
                        </span>
                        <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                          {tech.range.min}{tech.limits.unit} to {tech.range.max}{tech.limits.unit}
                        </span>
                      </div>

                      {/* Min Slider */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-slate-600">
                          <span>Minimum:</span>
                          <span className="font-mono font-bold">
                            {tech.range.min}{tech.limits.unit}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={tech.limits.minAllowed}
                          max={tech.range.max}
                          step={tech.limits.step}
                          value={tech.range.min}
                          onChange={(e) =>
                            handleRangeChange(
                              tech.action,
                              'min',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-full accent-slate-700 cursor-pointer"
                        />
                      </div>

                      {/* Max Slider */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-slate-600">
                          <span>Maximum:</span>
                          <span className="font-mono font-bold">
                            {tech.range.max}{tech.limits.unit}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={tech.range.min}
                          max={tech.limits.maxAllowed}
                          step={tech.limits.step}
                          value={tech.range.max}
                          onChange={(e) =>
                            handleRangeChange(
                              tech.action,
                              'max',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-full accent-indigo-600 cursor-pointer"
                        />
                      </div>

                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Min Allowed: {tech.limits.minAllowed}{tech.limits.unit}</span>
                        <span>Max Allowed: {tech.limits.maxAllowed}{tech.limits.unit}</span>
                      </div>
                    </div>
                  )}

                  {/* Random Crop Sliders */}
                  {tech.action === 'randomCrop' && tech.randomCrop && (
                    <div className="space-y-3">
                      <div className="text-xs font-semibold text-slate-700">
                        Fractional Crop Ratio Sliders (0.01 to 1.0):
                      </div>

                      {/* Width Crop Ratio Slider */}
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                        <div className="flex justify-between text-[11px] text-slate-700 font-medium">
                          <span>Width Crop Ratio Range:</span>
                          <span className="font-mono font-bold text-indigo-600">
                            {tech.randomCrop.width.min.toFixed(2)} - {tech.randomCrop.width.max.toFixed(2)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] text-slate-500 block">Min Width</span>
                            <input
                              type="range"
                              min={0.01}
                              max={tech.randomCrop.width.max}
                              step={0.05}
                              value={tech.randomCrop.width.min}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value);
                                setTechniques((prev) => ({
                                  ...prev,
                                  randomCrop: {
                                    ...prev.randomCrop,
                                    randomCrop: {
                                      ...prev.randomCrop.randomCrop!,
                                      width: { ...prev.randomCrop.randomCrop!.width, min: v },
                                    },
                                  },
                                }));
                              }}
                              className="w-full accent-indigo-600 cursor-pointer"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">Max Width</span>
                            <input
                              type="range"
                              min={tech.randomCrop.width.min}
                              max={1.0}
                              step={0.05}
                              value={tech.randomCrop.width.max}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value);
                                setTechniques((prev) => ({
                                  ...prev,
                                  randomCrop: {
                                    ...prev.randomCrop,
                                    randomCrop: {
                                      ...prev.randomCrop.randomCrop!,
                                      width: { ...prev.randomCrop.randomCrop!.width, max: v },
                                    },
                                  },
                                }));
                              }}
                              className="w-full accent-indigo-600 cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Height Crop Ratio Slider */}
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                        <div className="flex justify-between text-[11px] text-slate-700 font-medium">
                          <span>Height Crop Ratio Range:</span>
                          <span className="font-mono font-bold text-indigo-600">
                            {tech.randomCrop.height.min.toFixed(2)} - {tech.randomCrop.height.max.toFixed(2)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] text-slate-500 block">Min Height</span>
                            <input
                              type="range"
                              min={0.01}
                              max={tech.randomCrop.height.max}
                              step={0.05}
                              value={tech.randomCrop.height.min}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value);
                                setTechniques((prev) => ({
                                  ...prev,
                                  randomCrop: {
                                    ...prev.randomCrop,
                                    randomCrop: {
                                      ...prev.randomCrop.randomCrop!,
                                      height: { ...prev.randomCrop.randomCrop!.height, min: v },
                                    },
                                  },
                                }));
                              }}
                              className="w-full accent-indigo-600 cursor-pointer"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">Max Height</span>
                            <input
                              type="range"
                              min={tech.randomCrop.height.min}
                              max={1.0}
                              step={0.05}
                              value={tech.randomCrop.height.max}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value);
                                setTechniques((prev) => ({
                                  ...prev,
                                  randomCrop: {
                                    ...prev.randomCrop,
                                    randomCrop: {
                                      ...prev.randomCrop.randomCrop!,
                                      height: { ...prev.randomCrop.randomCrop!.height, max: v },
                                    },
                                  },
                                }));
                              }}
                              className="w-full accent-indigo-600 cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Fixed Resize Sliders */}
                  {tech.action === 'resize' && tech.resize && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-slate-700">
                          <span>Width:</span>
                          <span className="font-mono font-bold text-indigo-600">
                            {tech.resize.width === 0 ? '0px (Preserve aspect)' : `${tech.resize.width}px`}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={1200}
                          step={10}
                          value={tech.resize.width}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10) || 0;
                            setTechniques((prev) => ({
                              ...prev,
                              resize: {
                                ...prev.resize,
                                resize: { ...prev.resize.resize!, width: v },
                              },
                            }));
                          }}
                          className="w-full accent-indigo-600 cursor-pointer"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-slate-700">
                          <span>Height:</span>
                          <span className="font-mono font-bold text-indigo-600">
                            {tech.resize.height === 0 ? '0px (Preserve aspect)' : `${tech.resize.height}px`}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={1200}
                          step={10}
                          value={tech.resize.height}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10) || 0;
                            setTechniques((prev) => ({
                              ...prev,
                              resize: {
                                ...prev.resize,
                                resize: { ...prev.resize.resize!, height: v },
                              },
                            }));
                          }}
                          className="w-full accent-indigo-600 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Validation Warning if any */}
      {payloadErrors.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
          <div className="font-bold flex items-center gap-1 text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600" /> Configuration
            Requirements:
          </div>
          <ul className="list-disc list-inside">
            {payloadErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* API Inspector Drawer / Toggle */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => setShowJsonInspector(!showJsonInspector)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-slate-600" />
            <span className="text-xs font-bold text-slate-800">
              Go API Inspector (JSON Metadata & curl command)
            </span>
          </div>
          <span className="text-xs text-indigo-600 font-semibold">
            {showJsonInspector ? 'Hide Code' : 'View Payload Code'}
          </span>
        </button>

        {showJsonInspector && (
          <div className="p-4 border-t border-slate-200 bg-slate-950 text-slate-200 space-y-4">
            <div>
              <div className="text-[11px] font-mono text-slate-400 mb-1">
                Metadata JSON (multipart field "metadata"):
              </div>
              <pre className="text-xs font-mono bg-slate-900 p-3 rounded-lg overflow-x-auto text-emerald-400">
                {JSON.stringify(payload, null, 2)}
              </pre>
            </div>

            <div>
              <div className="text-[11px] font-mono text-slate-400 mb-1">
                Equivalent curl command:
              </div>
              <pre className="text-xs font-mono bg-slate-900 p-3 rounded-lg overflow-x-auto text-sky-300">
                {curlCommand}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBackToUpload}
          className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Files
        </button>

        <button
          type="button"
          disabled={payloadErrors.length > 0}
          onClick={onProceedToTransform}
          className={`px-5 py-2.5 text-xs font-semibold rounded-lg flex items-center gap-2 shadow-xs transition-all ${
            payloadErrors.length === 0
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
              : 'bg-slate-300 text-slate-500 cursor-not-allowed'
          }`}
        >
          Proceed to Step 3: Transform & Results
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
