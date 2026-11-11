export interface PairedFile {
  id: string;
  stem: string;
  imageFile: File;
  annotationFile?: File;
  imageDimensions?: { width: number; height: number };
  imageStatus: 'ok' | 'oversized_kb' | 'oversized_dim';
  annotationStatus?: 'ok' | 'oversized_kb' | 'invalid_yolo';
  annotationCount?: number;
}

export interface ValidationSummary {
  isValid: boolean;
  totalImages: number;
  totalAnnotations: number;
  hasAnnotations: boolean;
  matchedPairs: number;
  unmatchedImages: string[];
  unmatchedAnnotations: string[];
  errors: string[];
  warnings: string[];
}

export function getFileStem(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return filename;
  return filename.substring(0, lastDot);
}

export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filename.substring(lastDot + 1).toLowerCase();
}

export function isImageFile(file: File | { name: string }): boolean {
  const ext = getFileExtension(file.name);
  return ['jpg', 'jpeg', 'png'].includes(ext);
}

export function isAnnotationFile(file: File | { name: string }): boolean {
  const ext = getFileExtension(file.name);
  return ext === 'txt';
}

/**
 * Validates a single YOLO line (format: class_id x_center y_center width height)
 * Non-empty line must have >= 5 tokens, class_id >= 0, and coords in [0, 1] range.
 */
export function validateYoloContent(content: string): { isValid: boolean; boxCount: number; error?: string } {
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  let boxCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i].split(/\s+/);
    if (parts.length < 5) {
      return { isValid: false, boxCount, error: `Line ${i + 1}: Expected at least 5 tokens (class x y w h)` };
    }
    const classId = parseInt(parts[0], 10);
    if (isNaN(classId) || classId < 0) {
      return { isValid: false, boxCount, error: `Line ${i + 1}: Class ID must be non-negative integer` };
    }
    const x = parseFloat(parts[1]);
    const y = parseFloat(parts[2]);
    const w = parseFloat(parts[3]);
    const h = parseFloat(parts[4]);
    if ([x, y, w, h].some(isNaN)) {
      return { isValid: false, boxCount, error: `Line ${i + 1}: Coordinates must be valid numbers` };
    }
    if (x < 0 || x > 1 || y < 0 || y > 1 || w < 0 || w > 1 || h < 0 || h > 1) {
      return { isValid: false, boxCount, error: `Line ${i + 1}: Coordinates must be normalized between 0 and 1` };
    }
    boxCount++;
  }

  return { isValid: true, boxCount };
}

/**
 * Checks folder structure when uploading a directory.
 * Returns sorted images and annotations if structured inside "image" and "annotation" folders,
 * or from flat directory.
 */
export function parseDirectoryFiles(files: File[]): {
  images: File[];
  annotations: File[];
  detectedImageFolder: boolean;
  detectedAnnotationFolder: boolean;
  notes: string[];
} {
  const notes: string[] = [];
  let detectedImageFolder = false;
  let detectedAnnotationFolder = false;

  const images: File[] = [];
  const annotations: File[] = [];

  for (const file of files) {
    const relPath = (file as any).webkitRelativePath || file.name;
    const parts = relPath.split(/[\/\\]/);
    const parentFolder = parts.length > 1 ? parts[parts.length - 2].toLowerCase() : '';

    if (parentFolder === 'image' || parentFolder === 'images') {
      detectedImageFolder = true;
      if (isImageFile(file)) images.push(file);
    } else if (parentFolder === 'annotation' || parentFolder === 'annotations') {
      detectedAnnotationFolder = true;
      if (isAnnotationFile(file)) annotations.push(file);
    } else {
      if (isImageFile(file)) images.push(file);
      else if (isAnnotationFile(file)) annotations.push(file);
    }
  }

  if (detectedImageFolder && detectedAnnotationFolder) {
    notes.push('Detected dual folders: "image" and "annotation" successfully.');
  }

  return {
    images,
    annotations,
    detectedImageFolder,
    detectedAnnotationFolder,
    notes,
  };
}

