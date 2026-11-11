import JSZip from 'jszip';
import { AugmentationRequestPayload } from './augmentationSchema';
import { parseYoloText, formatYoloText, YoloBox } from './yoloParser';
import { getFileStem } from './fileValidation';

export interface UnpackedResultItem {
  id: string;
  sourceFolder: string;
  filename: string;
  imageBlobUrl: string;
  annotationContent?: string;
  boxes?: YoloBox[];
  sizeKb: number;
}

export interface TransformResultData {
  zipBlob: Blob;
  zipSizeKb: number;
  unpackedItems: UnpackedResultItem[];
  sourceCount: number;
  generatedCount: number;
  durationMs: number;
}

/**
 * Generates the exact curl command for the user to copy
 */
export function generateCurlCommand(
  backendUrl: string,
  images: File[],
  annotations: File[],
  metadata: AugmentationRequestPayload
): string {
  const url = `${backendUrl.replace(/\/+$/, '')}/images/transform`;
  const parts: string[] = [`curl -X POST "${url}"`];

  for (const img of images) {
    parts.push(`  -F "image=@./${img.name}"`);
  }

  for (const annot of annotations) {
    parts.push(`  -F "annotation=@./${annot.name}"`);
  }

  const jsonStr = JSON.stringify(metadata).replace(/"/g, '\\"');
  parts.push(`  -F 'metadata=${jsonStr}'`);
  parts.push(`  --output results.zip`);

  return parts.join(' \\\n');
}

/**
 * Sends the real multipart/form-data request to the Go backend at http://localhost:3001/images/transform
 */
export async function sendTransformRequest(
  backendUrl: string,
  images: File[],
  annotations: File[],
  metadata: AugmentationRequestPayload,
  signal?: AbortSignal
): Promise<{ blob: Blob; durationMs: number }> {
  const startTime = performance.now();
  const url = `${backendUrl.replace(/\/+$/, '')}/images/transform`;

  const formData = new FormData();

  // Repeated 'image' fields
  for (const img of images) {
    formData.append('image', img, img.name);
  }

  // Repeated 'annotation' fields (if any)
  for (const annot of annotations) {
    formData.append('annotation', annot, annot.name);
  }

  // JSON string 'metadata'
  formData.append('metadata', JSON.stringify(metadata));

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      body: formData,
      signal,
    });
  } catch (err: any) {
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    if (isHttps && url.startsWith('http://')) {
      throw new Error(
        `HTTPS Mixed Content Block: Browser prevented connecting to insecure ${url} from an HTTPS page. Run frontend locally on http://localhost:3000 or use the built-in simulator.`
      );
    }
    throw new Error(
      `Cannot connect to Go backend at ${url}. Ensure your Go executable is running on port 3001.`
    );
  }

  if (!response.ok) {
    let errText = '';
    try {
      errText = await response.text();
    } catch {
      errText = response.statusText;
    }
    throw new Error(
      `Backend responded with HTTP ${response.status} (${response.statusText}): ${errText || 'Unknown error'}`
    );
  }

  const blob = await response.blob();
  const durationMs = Math.round(performance.now() - startTime);

  return { blob, durationMs };
}

/**
 * Unpacks results.zip using JSZip to preview generated images and YOLO annotations
 */
export async function unpackZipResults(zipBlob: Blob): Promise<UnpackedResultItem[]> {
  const zip = await JSZip.loadAsync(zipBlob);
  const items: UnpackedResultItem[] = [];

  // Group files by path/base
  const imageEntries: { [key: string]: JSZip.JSZipObject } = {};
  const annotEntries: { [key: string]: JSZip.JSZipObject } = {};

  zip.forEach((relativePath, file) => {
    if (file.dir) return;
    const lower = relativePath.toLowerCase();
    if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
      imageEntries[relativePath] = file;
    } else if (lower.endsWith('.txt')) {
      annotEntries[relativePath] = file;
    }
  });

  const sortedKeys = Object.keys(imageEntries).sort();

  for (const imgPath of sortedKeys) {
    const imgFile = imageEntries[imgPath];
    const imgBlob = await imgFile.async('blob');
    const imageBlobUrl = URL.createObjectURL(imgBlob);

    // Look for matching txt entry (e.g., image_01/result_001.txt)
    const baseWithoutExt = imgPath.substring(0, imgPath.lastIndexOf('.'));
    const txtPath = `${baseWithoutExt}.txt`;

    let annotationContent: string | undefined = undefined;
    let boxes: YoloBox[] | undefined = undefined;

    if (annotEntries[txtPath]) {
      annotationContent = await annotEntries[txtPath].async('string');
      boxes = parseYoloText(annotationContent);
    }

    const pathParts = imgPath.split('/');
    const sourceFolder = pathParts.length > 1 ? pathParts[0] : 'root';
    const filename = pathParts[pathParts.length - 1];

    items.push({
      id: imgPath,
      sourceFolder,
      filename,
      imageBlobUrl,
      annotationContent,
      boxes,
      sizeKb: Math.round(imgBlob.size / 1024),
    });
  }

  return items;
}

/**
 * Client-side simulation fallback when testing offline or before running Go exe
 * Emulates the exact round-robin behavior, ZIP archive structure, and YOLO adjustments.
 */
