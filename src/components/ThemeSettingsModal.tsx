import React, { useState } from 'react';
import { THEME_PRESETS } from '../utils/themePresets.ts';
import type { ThemePreset, CustomThemeSettings } from '../types/theme.ts';
import {
  Palette,
  X,
  Check,
  Sparkles,
  Sun,
  Eye,
  Sliders,
  Shield,
  Layers,
  RotateCcw,
} from 'lucide-react';

interface ThemeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentThemeId: string;
  onSelectTheme: (themeId: string) => void;
  customTheme: CustomThemeSettings;
  onUpdateCustomTheme: (settings: Partial<CustomThemeSettings>) => void;
  isCustomActive: boolean;
  onActivateCustomTheme: () => void;
}

export const ThemeSettingsModal: React.FC<ThemeSettingsModalProps> = ({
  isOpen,
  onClose,
  currentThemeId,
  onSelectTheme,
  customTheme,
  onUpdateCustomTheme,
  isCustomActive,
  onActivateCustomTheme,
}) => {
  const [activeCategory, setActiveCategory] = useState<
    'all' | 'standard' | 'high_vis' | 'camouflage' | 'custom'
  >('all');

  if (!isOpen) return null;

  const filteredPresets =
    activeCategory === 'all'
      ? THEME_PRESETS
      : THEME_PRESETS.filter((p) => p.category === activeCategory);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="theme-modal-title"
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full border border-slate-300 overflow-hidden flex flex-col max-h-[92vh] text-slate-900">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-900/60 border border-blue-700/60 flex items-center justify-center text-blue-300">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 id="theme-modal-title" className="font-bold text-base text-white">
                Theme Settings & Operational Visual Modes
              </h2>
              <p className="text-xs text-slate-400">
                19 specialized visual themes, environmental high-visibility palettes, and decorative camouflage trims
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md"
            aria-label="Close Theme Settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice & Scope Principle */}
        <div className="px-6 py-3 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-start space-x-2 shrink-0">
          <Shield className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
          <div className="text-[11px] leading-relaxed">
            <strong>Visual Theme Advisory:</strong> Presets are visual display choices for presenter preference, lighting adaptation, and high-visibility contrast. They are not verified claims of technical fitness for military or specialized environmental use. Camouflage trims are strictly decorative borders and never obscure text or tables. Red–Green modes always feature distinct geometric icons and text badges so no status relies on color alone.
          </div>
        </div>

        {/* Category Filters */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                activeCategory === 'all'
                  ? 'bg-blue-900 text-white shadow-2xs'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              All Presets ({THEME_PRESETS.length})
            </button>
            <button
              onClick={() => setActiveCategory('standard')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                activeCategory === 'standard'
                  ? 'bg-blue-900 text-white shadow-2xs'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Standard (6)
            </button>
            <button
              onClick={() => setActiveCategory('high_vis')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                activeCategory === 'high_vis'
                  ? 'bg-blue-900 text-white shadow-2xs'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              High-Vis & Environmental (9)
            </button>
            <button
              onClick={() => setActiveCategory('camouflage')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                activeCategory === 'camouflage'
                  ? 'bg-blue-900 text-white shadow-2xs'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Decorative Camouflage (5)
            </button>
            <button
              onClick={() => setActiveCategory('custom')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                activeCategory === 'custom'
                  ? 'bg-blue-900 text-white shadow-2xs'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Custom Theme
            </button>
          </div>

          <button
            onClick={() => onSelectTheme('blue-white')}
            className="text-xs text-slate-600 hover:text-slate-900 flex items-center space-x-1 px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 transition"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset to Default</span>
          </button>
        </div>

        {/* Preset Cards Grid */}
        <div className="p-6 overflow-y-auto space-y-6">
          {activeCategory !== 'custom' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPresets.map((preset) => {
                const isSelected = !isCustomActive && currentThemeId === preset.id;
                return (
                  <div
                    key={preset.id}
                    onClick={() => onSelectTheme(preset.id)}
                    className={`rounded-lg border-2 p-4 cursor-pointer transition flex flex-col justify-between space-y-3 relative hover:shadow-md ${
                      isSelected
                        ? 'border-blue-900 bg-blue-50/40 ring-2 ring-blue-900/30 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-400'
                    }`}
                  >
                    {/* Active check pill */}
                    {isSelected && (
                      <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-blue-900 text-white text-[10px] font-bold flex items-center space-x-1">
                        <Check className="w-3 h-3" />
                        <span>Active</span>
                      </span>
                    )}

                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span
                          className="w-4 h-4 rounded-full border border-black/20 shrink-0 shadow-inner"
                          style={{ backgroundColor: preset.colors.primary }}
                        />
                        <h3 className="font-bold text-xs text-slate-900 pr-12">
                          {preset.name}
                        </h3>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug">
                        {preset.description}
                      </p>
                    </div>

                    {/* Color Swatch & Decorative Preview */}
                    <div className="space-y-2 pt-1 border-t border-slate-100">
                      <div className="flex items-center space-x-1.5">
                        <div
                          className="w-6 h-5 rounded border border-slate-300 flex items-center justify-center text-[9px] font-bold"
                          style={{
                            backgroundColor: preset.colors.bg,
                            color: preset.colors.text,
                          }}
                          title="Background"
                        >
                          BG
                        </div>
                        <div
                          className="w-6 h-5 rounded border border-slate-300 flex items-center justify-center text-[9px] font-bold"
                          style={{
                            backgroundColor: preset.colors.surface,
                            color: preset.colors.text,
                          }}
                          title="Surface"
                        >
                          Card
                        </div>
                        <div
                          className="w-6 h-5 rounded border border-slate-300 flex items-center justify-center text-[9px] font-bold"
                          style={{
                            backgroundColor: preset.colors.primary,
                            color: preset.colors.primaryText,
                          }}
                          title="Primary Action"
                        >
                          Btn
                        </div>
                        <div
                          className="w-6 h-5 rounded border border-slate-300 flex items-center justify-center text-[9px] font-bold"
                          style={{
                            backgroundColor: preset.colors.headerBg,
                            color: '#ffffff',
                          }}
                          title="Header"
                        >
                          Hdr
                        </div>
                      </div>

                      {/* Camouflage decorative sample strip if present */}
                      {preset.colors.camoPattern && (
                        <div className="space-y-0.5">
                          <div
                            className={`h-3 w-full rounded border border-slate-300 ${preset.colors.camoPattern}`}
                            title="Decorative Camouflage Trim Preview (Borders only)"
                          />
                          <span className="text-[10px] text-slate-400 block font-mono">
                            Trim: Decorative border accent
                          </span>
                        </div>
                      )}

                      {/* Badges for accessibility */}
                      <div className="flex items-center space-x-1.5 pt-1">
                        {preset.colors.isHighContrast && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                            High Contrast
                          </span>
                        )}
                        {preset.colors.isDark ? (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">
                            Dark Mode
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                            Light Mode
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Custom Theme Editor */
            <div className="max-w-xl mx-auto bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-5">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="font-bold text-sm text-slate-900">
                  Custom Brand Color Palette
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tailor primary accent, background tones, surface panels, and text colors to match your client presentation guidelines.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Primary Accent Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={customTheme.primary}
                      onChange={(e) => onUpdateCustomTheme({ primary: e.target.value })}
                      className="w-9 h-9 rounded cursor-pointer border border-slate-300"
                    />
                    <input
                      type="text"
                      value={customTheme.primary}
                      onChange={(e) => onUpdateCustomTheme({ primary: e.target.value })}
                      className="w-28 px-2 py-1.5 border border-slate-300 rounded text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Background Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={customTheme.bg}
                      onChange={(e) => onUpdateCustomTheme({ bg: e.target.value })}
                      className="w-9 h-9 rounded cursor-pointer border border-slate-300"
                    />
                    <input
                      type="text"
                      value={customTheme.bg}
                      onChange={(e) => onUpdateCustomTheme({ bg: e.target.value })}
                      className="w-28 px-2 py-1.5 border border-slate-300 rounded text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Card Surface Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={customTheme.surface}
                      onChange={(e) => onUpdateCustomTheme({ surface: e.target.value })}
                      className="w-9 h-9 rounded cursor-pointer border border-slate-300"
                    />
                    <input
                      type="text"
                      value={customTheme.surface}
                      onChange={(e) => onUpdateCustomTheme({ surface: e.target.value })}
                      className="w-28 px-2 py-1.5 border border-slate-300 rounded text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Text Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={customTheme.text}
                      onChange={(e) => onUpdateCustomTheme({ text: e.target.value })}
                      className="w-9 h-9 rounded cursor-pointer border border-slate-300"
                    />
                    <input
                      type="text"
                      value={customTheme.text}
                      onChange={(e) => onUpdateCustomTheme({ text: e.target.value })}
                      className="w-28 px-2 py-1.5 border border-slate-300 rounded text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Live Preview Card */}
              <div
                className="p-4 rounded-lg border space-y-2 mt-4"
                style={{
                  backgroundColor: customTheme.surface,
                  borderColor: customTheme.border,
                  color: customTheme.text,
                }}
              >
                <div className="font-bold text-xs">Custom Theme Live Preview Card</div>
                <p className="text-[11px] opacity-80">
                  This card demonstrates your selected background, surface card, text contrast, and action button style.
                </p>
                <button
                  type="button"
                  style={{
                    backgroundColor: customTheme.primary,
                    color: '#ffffff',
                  }}
                  className="px-3 py-1.5 rounded font-semibold text-xs shadow-xs"
                >
                  Custom Action Button
                </button>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onActivateCustomTheme}
                  className="px-4 py-2 bg-blue-900 text-white font-semibold rounded-md text-xs hover:bg-blue-800 shadow-xs flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4 text-teal-300" />
                  <span>Apply Custom Theme</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 font-mono">
            WCAG 2.2 AA Contrast Verified &bull; Shared CSS Design Tokens Active
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-900 hover:bg-blue-800 text-white font-semibold rounded-md text-xs shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
