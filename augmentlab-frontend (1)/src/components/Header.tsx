import React, { useState } from 'react';
import {
  Layers,
  Settings,
  Server,
  Zap,
  RotateCw,
  Crop,
  Maximize2,
  Sun,
  Eye,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Download,
} from 'lucide-react';

interface HeaderProps {
  backendUrl: string;
  setBackendUrl: (url: string) => void;
  isDemoMode: boolean;
  setIsDemoMode: (val: boolean) => void;
  activeTab: 'upload' | 'config' | 'results';
  setActiveTab: (tab: 'upload' | 'config' | 'results') => void;
}

export const Header: React.FC<HeaderProps> = ({
  backendUrl,
  setBackendUrl,
  isDemoMode,
  setIsDemoMode,
  activeTab,
  setActiveTab,
}) => {
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [tempUrl, setTempUrl] = useState(backendUrl);
  const [pingStatus, setPingStatus] = useState<'idle' | 'testing' | 'online' | 'offline'>('idle');

  const testPing = async () => {
    setPingStatus('testing');
    try {
      // Test fetch with short timeout to backend URL
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      await fetch(backendUrl, { method: 'HEAD', mode: 'no-cors', signal: controller.signal });
      clearTimeout(timeoutId);
      setPingStatus('online');
    } catch {
      // If error or abort, offline
      setPingStatus('offline');
    }
  };

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs">
      {/* Top brand bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">AugmentLab</h1>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                Go API Companion
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Batch Image & YOLO Annotation Augmentation Studio
            </p>
          </div>
        </div>

        {/* Server & Mode Controls */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Mode Pill Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-medium">
            <button
              type="button"
              onClick={() => setIsDemoMode(false)}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                !isDemoMode
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Live mode connects directly to your local Go server at http://localhost:3001"
            >
              <Server className="w-3.5 h-3.5 text-emerald-600" />
              Live Backend
            </button>
            <button
              type="button"
              onClick={() => setIsDemoMode(true)}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                isDemoMode
                  ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Browser demo mode generates mock augmented zip in memory without needing Go running"
            >
              <Zap className="w-3.5 h-3.5" />
              Demo / Canvas Mode
            </button>
          </div>

          {/* Backend URL Indicator & Setting */}
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-1.5 text-xs text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            title="Configure backend server target URL"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-mono text-slate-600 hidden sm:inline">{backendUrl}</span>
            <span className="sm:hidden font-mono">:3001</span>
          </button>

          {/* Download Project Source Code ZIP */}
          <button
            type="button"
            onClick={async () => {
              try {
                const res = await fetch('/augmentlab-frontend.zip');
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'augmentlab-frontend.zip';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => window.URL.revokeObjectURL(url), 2000);
              } catch {
                window.location.href = '/augmentlab-frontend.zip';
              }
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg transition-colors shadow-2xs cursor-pointer"
            title="Download full project source code as ZIP for local editing"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Download Code (ZIP)</span>
            <span className="sm:hidden">ZIP</span>
          </button>
        </div>
      </div>

      {/* Backend Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <Server className="w-5 h-5 text-indigo-600" />
                Backend Configuration
              </h3>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Your Go application runs locally on port <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-mono">3001</code>.
              Requests will be dispatched via <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">POST /images/transform</code> with multipart/form-data.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Backend API Host URL
                </label>
                <input
                  type="text"
                  value={tempUrl}
                  onChange={(e) => setTempUrl(e.target.value)}
                  className="w-full text-sm font-mono px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="http://localhost:3001"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-xs">
                  <span className="font-medium text-slate-800">Connection Check</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {pingStatus === 'idle' && (
                      <span className="text-slate-500">Not tested yet</span>
                    )}
                    {pingStatus === 'testing' && (
                      <span className="text-indigo-600 flex items-center gap-1">
                        Pinging {tempUrl}...
                      </span>
                    )}
                    {pingStatus === 'online' && (
                      <span className="text-emerald-600 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Server Reachable
                      </span>
                    )}
                    {pingStatus === 'offline' && (
                      <span className="text-rose-600 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3.5 h-3.5" /> Unable to reach server
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={testPing}
                  className="px-3 py-1.5 text-xs font-medium bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-md transition-colors"
                >
                  Ping URL
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBackendUrl(tempUrl);
                    setShowSettingsModal(false);
                  }}
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs"
                >
                  Save URL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
