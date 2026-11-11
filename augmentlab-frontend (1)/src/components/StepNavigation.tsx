import React from 'react';
import { UploadCloud, Sliders, Sparkles, CheckCircle2 } from 'lucide-react';

interface StepNavigationProps {
  currentTab: 'upload' | 'config' | 'results';
  setCurrentTab: (tab: 'upload' | 'config' | 'results') => void;
  pairCount: number;
  hasErrors: boolean;
  enabledEditsCount: number;
  resultsAvailable: boolean;
}

export const StepNavigation: React.FC<StepNavigationProps> = ({
  currentTab,
  setCurrentTab,
  pairCount,
  hasErrors,
  enabledEditsCount,
  resultsAvailable,
}) => {
  const steps = [
    {
      id: 'upload' as const,
      name: '1. Upload & Pair',
      desc: 'Images & YOLO annotations',
      icon: UploadCloud,
      badge:
        pairCount > 0 ? (
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
              hasErrors
                ? 'bg-rose-100 text-rose-700'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {pairCount} {pairCount === 1 ? 'pair' : 'pairs'}
          </span>
        ) : null,
      disabled: false,
    },
    {
      id: 'config' as const,
      name: '2. Augmentation Config',
      desc: 'Techniques, limits & ranges',
      icon: Sliders,
      badge: (
        <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-indigo-100 text-indigo-700">
          {enabledEditsCount} active
        </span>
      ),
      disabled: pairCount === 0 || hasErrors,
    },
    {
      id: 'results' as const,
      name: '3. Transform & Results',
      desc: 'Process & Download ZIP',
      icon: Sparkles,
      badge: resultsAvailable ? (
        <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Ready
        </span>
      ) : null,
      disabled: pairCount === 0 || hasErrors,
    },
  ];

  return (
    <nav aria-label="Augmentation Progress" className="w-full bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
          {steps.map((step) => {
            const Icon = step.icon;
            const isActive = currentTab === step.id;

            return (
              <button
                key={step.id}
                type="button"
                disabled={step.disabled}
                onClick={() => setCurrentTab(step.id)}
                className={`py-3.5 px-4 sm:px-6 flex items-center justify-between text-left transition-colors relative ${
                  isActive
                    ? 'bg-indigo-50/40 text-indigo-950 font-semibold'
                    : step.disabled
                    ? 'opacity-40 cursor-not-allowed bg-slate-50/30 text-slate-400'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold flex items-center gap-2">
                      {step.name}
                    </div>
                    <div className="text-xs text-slate-500 font-normal">
                      {step.desc}
                    </div>
                  </div>
                </div>

                {step.badge && <div className="ml-2">{step.badge}</div>}

                {/* Bottom active indicator bar */}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
