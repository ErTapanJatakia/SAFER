import React from 'react';
import type { AccessibilitySettings } from '../types/theme.ts';
import {
  Eye,
  Type,
  X,
  RotateCcw,
  Sliders,
  Sparkles,
  Contrast,
  Sun,
  Moon,
  Move,
  Focus,
  Maximize2,
  BookOpen,
  Check,
  Shield,
} from 'lucide-react';

interface AccessibilityMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AccessibilitySettings;
  onUpdateSettings: (newSettings: Partial<AccessibilitySettings>) => void;
  onResetSettings: () => void;
}

export const AccessibilityMenuModal: React.FC<AccessibilityMenuModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetSettings,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="accessibility-menu-title"
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-300 overflow-hidden flex flex-col max-h-[92vh] text-slate-900">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h2 id="accessibility-menu-title" className="font-bold text-base text-white">
                Accessibility Preferences & Assistive Controls
              </h2>
              <p className="text-xs text-slate-400">
                WCAG 2.2 AA alignment features: text scaling, contrast, dyslexia font, and focus indicators
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md"
            aria-label="Close Accessibility Preferences"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative Scope Header */}
        <div className="px-6 py-2.5 bg-teal-50 border-b border-teal-200 text-teal-900 text-xs flex items-start space-x-2 shrink-0">
          <Shield className="w-4 h-4 text-teal-700 mt-0.5 shrink-0" />
          <div className="text-[11px] leading-relaxed">
            <strong>Assistive Design Mandate:</strong> This interface implements WCAG 2.2 AA accessibility practices including semantic landmarks, keyboard focus management, screen-reader live updates, non-color-dependent status indicators, and responsive reflow up to 200% zoom.
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
          {/* 1. Text Sizing (100% to 200%) */}
          <div className="space-y-2 border-b border-slate-200 pb-4">
            <div className="flex items-center justify-between">
              <label className="font-bold text-sm text-slate-900 flex items-center space-x-2">
                <Type className="w-4 h-4 text-blue-900" />
                <span>Text Size Enlargement ({settings.textSize}%)</span>
              </label>
              <span className="text-[11px] text-slate-500">
                Supports up to 200% without loss of functionality
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {(['100', '125', '150', '175', '200'] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => onUpdateSettings({ textSize: size })}
                  className={`py-2 rounded-lg border text-center font-bold text-xs transition ${
                    settings.textSize === size
                      ? 'bg-blue-900 text-white border-blue-900 shadow-2xs'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                  aria-pressed={settings.textSize === size}
                >
                  {size}%
                </button>
              ))}
            </div>
          </div>

          {/* 2. Contrast & Display Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-slate-200 pb-4">
            {/* High Contrast Mode */}
            <div className="space-y-1.5">
              <label className="font-bold text-xs text-slate-900 flex items-center space-x-2">
                <Contrast className="w-4 h-4 text-blue-900" />
                <span>High-Contrast Outlines</span>
              </label>
              <p className="text-[11px] text-slate-500">
                Enhances border definitions and separates controls with thicker boundary strokes.
              </p>
              <div className="flex items-center space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings({
                      contrast: settings.contrast === 'high' ? 'normal' : 'high',
                    })
                  }
                  className={`px-3 py-1.5 rounded-md font-semibold text-xs border transition ${
                    settings.contrast === 'high'
                      ? 'bg-amber-100 border-amber-600 text-amber-900 font-bold'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                  aria-pressed={settings.contrast === 'high'}
                >
                  {settings.contrast === 'high' ? 'High Contrast Active' : 'Standard Contrast'}
                </button>
              </div>
            </div>

            {/* Light / Dark Mode Override */}
            <div className="space-y-1.5">
              <label className="font-bold text-xs text-slate-900 flex items-center space-x-2">
                <Sun className="w-4 h-4 text-blue-900" />
                <span>Color Display Mode</span>
              </label>
              <p className="text-[11px] text-slate-500">
                Choose light, dark, or theme-controlled color scheme.
              </p>
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {(['auto', 'light', 'dark'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onUpdateSettings({ colorMode: mode })}
                    className={`py-1.5 px-2 rounded-md font-semibold text-xs border capitalize transition ${
                      settings.colorMode === mode
                        ? 'bg-blue-900 text-white border-blue-900'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Dyslexia-Friendly High-Legibility Font & Text Spacing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-slate-200 pb-4">
            <div className="space-y-1.5">
              <label className="font-bold text-xs text-slate-900 flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-blue-900" />
                <span>Dyslexia-Friendly Font</span>
              </label>
              <p className="text-[11px] text-slate-500">
                Applies wide letterforms and weighted baselines to reduce visual crowding.
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings({ dyslexicFont: !settings.dyslexicFont })
                  }
                  className={`px-3 py-1.5 rounded-md font-semibold text-xs border transition ${
                    settings.dyslexicFont
                      ? 'bg-teal-100 border-teal-600 text-teal-900 font-bold'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                  aria-pressed={settings.dyslexicFont}
                >
                  {settings.dyslexicFont ? 'Dyslexia Mode Enabled' : 'Standard Font'}
                </button>
              </div>
            </div>

            {/* Line Spacing */}
            <div className="space-y-1.5">
              <label className="font-bold text-xs text-slate-900 flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-blue-900" />
                <span>Line Spacing</span>
              </label>
              <p className="text-[11px] text-slate-500">
                Adjust vertical spacing between lines of operational text.
              </p>
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {(['normal', 'relaxed', 'loose'] as const).map((spacing) => (
                  <button
                    key={spacing}
                    type="button"
                    onClick={() => onUpdateSettings({ lineSpacing: spacing })}
                    className={`py-1.5 px-2 rounded-md font-semibold text-xs border capitalize transition ${
                      settings.lineSpacing === spacing
                        ? 'bg-blue-900 text-white border-blue-900'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {spacing}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 4. Letter Spacing & Larger Touch Targets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-slate-200 pb-4">
            <div className="space-y-1.5">
              <label className="font-bold text-xs text-slate-900 flex items-center space-x-2">
                <Type className="w-4 h-4 text-blue-900" />
                <span>Text / Letter Spacing</span>
              </label>
              <p className="text-[11px] text-slate-500">
                Widens letter and word intervals for screen readability.
              </p>
              <div className="flex space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ letterSpacing: 'normal' })}
                  className={`px-3 py-1.5 rounded-md font-semibold text-xs border transition ${
                    settings.letterSpacing === 'normal'
                      ? 'bg-blue-900 text-white border-blue-900'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Standard Spacing
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ letterSpacing: 'wide' })}
                  className={`px-3 py-1.5 rounded-md font-semibold text-xs border transition ${
                    settings.letterSpacing === 'wide'
                      ? 'bg-blue-900 text-white border-blue-900'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Wide Spacing
                </button>
              </div>
            </div>

            {/* Larger Touch Targets */}
            <div className="space-y-1.5">
              <label className="font-bold text-xs text-slate-900 flex items-center space-x-2">
                <Maximize2 className="w-4 h-4 text-blue-900" />
                <span>Larger Touch Targets (≥44px)</span>
              </label>
              <p className="text-[11px] text-slate-500">
                Enlarges clickable buttons and form inputs for motor ease on touchscreens.
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings({ largeTargets: !settings.largeTargets })
                  }
                  className={`px-3 py-1.5 rounded-md font-semibold text-xs border transition ${
                    settings.largeTargets
                      ? 'bg-blue-900 text-white border-blue-900 font-bold'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                  aria-pressed={settings.largeTargets}
                >
                  {settings.largeTargets ? 'Large Targets Active (≥44px)' : 'Standard Targets'}
                </button>
              </div>
            </div>
          </div>

          {/* 5. Reduced Motion & Enhanced Keyboard Focus */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-bold text-xs text-slate-900 flex items-center space-x-2">
                <Move className="w-4 h-4 text-blue-900" />
                <span>Reduced Motion</span>
              </label>
              <p className="text-[11px] text-slate-500">
                Disables transitions and decorative animations for vestibular sensitivity.
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings({ reducedMotion: !settings.reducedMotion })
                  }
                  className={`px-3 py-1.5 rounded-md font-semibold text-xs border transition ${
                    settings.reducedMotion
                      ? 'bg-blue-900 text-white border-blue-900 font-bold'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                  aria-pressed={settings.reducedMotion}
                >
                  {settings.reducedMotion ? 'Animations Disabled' : 'Motion Allowed'}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-xs text-slate-900 flex items-center space-x-2">
                <Focus className="w-4 h-4 text-blue-900" />
                <span>High-Visibility Keyboard Focus Ring</span>
              </label>
              <p className="text-[11px] text-slate-500">
                Displays a prominent 3px focus ring around interactive controls during keyboard navigation.
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ focusRing: !settings.focusRing })}
                  className={`px-3 py-1.5 rounded-md font-semibold text-xs border transition ${
                    settings.focusRing
                      ? 'bg-blue-900 text-white border-blue-900 font-bold'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                  aria-pressed={settings.focusRing}
                >
                  {settings.focusRing ? 'Focus Ring Active' : 'Default Focus'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onResetSettings}
            className="text-xs text-slate-600 hover:text-slate-900 flex items-center space-x-1 px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Accessibility Settings</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 bg-blue-900 hover:bg-blue-800 text-white font-semibold rounded-md text-xs shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
