import React, { useState } from 'react';
import {
  Download,
  Server,
  Zap,
  CheckCircle2,
  AlertCircle,
  FileArchive,
  RefreshCw,
  Eye,
  ArrowLeft,
  Copy,
  Check,
  SendHorizontal,
  Play,
  Terminal,
} from 'lucide-react';
import { AugmentationRequestPayload } from '../utils/augmentationSchema';
import {
  sendTransformRequest,
  simulateTransformInBrowser,
  unpackZipResults,
  UnpackedResultItem,
  generateCurlCommand,
} from '../utils/apiService';
import { YoloPreviewModal } from './YoloPreviewModal';

interface TransformViewProps {
  imageFiles: File[];
  annotationFiles: File[];
  payload: AugmentationRequestPayload;
  backendUrl: string;
  isDemoMode: boolean;
  onBackToConfig: () => void;
  onStartOver: () => void;
}

export const TransformView: React.FC<TransformViewProps> = ({
  imageFiles,
  annotationFiles,
  payload,
  backendUrl,
  isDemoMode,
  onBackToConfig,
  onStartOver,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);

  // Result state
  const [zipBlob, setZipBlob] = useState<Blob | null>(null);
  const [zipSizeKb, setZipSizeKb] = useState<number>(0);
  const [unpackedItems, setUnpackedItems] = useState<UnpackedResultItem[]>([]);
  const [durationMs, setDurationMs] = useState<number>(0);
  const [selectedFolderFilter, setSelectedFolderFilter] = useState<string>('all');
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [autoDownload, setAutoDownload] = useState(true);

  // Modal for inspecting result item
  const [inspectItem, setInspectItem] = useState<UnpackedResultItem | null>(null);

  const totalResultsExpected = imageFiles.length * payload.count;

  const handleStartTransform = async () => {
    setIsProcessing(true);
    setErrorMsg(null);
    setFallbackNotice(null);
    setProgressPercent(15);
    setProgressMsg('Packaging multipart form data (images, annotations, metadata)...');

    const start = performance.now();

    try {
      let finalBlob: Blob;

      if (isDemoMode) {
        setProgressMsg('Running client-side canvas simulation engine...');
        finalBlob = await simulateTransformInBrowser(
          imageFiles,
          annotationFiles,
          payload,
          (curr, tot) => {
            const pct = Math.round((curr / tot) * 75) + 15;
            setProgressPercent(pct);
            setProgressMsg(`Processing result ${curr} of ${tot}...`);
          }
        );
      } else {
        setProgressMsg(`Dispatching POST request to ${backendUrl}/images/transform...`);
        setProgressPercent(35);
        try {
          const res = await sendTransformRequest(
            backendUrl,
            imageFiles,
            annotationFiles,
            payload
          );
          finalBlob = res.blob;
        } catch (netErr: any) {
          // In cloud preview (HTTPS) or if the local Go exe is not yet started,
          // catch the fetch failure gracefully and fall back to the built-in simulator engine.
          console.warn('Backend connection notice:', netErr.message || netErr);
          setFallbackNotice(
            `Unable to reach Go server at ${backendUrl} directly from this session (${netErr.message || 'connection failed'}). Results were automatically generated using the built-in client simulation engine.`
          );
          setProgressMsg('Falling back to client-side augmentation engine...');
          setProgressPercent(50);
          finalBlob = await simulateTransformInBrowser(
            imageFiles,
            annotationFiles,
            payload,
            (curr, tot) => {
              const pct = Math.round((curr / tot) * 35) + 50;
              setProgressPercent(pct);
              setProgressMsg(`Client engine: generating result ${curr} of ${tot}...`);
            }
          );
        }
      }

      setProgressPercent(90);
      setProgressMsg('Unpacking results.zip for in-browser visual inspection...');

      const unpacked = await unpackZipResults(finalBlob);

      const elapsed = Math.round(performance.now() - start);
      setDurationMs(elapsed);
      setZipBlob(finalBlob);
      setZipSizeKb(Math.round(finalBlob.size / 1024));
      setUnpackedItems(unpacked);
      setProgressPercent(100);
      setProgressMsg('Transformation completed successfully!');

      if (autoDownload) {
        triggerBlobDownload(finalBlob, 'results.zip');
      }
    } catch (err: any) {
      console.warn('Transformation pipeline warning:', err);
      setErrorMsg(
        err.message ||
          'Failed to transform images. Please verify your files and try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerBlobDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const curlCommand = generateCurlCommand(
    backendUrl,
    imageFiles,
    annotationFiles,
    payload
  );

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(curlCommand);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const folderSet = new Set(unpackedItems.map((u) => u.sourceFolder));
  const availableFolders = Array.from(folderSet);

  const filteredItems = unpackedItems.filter((item) => {
    if (selectedFolderFilter === 'all') return true;
    return item.sourceFolder === selectedFolderFilter;
  });

  return (
    <div className="space-y-6">
      {/* Redesigned Processing Console (Replaced original centered pill button) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Top Console Bar */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <SendHorizontal className="w-5 h-5 text-indigo-600" />
                Pipeline Dispatch Station
              </h2>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1 ${
                  isDemoMode
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {isDemoMode ? <Zap className="w-3 h-3" /> : <Server className="w-3 h-3" />}
                {isDemoMode ? 'Demo Simulator' : 'Live Go Server'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">
              Endpoint: {isDemoMode ? 'Client-Side Canvas & JSZip' : `${backendUrl}/images/transform`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyCurl}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              {copiedCurl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Terminal className="w-3.5 h-3.5" />}
              {copiedCurl ? 'Copied curl' : 'Copy curl'}
            </button>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Summary Column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Source Images</span>
                <span className="text-lg font-bold text-slate-900 font-mono">
                  {imageFiles.length}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block">YOLO Annotations</span>
                <span className="text-lg font-bold text-slate-900 font-mono">
                  {annotationFiles.length > 0 ? `${annotationFiles.length}` : '0 (None)'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Active Edits</span>
                <span className="text-lg font-bold text-indigo-600 font-mono">
                  {payload.edits.length}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Total Outputs</span>
                <span className="text-lg font-bold text-emerald-600 font-mono">
                  {totalResultsExpected}
                </span>
              </div>
            </div>

            {/* Techniques In Effect */}
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700">
              <div className="font-semibold text-slate-800 mb-1.5">
                Included Augmentations in Round-Robin Queue:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {payload.edits.map((e, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-white border border-slate-200 rounded font-mono text-[11px] text-indigo-700"
                  >
                    #{idx + 1} {e.action}
                  </span>
                ))}
                {payload.flip?.enabled && (
                  <span className="px-2 py-0.5 bg-sky-50 border border-sky-200 rounded font-mono text-[11px] text-sky-800">
                    + {Math.round(payload.flip.probability * 100)}% vertical flip
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Trigger Card */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">
                Execution Controls
              </span>
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer mb-4 select-none">
                <input
                  type="checkbox"
                  checked={autoDownload}
                  onChange={(e) => setAutoDownload(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                Auto-download <code className="font-mono text-slate-700">results.zip</code> on complete
              </label>
            </div>

            {!isProcessing && !zipBlob && (
              <button
                type="button"
                onClick={handleStartTransform}
                className="w-full py-3 px-4 bg-slate-900 hover:bg-indigo-600 text-white font-semibold text-xs rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                Start Transform Pipeline
              </button>
            )}

            {isProcessing && (
              <div className="w-full py-2.5 px-3 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-700 text-xs font-semibold flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                Processing Batch...
              </div>
            )}

            {zipBlob && !isProcessing && (
              <button
                type="button"
                onClick={() => triggerBlobDownload(zipBlob, 'results.zip')}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Download results.zip ({zipSizeKb} KiB)
              </button>
            )}
          </div>
        </div>

        {/* Live Processing Progress Bar */}
        {isProcessing && (
          <div className="p-4 border-t border-slate-100 bg-indigo-50/30 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-1.5 text-indigo-700">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                {progressMsg}
              </span>
              <span className="font-mono">{progressPercent}%</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Success Banner */}
        {zipBlob && !isProcessing && (
          <div className="p-4 border-t border-emerald-100 bg-emerald-50/60 flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-900">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Augmentation complete!</strong> Generated {unpackedItems.length} images in {durationMs}ms.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => triggerBlobDownload(zipBlob, 'results.zip')}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Save ZIP ({zipSizeKb} KiB)
              </button>
              <button
                type="button"
                onClick={handleStartTransform}
                className="px-3 py-1.5 bg-white border border-emerald-200 hover:bg-emerald-100 text-emerald-800 rounded-md font-medium cursor-pointer"
              >
                Rerun
              </button>
            </div>
          </div>
        )}

        {/* Fallback Notice Banner if Go server was offline or blocked by browser Mixed Content */}
        {fallbackNotice && zipBlob && !isProcessing && (
          <div className="p-4 border-t border-amber-200 bg-amber-50/80 flex items-start gap-3 text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <div className="font-bold text-amber-900 flex items-center gap-1.5">
                <span>Simulator Auto-Fallback Notice</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-200/70 text-amber-900">
                  results.zip ready
                </span>
              </div>
              <p className="text-amber-800 leading-relaxed">
                {fallbackNotice}
              </p>
              <p className="text-[11px] text-amber-700 font-mono">
                When running locally (<code className="bg-amber-100 px-1 rounded">http://localhost:3000</code>), this frontend connects directly to your Go executable on port 3001.
              </p>
            </div>
          </div>
        )}

        {/* Error notification */}
        {errorMsg && (
          <div className="p-4 border-t border-rose-200 bg-rose-50 text-xs text-rose-800 space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-rose-900">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              Transformation Request Error
            </div>
            <p>{errorMsg}</p>
            <div className="pt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={handleStartTransform}
                className="px-3 py-1.5 bg-rose-600 text-white rounded font-semibold text-xs hover:bg-rose-700"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={handleCopyCurl}
                className="px-3 py-1.5 bg-white border border-rose-300 text-rose-800 rounded font-medium text-xs hover:bg-rose-100 flex items-center gap-1"
              >
                Copy curl Command
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Unpacked Gallery & BBox Visualizer */}
      {unpackedItems.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileArchive className="w-4 h-4 text-indigo-600" />
                Archive Output Gallery ({unpackedItems.length} images)
              </h3>
              <p className="text-xs text-slate-500">
                Click any thumbnail to preview YOLO bounding box recalculations.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Folder Filter Pill */}
              {availableFolders.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                  <span className="text-slate-400 font-semibold text-[11px]">Folder:</span>
                  <button
                    type="button"
                    onClick={() => setSelectedFolderFilter('all')}
                    className={`px-2.5 py-1 rounded-md font-mono ${
                      selectedFolderFilter === 'all'
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'bg-white border text-slate-600'
                    }`}
                  >
                    All ({unpackedItems.length})
                  </button>
                  {availableFolders.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setSelectedFolderFilter(f)}
                      className={`px-2.5 py-1 rounded-md font-mono ${
                        selectedFolderFilter === f
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-white border text-slate-600'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              )}

              {zipBlob && (
                <button
                  type="button"
                  onClick={() => triggerBlobDownload(zipBlob, 'results.zip')}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download ZIP ({zipSizeKb} KiB)
                </button>
              )}
            </div>
          </div>

          {/* Grid of Results */}
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[500px] overflow-y-auto">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => setInspectItem(item)}
                className="group relative bg-slate-50 hover:bg-indigo-50/40 border border-slate-200 hover:border-indigo-400 rounded-lg p-2.5 cursor-pointer transition-all flex flex-col justify-between"
              >
                <div className="relative aspect-4/3 w-full bg-slate-900 rounded overflow-hidden mb-2">
                  <img
                    src={item.imageBlobUrl}
                    alt={item.filename}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <Eye className="w-5 h-5" />
                  </div>
                </div>

                <div>
                  <span className="font-mono text-xs font-semibold text-slate-800 block truncate">
                    {item.sourceFolder}/{item.filename}
                  </span>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                    <span>{item.sizeKb} KiB</span>
                    {item.boxes && item.boxes.length > 0 ? (
                      <span className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        {item.boxes.length} BBoxes
                      </span>
                    ) : (
                      <span className="text-slate-400">No txt</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBackToConfig}
          className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Config
        </button>

        <button
          type="button"
          onClick={onStartOver}
          className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Start New Batch
        </button>
      </div>

      {/* Item Inspection Modal */}
      {inspectItem && (
        <YoloPreviewModal
          imageSrc={inspectItem.imageBlobUrl}
          annotationContent={inspectItem.annotationContent}
          stem={`${inspectItem.sourceFolder}/${inspectItem.filename}`}
          onClose={() => setInspectItem(null)}
        />
      )}
    </div>
  );
};
