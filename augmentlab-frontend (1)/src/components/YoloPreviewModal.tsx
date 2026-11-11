import React, { useEffect, useRef, useState } from 'react';
import { X, Layers, Tag, FileText } from 'lucide-react';
import { parseYoloText, yoloToPixelBox, getClassColor, YoloBox } from '../utils/yoloParser';

interface YoloPreviewModalProps {
  imageFile?: File;
  imageSrc?: string;
  annotationContent?: string;
  stem: string;
  onClose: () => void;
}

export const YoloPreviewModal: React.FC<YoloPreviewModalProps> = ({
  imageFile,
  imageSrc,
  annotationContent,
  stem,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [boxes, setBoxes] = useState<YoloBox[]>([]);
  const [imgDims, setImgDims] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  useEffect(() => {
    const parsed = annotationContent ? parseYoloText(annotationContent) : [];
    setBoxes(parsed);

    const isCreatedUrl = !imageSrc && imageFile;
    const imgUrl = imageSrc || (imageFile ? URL.createObjectURL(imageFile) : '');
    if (!imgUrl) return;

    const img = new Image();
    img.src = imgUrl;

    img.onload = () => {
      setImgDims({ width: img.naturalWidth, height: img.naturalHeight });
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Draw bounding boxes
      for (const box of parsed) {
        const pixelBox = yoloToPixelBox(box, canvas.width, canvas.height);
        const color = getClassColor(box.classId);

        // Box border
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(2, Math.round(canvas.width / 200));
        ctx.strokeRect(pixelBox.x, pixelBox.y, pixelBox.width, pixelBox.height);

        // Translucent fill
        ctx.fillStyle = `${color}25`;
        ctx.fillRect(pixelBox.x, pixelBox.y, pixelBox.width, pixelBox.height);

        // Label tag
        if (showLabels) {
          const labelText = `ID ${box.classId}`;
          const fontSize = Math.max(12, Math.round(canvas.width / 35));
          ctx.font = `600 ${fontSize}px Inter, sans-serif`;
          const textMetrics = ctx.measureText(labelText);
          const padding = 4;
          const bgW = textMetrics.width + padding * 2;
          const bgH = fontSize + padding * 2;

          ctx.fillStyle = color;
          ctx.fillRect(pixelBox.x, Math.max(0, pixelBox.y - bgH), bgW, bgH);

          ctx.fillStyle = '#ffffff';
          ctx.fillText(labelText, pixelBox.x + padding, Math.max(0, pixelBox.y - bgH) + fontSize);
        }
      }
    };

    return () => {
      if (isCreatedUrl && imgUrl) {
        URL.revokeObjectURL(imgUrl);
      }
    };
  }, [imageFile, annotationContent, showLabels]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="YOLO Bounding Box Inspector"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                YOLO Bounding Box Inspector: <span className="font-mono text-indigo-600">{stem}</span>
              </h3>
              <p className="text-xs text-slate-500">
                {imgDims.width}×{imgDims.height}px • {boxes.length} bounding box(es) detected
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowLabels(!showLabels)}
              className={`text-xs px-2.5 py-1 rounded-md font-medium border flex items-center gap-1 transition-colors ${
                showLabels
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : 'bg-white border-slate-300 text-slate-600'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              {showLabels ? 'Hide Labels' : 'Show Labels'}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto">
          {/* Canvas Display */}
          <div className="md:col-span-2 flex flex-col items-center justify-center bg-slate-900 rounded-lg p-2 min-h-[300px] overflow-hidden">
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-[60vh] object-contain rounded shadow-lg"
            />
          </div>

          {/* YOLO Annotation Info & Raw Text */}
          <div className="space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                Raw YOLO Annotation (.txt)
              </div>
              {annotationContent ? (
                <div className="bg-slate-950 text-slate-200 font-mono text-xs p-3 rounded-lg overflow-x-auto max-h-[220px] border border-slate-800">
                  <pre className="whitespace-pre">{annotationContent}</pre>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-500 italic">
                  No annotation file paired for this image.
                </div>
              )}
            </div>

            {/* Boxes Breakdown */}
            <div>
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Classes Found ({boxes.length})
              </div>
              {boxes.length > 0 ? (
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {boxes.map((b, idx) => {
                    const color = getClassColor(b.classId);
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded border border-slate-200"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="font-semibold text-slate-800">Class {b.classId}</span>
                        </div>
                        <span className="font-mono text-[11px] text-slate-500">
                          {b.width.toFixed(2)}×{b.height.toFixed(2)} @ ({b.xCenter.toFixed(2)}, {b.yCenter.toFixed(2)})
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No bounding boxes.</p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors"
            >
              Done Inspecting
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