export async function simulateTransformInBrowser(
  images: File[],
  annotations: File[],
  metadata: AugmentationRequestPayload,
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  const zip = new JSZip();
  const annotMap = new Map<string, string>();

  for (const annot of annotations) {
    const stem = getFileStem(annot.name);
    const text = await annot.text();
    annotMap.set(stem, text);
  }

  const totalResults = images.length * metadata.count;
  let completed = 0;

  for (let imgIdx = 0; imgIdx < images.length; imgIdx++) {
    const srcImg = images[imgIdx];
    const srcStem = getFileStem(srcImg.name);
    const folderName = `image_${String(imgIdx + 1).padStart(2, '0')}`;
    const rawAnnot = annotMap.get(srcStem);

    // Load source image into HTML Image object
    const imgUrl = URL.createObjectURL(srcImg);
    const htmlImg = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = imgUrl;
    });

    const origW = htmlImg.naturalWidth || 300;
    const origH = htmlImg.naturalHeight || 300;
    const origBoxes = rawAnnot ? parseYoloText(rawAnnot) : [];

    for (let r = 0; r < metadata.count; r++) {
      const editIndex = r % metadata.edits.length;
      const edit = metadata.edits[editIndex];

      const canvas = document.createElement('canvas');
      canvas.width = origW;
      canvas.height = origH;
      const ctx = canvas.getContext('2d')!;

      // Handle geometric or color transform
      let currentBoxes: YoloBox[] = origBoxes.map(b => ({ ...b }));

      ctx.save();

      // Check vertical flip first
      const doFlip = metadata.flip?.enabled && Math.random() < metadata.flip.probability;

      if (edit.action === 'rotate') {
        const deg = edit.range.min + Math.random() * (edit.range.max - edit.range.min);
        const rad = (deg * Math.PI) / 180;
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(rad);
        if (doFlip) ctx.scale(1, -1);
        ctx.drawImage(htmlImg, -origW / 2, -origH / 2);
      } else if (edit.action === 'brightness') {
        const adj = edit.range.min + Math.random() * (edit.range.max - edit.range.min);
        ctx.filter = `brightness(${100 + adj}%)`;
        if (doFlip) {
          ctx.translate(0, canvas.height);
          ctx.scale(1, -1);
        }
        ctx.drawImage(htmlImg, 0, 0);
      } else if (edit.action === 'contrast') {
        const adj = edit.range.min + Math.random() * (edit.range.max - edit.range.min);
        ctx.filter = `contrast(${100 + adj}%)`;
        if (doFlip) {
          ctx.translate(0, canvas.height);
          ctx.scale(1, -1);
        }
        ctx.drawImage(htmlImg, 0, 0);
      } else if (edit.action === 'hue') {
        const adj = edit.range.min + Math.random() * (edit.range.max - edit.range.min);
        ctx.filter = `hue-rotate(${adj}deg)`;
        if (doFlip) {
          ctx.translate(0, canvas.height);
          ctx.scale(1, -1);
        }
        ctx.drawImage(htmlImg, 0, 0);
      } else if (edit.action === 'blur') {
        const sigma = edit.range.min + Math.random() * (edit.range.max - edit.range.min);
        ctx.filter = `blur(${sigma}px)`;
        if (doFlip) {
          ctx.translate(0, canvas.height);
          ctx.scale(1, -1);
        }
        ctx.drawImage(htmlImg, 0, 0);
      } else if (edit.action === 'randomScale') {
        const factor = edit.range.min + Math.random() * (edit.range.max - edit.range.min);
        canvas.width = Math.round(origW * factor);
        canvas.height = Math.round(origH * factor);
        if (doFlip) {
          ctx.translate(0, canvas.height);
          ctx.scale(1, -1);
        }
        ctx.drawImage(htmlImg, 0, 0, canvas.width, canvas.height);
      } else {
        if (doFlip) {
          ctx.translate(0, canvas.height);
          ctx.scale(1, -1);
        }
        ctx.drawImage(htmlImg, 0, 0);
      }

      ctx.restore();

      // If vertical flipped, update box yCenter: new_yCenter = 1.0 - old_yCenter
      if (doFlip) {
        currentBoxes = currentBoxes.map(b => ({
          ...b,
          yCenter: Math.max(0, Math.min(1, 1.0 - b.yCenter)),
        }));
      }

      // Convert canvas to blob
      const mime = metadata.ext === 'png' ? 'image/png' : 'image/jpeg';
      const ext = metadata.ext;
      const resultBlob = await new Promise<Blob>(res =>
        canvas.toBlob(b => res(b || new Blob()), mime, 0.92)
      );

      const resultIndexStr = String(r + 1).padStart(3, '0');
      const imgFileName = `${folderName}/result_${resultIndexStr}.${ext}`;
      zip.file(imgFileName, resultBlob);

      if (rawAnnot) {
        const txtFileName = `${folderName}/result_${resultIndexStr}.txt`;
        const updatedText = formatYoloText(currentBoxes);
        zip.file(txtFileName, updatedText);
      }

      completed++;
      if (onProgress) onProgress(completed, totalResults);
    }

    URL.revokeObjectURL(imgUrl);
  }

  return await zip.generateAsync({ type: 'blob' });
}
