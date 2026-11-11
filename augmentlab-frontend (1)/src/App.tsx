import React, { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { StepNavigation } from './components/StepNavigation';
import { UploadView } from './components/UploadView';
import { ConfigView } from './components/ConfigView';
import { TransformView } from './components/TransformView';
import {
  INITIAL_TECHNIQUES,
  TechniqueState,
  EditActionType,
  SupportedExt,
  FlipConfig,
  buildPayload,
} from './utils/augmentationSchema';
import { matchAndValidatePairs } from './utils/fileValidation';

export default function App() {
  const [activeTab, setActiveTab] = useState<'upload' | 'config' | 'results'>('upload');
  const [backendUrl, setBackendUrl] = useState<string>('http://localhost:3001');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Files state
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [annotationFiles, setAnnotationFiles] = useState<File[]>([]);

  // Augmentation state
  const [techniques, setTechniques] = useState<Record<EditActionType, TechniqueState>>(INITIAL_TECHNIQUES);
  const [globalCount, setGlobalCount] = useState<number>(10);
  const [globalExt, setGlobalExt] = useState<SupportedExt>('png');
  const [flip, setFlip] = useState<FlipConfig>({ enabled: false, probability: 0 });

  // Paired files & validation summary computed reactively
  const { pairs, summary } = useMemo(() => {
    return matchAndValidatePairs(imageFiles, annotationFiles);
  }, [imageFiles, annotationFiles]);

  const enabledEditsCount = useMemo(() => {
    return Object.values(techniques).filter((t) => t.enabled).length;
  }, [techniques]);

  const { payload } = useMemo(() => {
    return buildPayload(techniques, globalCount, globalExt, flip);
  }, [techniques, globalCount, globalExt, flip]);

  const handleStartOver = () => {
    setImageFiles([]);
    setAnnotationFiles([]);
    setActiveTab('upload');
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans antialiased">
      {/* Top App Header & Server Config */}
      <Header
        backendUrl={backendUrl}
        setBackendUrl={setBackendUrl}
        isDemoMode={isDemoMode}
        setIsDemoMode={setIsDemoMode}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Step Wizard Navigation */}
      <StepNavigation
        currentTab={activeTab}
        setCurrentTab={setActiveTab}
        pairCount={pairs.length}
        hasErrors={!summary.isValid && imageFiles.length > 0}
        enabledEditsCount={enabledEditsCount}
        resultsAvailable={false}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {activeTab === 'upload' && (
          <UploadView
            imageFiles={imageFiles}
            setImageFiles={setImageFiles}
            annotationFiles={annotationFiles}
            setAnnotationFiles={setAnnotationFiles}
            pairs={pairs}
            summary={summary}
            onProceedToConfig={() => setActiveTab('config')}
          />
        )}

        {activeTab === 'config' && (
          <ConfigView
            techniques={techniques}
            setTechniques={setTechniques}
            globalCount={globalCount}
            setGlobalCount={setGlobalCount}
            globalExt={globalExt}
            setGlobalExt={setGlobalExt}
            flip={flip}
            setFlip={setFlip}
            backendUrl={backendUrl}
            imageFiles={imageFiles}
            annotationFiles={annotationFiles}
            onBackToUpload={() => setActiveTab('upload')}
            onProceedToTransform={() => setActiveTab('results')}
          />
        )}

        {activeTab === 'results' && (
          <TransformView
            imageFiles={imageFiles}
            annotationFiles={annotationFiles}
            payload={payload}
            backendUrl={backendUrl}
            isDemoMode={isDemoMode}
            onBackToConfig={() => setActiveTab('config')}
            onStartOver={handleStartOver}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">AugmentLab</span>
            <span>•</span>
            <span>Frontend Client for Go Image Processing API</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>Target: <code className="font-mono text-slate-600">{backendUrl}</code></span>
            <span>•</span>
            <span>Dataset YOLO Spec Compliant</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
