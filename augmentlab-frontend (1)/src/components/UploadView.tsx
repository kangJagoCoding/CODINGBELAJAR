import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  FolderUp,
  FileCheck2,
  AlertTriangle,
  XCircle,
  Sparkles,
  Trash2,
  Eye,
  CheckCircle2,
  FileText,
  ImageIcon,
  ArrowRight,
  Info,
} from 'lucide-react';
import {
  PairedFile,
  ValidationSummary,
  matchAndValidatePairs,
  parseDirectoryFiles,
  isImageFile,
  isAnnotationFile,
} from '../utils/fileValidation';
import { createSampleDataset } from '../utils/sampleData';
import { YoloPreviewModal } from './YoloPreviewModal';

interface UploadViewProps {
  imageFiles: File[];
  setImageFiles: (files: File[]) => void;
  annotationFiles: File[];
  setAnnotationFiles: (files: File[]) => void;
  pairs: PairedFile[];
  summary: ValidationSummary;
  onProceedToConfig: () => void;
}

export const UploadView: React.FC<UploadViewProps> = ({
  imageFiles,
  setImageFiles,
  annotationFiles,
  setAnnotationFiles,
  pairs,
  summary,
  onProceedToConfig,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const [inspectModal, setInspectModal] = useState<{
    imageFile: File;
    annotationContent?: string;
    stem: string;
  } | null>(null);

  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [folderNotice, setFolderNotice] = useState<string | null>(null);

  // Handle individual files selection
  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const incoming = Array.from(e.target.files);
    processIncomingFiles(incoming);
    e.target.value = '';
  };

  // Handle directory upload
  const handleFolderSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const incoming = Array.from(e.target.files);
    const parsed = parseDirectoryFiles(incoming);

    if (parsed.detectedImageFolder || parsed.detectedAnnotationFolder) {
      setFolderNotice(
        `Folder parsed: Found ${parsed.images.length} image(s) in 'image' and ${parsed.annotations.length} annotation(s) in 'annotation'.`
      );
    } else {
      setFolderNotice(
        `Folder parsed (flat): Found ${parsed.images.length} image(s) and ${parsed.annotations.length} annotation(s). Expected subfolders 'image' and 'annotation' for automatic categorization.`
      );
    }

    setImageFiles(parsed.images);
    setAnnotationFiles(parsed.annotations);
    e.target.value = '';
  };

  const processIncomingFiles = (files: File[]) => {
    const newImages: File[] = [];
    const newAnnotations: File[] = [];

    for (const f of files) {
      if (isImageFile(f)) {
        newImages.push(f);
      } else if (isAnnotationFile(f)) {
        newAnnotations.push(f);
      }
    }

    // Merge or replace
    const mergedImages = [...imageFiles, ...newImages].slice(0, 50);
    const mergedAnnotations = [...annotationFiles, ...newAnnotations].slice(0, 50);

    setImageFiles(mergedImages);
    setAnnotationFiles(mergedAnnotations);
  };

  // Load sample dataset
  const handleLoadSample = async () => {
    setIsLoadingSample(true);
    try {
      const sample = await createSampleDataset();
      setImageFiles(sample.images);
      setAnnotationFiles(sample.annotations);
      setFolderNotice('Loaded 3 sample synthetic images and matching YOLO annotations.');
    } finally {
      setIsLoadingSample(false);
    }
  };

  const handleClearAll = () => {
    setImageFiles([]);
    setAnnotationFiles([]);
    setFolderNotice(null);
  };

  const handleRemovePair = (pair: PairedFile) => {
    setImageFiles(imageFiles.filter((f) => f !== pair.imageFile));
    if (pair.annotationFile) {
      setAnnotationFiles(annotationFiles.filter((f) => f !== pair.annotationFile));
    }
  };

  const handleInspect = async (pair: PairedFile) => {
    let text: string | undefined = undefined;
    if (pair.annotationFile) {
      text = await pair.annotationFile.text();
    }
    setInspectModal({
      imageFile: pair.imageFile,
      annotationContent: text,
      stem: pair.stem,
    });
  };

  return (
    <div className="space-y-6">
      {/* Upload Action Hero */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-indigo-600" />
              Upload Source Dataset
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select image files (.png, .jpg) and optional YOLO annotation files (.txt) or an entire dataset folder.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleLoadSample}
              disabled={isLoadingSample}
              className="px-3.5 py-2 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              {isLoadingSample ? 'Generating Samples...' : 'Load Sample Dataset'}
            </button>
            {(imageFiles.length > 0 || annotationFiles.length > 0) && (
              <button
                type="button"
                onClick={handleClearAll}
                className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear All
              </button>
            )}
          </div>
        </div>

        {/* Dual Upload Cards: Individual Files & Folder Upload */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {/* Card 1: Individual Files Picker */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50/50 hover:bg-indigo-50/20 rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center group"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".png,.jpg,.jpeg,.txt"
              onChange={handleFilesSelected}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-slate-600 group-hover:text-indigo-600 group-hover:scale-105 transition-all mb-3">
              <UploadCloud className="w-6 h-6" />
            </div>
            <span className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600">
              Select Images & Annotations
            </span>
            <span className="text-xs text-slate-500 mt-1">
              Supports <code className="font-mono text-slate-700">.png</code>,{' '}
              <code className="font-mono text-slate-700">.jpg</code> and{' '}
              <code className="font-mono text-slate-700">.txt</code> (up to 50 files)
            </span>
            <span className="mt-3 text-[11px] font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
              Click to browse files
            </span>
          </div>

          {/* Card 2: Folder Upload Picker */}
          <div
            onClick={() => folderInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-sky-500 bg-slate-50/50 hover:bg-sky-50/20 rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center group"
          >
            <input
              ref={folderInputRef}
              type="file"
              multiple
              // @ts-expect-error webkitdirectory is standard in Chromium/Firefox
              webkitdirectory=""
              directory=""
              onChange={handleFolderSelected}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-slate-600 group-hover:text-sky-600 group-hover:scale-105 transition-all mb-3">
              <FolderUp className="w-6 h-6" />
            </div>
            <span className="text-sm font-semibold text-slate-800 group-hover:text-sky-600">
              Upload Dataset Folder
            </span>
            <span className="text-xs text-slate-500 mt-1">
              Checks for subfolders: <code className="font-mono text-slate-700">image/</code> and{' '}
              <code className="font-mono text-slate-700">annotation/</code>
            </span>
            <span className="mt-3 text-[11px] font-medium text-sky-600 bg-sky-50 px-2.5 py-1 rounded-full">
              Select directory
            </span>
          </div>
        </div>

        {/* Folder notice banner if any */}
        {folderNotice && (
          <div className="mt-4 p-3 bg-sky-50 border border-sky-200 rounded-lg text-xs text-sky-800 flex items-center gap-2">
            <Info className="w-4 h-4 text-sky-600 shrink-0" />
            <span>{folderNotice}</span>
          </div>
        )}
      </div>

      {/* Validation & Requirements Feedback Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900">
              Dataset Pairing & Backend Spec Validation
            </h3>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-md bg-slate-100 font-mono text-slate-700">
              Images: <strong>{summary.totalImages}</strong> / 50
            </span>
            <span className="px-2.5 py-1 rounded-md bg-slate-100 font-mono text-slate-700">
              Annotations: <strong>{summary.totalAnnotations}</strong>
            </span>
            <span
              className={`px-2.5 py-1 rounded-md font-semibold ${
                summary.isValid && summary.totalImages > 0
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {summary.isValid && summary.totalImages > 0
                ? 'Ready for Augmentation'
                : 'Awaiting Valid Files'}
            </span>
          </div>
        </div>

        {/* Rule highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
          <div className="flex items-start gap-2">
            <div className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
              1
            </div>
            <span>
              <strong>Pairing Rule:</strong> If annotations are included, counts must match exactly and stems must align (e.g.{' '}
              <code className="text-indigo-600 font-mono">image_1.png</code> &{' '}
              <code className="text-indigo-600 font-mono">image_1.txt</code>).
            </span>
          </div>

          <div className="flex items-start gap-2">
            <div className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
              2
            </div>
            <span>
              <strong>Size Limits:</strong> Up to 50 images. Backend limit is 400 KiB per image and &le; 500×500 px.
            </span>
          </div>

          <div className="flex items-start gap-2">
            <div className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
              3
            </div>
            <span>
              <strong>YOLO Sync:</strong> Geometric edits (rotate, crop, scale, flip) recalculate and clip bounding boxes automatically.
            </span>
          </div>
        </div>

        {/* Errors list */}
        {summary.errors.length > 0 && (
          <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-rose-900">
              <XCircle className="w-4 h-4 text-rose-600" />
              Validation Errors ({summary.errors.length}):
            </div>
            <ul className="list-disc list-inside space-y-0.5 pl-1">
              {summary.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Warnings list */}
        {summary.warnings.length > 0 && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
            <div className="font-semibold flex items-center gap-1.5 text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Notices / Backend Guidance:
            </div>
            <ul className="list-disc list-inside space-y-0.5 pl-1">
              {summary.warnings.slice(0, 3).map((w, i) => (
                <li key={i}>{w}</li>
              ))}
              {summary.warnings.length > 3 && (
                <li>...and {summary.warnings.length - 3} more file notices.</li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Paired Files Table & Previews */}
      {pairs.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <h3 className="text-sm font-bold text-slate-900">
              Paired Dataset Files ({pairs.length})
            </h3>
            <span className="text-xs text-slate-500">
              {summary.hasAnnotations
                ? `${summary.matchedPairs} of ${pairs.length} paired with YOLO annotations`
                : 'Images only (no annotations)'}
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
            {pairs.map((pair) => {
              const imgUrl = URL.createObjectURL(pair.imageFile);
              return (
                <div
                  key={pair.id}
                  className="p-3.5 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={imgUrl}
                      alt={pair.stem}
                      className="w-12 h-12 object-cover rounded-md border border-slate-200 bg-slate-100"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-900">
                          {pair.imageFile.name}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          ({Math.round(pair.imageFile.size / 1024)} KiB)
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        {pair.annotationFile ? (
                          <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1 font-mono">
                            <FileText className="w-3 h-3 text-emerald-600" />
                            {pair.annotationFile.name} ({Math.round(pair.annotationFile.size / 1024)} KiB)
                          </span>
                        ) : summary.hasAnnotations ? (
                          <span className="text-xs text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 flex items-center gap-1 font-mono">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            Missing {pair.stem}.txt
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            Image only
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {pair.annotationFile && (
                      <button
                        type="button"
                        onClick={() => handleInspect(pair)}
                        className="px-2.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md border border-indigo-200 flex items-center gap-1 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Inspect BBoxes
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemovePair(pair);
                      }}
                      aria-label={`Remove pair ${pair.stem}`}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-600">
              Ready to configure augmentation techniques.
            </span>
            <button
              type="button"
              disabled={!summary.isValid}
              onClick={onProceedToConfig}
              className={`px-5 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 shadow-xs transition-all ${
                summary.isValid
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              Continue to Step 2: Augmentation Config
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal for BBox Inspection */}
      {inspectModal && (
        <YoloPreviewModal
          imageFile={inspectModal.imageFile}
          annotationContent={inspectModal.annotationContent}
          stem={inspectModal.stem}
          onClose={() => setInspectModal(null)}
        />
      )}
    </div>
  );
};