/**
 * Validates and pairs image files with optional annotation files based on exact stem matching.
 * e.g., image_1.png pairs with image_1.txt
 */
export function matchAndValidatePairs(
  imageFiles: File[],
  annotationFiles: File[]
): {
  pairs: PairedFile[];
  summary: ValidationSummary;
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Limit check
  if (imageFiles.length === 0) {
    errors.push('No images uploaded. Please upload at least 1 image.');
  } else if (imageFiles.length > 50) {
    errors.push(`Maximum 50 source images allowed by the Go backend (found ${imageFiles.length}).`);
  }

  const annotationsByStem = new Map<string, File>();
  for (const annot of annotationFiles) {
    const stem = getFileStem(annot.name);
    annotationsByStem.set(stem, annot);
  }

  const imagesByStem = new Map<string, File>();
  for (const img of imageFiles) {
    const stem = getFileStem(img.name);
    imagesByStem.set(stem, img);
  }

  const unmatchedImages: string[] = [];
  const unmatchedAnnotations: string[] = [];
  const pairs: PairedFile[] = [];

  const hasAnnotations = annotationFiles.length > 0;

  // Strict backend rule: If ANY annotation is provided, every image must have exactly one matching annotation
  if (hasAnnotations) {
    if (imageFiles.length !== annotationFiles.length) {
      errors.push(
        `Annotation count mismatch: ${imageFiles.length} image(s) vs ${annotationFiles.length} annotation(s). If annotations are provided, count and names must match exactly.`
      );
    }

    for (const [stem, annot] of annotationsByStem.entries()) {
      if (!imagesByStem.has(stem)) {
        unmatchedAnnotations.push(annot.name);
      }
    }
  }

  for (const img of imageFiles) {
    const stem = getFileStem(img.name);
    const annot = annotationsByStem.get(stem);

    let imgStatus: 'ok' | 'oversized_kb' = 'ok';
    if (img.size > 400 * 1024) {
      imgStatus = 'oversized_kb';
      warnings.push(`Image "${img.name}" is ${Math.round(img.size / 1024)} KiB (exceeds recommended 400 KiB limit).`);
    }

    let annotStatus: 'ok' | 'oversized_kb' | undefined = undefined;
    if (annot) {
      annotStatus = 'ok';
      if (annot.size > 400 * 1024) {
        annotStatus = 'oversized_kb';
        warnings.push(`Annotation "${annot.name}" exceeds 400 KiB limit.`);
      }
    } else if (hasAnnotations) {
      unmatchedImages.push(img.name);
    }

    pairs.push({
      id: `${stem}-${Math.random().toString(36).substring(2, 7)}`,
      stem,
      imageFile: img,
      annotationFile: annot,
      imageStatus: imgStatus,
      annotationStatus: annotStatus,
    });
  }

  if (hasAnnotations && unmatchedImages.length > 0) {
    errors.push(
      `Missing annotations for: ${unmatchedImages.slice(0, 3).join(', ')}${
        unmatchedImages.length > 3 ? ` and ${unmatchedImages.length - 3} more` : ''
      }. File naming format must match: e.g. "image_1.png" with "image_1.txt".`
    );
  }

  if (unmatchedAnnotations.length > 0) {
    errors.push(
      `Orphan annotations with no matching image: ${unmatchedAnnotations.slice(0, 3).join(', ')}`
    );
  }

  const isValid = errors.length === 0 && imageFiles.length > 0;

  return {
    pairs,
    summary: {
      isValid,
      totalImages: imageFiles.length,
      totalAnnotations: annotationFiles.length,
      hasAnnotations,
      matchedPairs: pairs.filter(p => p.annotationFile).length,
      unmatchedImages,
      unmatchedAnnotations,
      errors,
      warnings,
    },
  };
}
