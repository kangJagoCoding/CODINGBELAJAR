export interface YoloBox {
  classId: number;
  xCenter: number;
  yCenter: number;
  width: number;
  height: number;
}

export interface PixelBox {
  classId: number;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
}

// Color palette for distinct YOLO classes (ezgif/detection style)
export const CLASS_COLORS = [
  '#ef4444', // red
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1', // indigo
];

export function getClassColor(classId: number): string {
  return CLASS_COLORS[Math.abs(classId) % CLASS_COLORS.length];
}

/**
 * Parses YOLO format string into structured YoloBox array
 */
export function parseYoloText(content: string): YoloBox[] {
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const boxes: YoloBox[] = [];

  for (const line of lines) {
    const parts = line.split(/\s+/);
    if (parts.length >= 5) {
      const classId = parseInt(parts[0], 10);
      const xCenter = parseFloat(parts[1]);
      const yCenter = parseFloat(parts[2]);
      const width = parseFloat(parts[3]);
      const height = parseFloat(parts[4]);

      if (!isNaN(classId) && !isNaN(xCenter) && !isNaN(yCenter) && !isNaN(width) && !isNaN(height)) {
        boxes.push({ classId, xCenter, yCenter, width, height });
      }
    }
  }

  return boxes;
}

/**
 * Converts normalized YOLO box to absolute pixel bounding box (top-left x, y, width, height)
 */
export function yoloToPixelBox(
  box: YoloBox,
  imageWidth: number,
  imageHeight: number
): PixelBox {
  const boxW = box.width * imageWidth;
  const boxH = box.height * imageHeight;
  const boxX = (box.xCenter * imageWidth) - (boxW / 2);
  const boxY = (box.yCenter * imageHeight) - (boxH / 2);

  return {
    classId: box.classId,
    x: Math.max(0, boxX),
    y: Math.max(0, boxY),
    width: Math.min(imageWidth, boxW),
    height: Math.min(imageHeight, boxH),
    label: `Class ${box.classId}`,
  };
}

/**
 * Serializes YoloBox array back to standard YOLO text format
 */
export function formatYoloText(boxes: YoloBox[]): string {
  return boxes
    .map(b => `${b.classId} ${b.xCenter.toFixed(6)} ${b.yCenter.toFixed(6)} ${b.width.toFixed(6)} ${b.height.toFixed(6)}`)
    .join('\n');
}
