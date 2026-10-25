import React, { useState, useRef } from 'react';
import type { LogoConfig } from '../types/theme.ts';
import { isSafeImageDataUrl } from '../utils/securitySanitizer.ts';
import {
  Building2,
  Upload,
  Trash2,
  RotateCcw,
  X,
  Check,
  AlertCircle,
  Eye,
  Sliders,
  Sparkles,
} from 'lucide-react';

interface BrandingSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  topLogo: LogoConfig;
  bottomLogo: LogoConfig;
  onUpdateTopLogo: (config: Partial<LogoConfig>) => void;
  onUpdateBottomLogo: (config: Partial<LogoConfig>) => void;
  onResetLogos: () => void;
}

export const BrandingSettingsModal: React.FC<BrandingSettingsModalProps> = ({
  isOpen,
  onClose,
  topLogo,
  bottomLogo,
  onUpdateTopLogo,
  onUpdateBottomLogo,
  onResetLogos,
}) => {
  const [activeTab, setActiveTab] = useState<'top' | 'bottom'>('top');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const topFileInputRef = useRef<HTMLInputElement>(null);
  const bottomFileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    isTop: boolean
  ) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type (PNG, JPG/JPEG, WebP, SVG)
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    const fileType = file.type.toLowerCase();
    const isSvg = fileType === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
    if (!validTypes.includes(fileType) && !isSvg) {
      setErrorMsg(
        'Invalid file type. Please upload a PNG, JPG/JPEG, WebP, or clean SVG image file.'
      );
      return;
    }

    // Validate size (2 MB limit to prevent browser localStorage quota exhaustion)
    const maxSizeBytes = 2 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setErrorMsg(
        `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). The maximum allowed size is 2 MB to ensure local storage performance.`
      );
      return;
    }

    // Read as Data URL with canvas optimization to avoid exceeding localStorage quota
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) {
        setErrorMsg('Could not read image file.');
        return;
      }

      // Security check: verify dataUrl against dangerous protocols or script payloads
      if (!isSafeImageDataUrl(dataUrl)) {
        setErrorMsg('Security validation failed: image contains active script or forbidden elements.');
        return;
      }

      // Check image dimensions and compress to sensible preview size
      const img = new Image();
      img.onload = () => {
        try {
          const maxDimension = 600;
          let width = img.width || 200;
          let height = img.height || 60;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const optimizedDataUrl = canvas.toDataURL('image/png', 0.92);
            if (!isSafeImageDataUrl(optimizedDataUrl)) {
              setErrorMsg('Security validation failed on rasterized image output.');
              return;
            }

            if (isTop) {
              onUpdateTopLogo({
                dataUrl: optimizedDataUrl,
                enabled: true,
                fileName: file.name,
              });
              setSuccessMsg(`Top logo "${file.name}" uploaded and sanitized successfully.`);
            } else {
              onUpdateBottomLogo({
                dataUrl: optimizedDataUrl,
                enabled: true,
                fileName: file.name,
              });
              setSuccessMsg(`Bottom logo "${file.name}" uploaded and sanitized successfully.`);
            }
          } else {
            // fallback if canvas context is unavailable
            if (dataUrl.length > 500000) {
              setErrorMsg('Image resolution is too high for local browser storage. Please select a smaller logo.');
              return;
            }
            if (isTop) {
              onUpdateTopLogo({ dataUrl, enabled: true, fileName: file.name });
            } else {
              onUpdateBottomLogo({ dataUrl, enabled: true, fileName: file.name });
            }
          }
        } catch (err: any) {
          setErrorMsg(
            'Storage error while saving logo locally in browser. Try a smaller image or reset layout.'
          );
        }
      };
      img.onerror = () => {
        setErrorMsg('Invalid image file content or corrupted graphic format.');
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      setErrorMsg('Failed to process image file.');
    };
    reader.readAsDataURL(file);
  };

  const currentLogo = activeTab === 'top' ? topLogo : bottomLogo;
  const updateCurrent = activeTab === 'top' ? onUpdateTopLogo : onUpdateBottomLogo;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="branding-modal-title"
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-300 overflow-hidden flex flex-col max-h-[92vh] text-slate-900">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-900/60 border border-blue-700/60 flex items-center justify-center text-blue-300">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 id="branding-modal-title" className="font-bold text-base text-white">
                Organisation Branding & Presentation Settings
              </h2>
              <p className="text-xs text-slate-400">
                Configure independent top and bottom presentation logos for client briefings
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md"
            aria-label="Close Branding Settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection: Top Logo vs Bottom Logo */}
        <div className="px-6 pt-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setActiveTab('top');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition ${
                activeTab === 'top'
                  ? 'bg-white text-blue-900 border-blue-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 border-transparent'
              }`}
            >
              Top Logo ({topLogo.position === 'top-left' ? 'Top-Left' : 'Top-Right'})
              {topLogo.dataUrl && <span className="ml-1.5 text-teal-600">&bull; Active</span>}
            </button>
            <button
              onClick={() => {
                setActiveTab('bottom');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition ${
                activeTab === 'bottom'
                  ? 'bg-white text-blue-900 border-blue-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 border-transparent'
              }`}
            >
              Bottom Logo ({bottomLogo.position === 'bottom-left' ? 'Bottom-Left' : 'Bottom-Right'})
              {bottomLogo.dataUrl && <span className="ml-1.5 text-teal-600">&bull; Active</span>}
            </button>
          </div>

          <button
            onClick={() => {
              onResetLogos();
              setSuccessMsg('Restored default branding layout.');
            }}
            className="text-xs text-slate-600 hover:text-slate-900 flex items-center space-x-1 px-2.5 py-1 rounded border border-slate-300 hover:bg-slate-100 mb-2 transition"
            title="Restore default branding layout"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Restore Default Layout</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-md flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-teal-50 border border-teal-300 text-teal-800 rounded-md flex items-center space-x-2">
              <Check className="w-4 h-4 shrink-0 text-teal-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-amber-900 text-[11px] leading-relaxed">
            <strong>Presenter Notice:</strong> Uploaded organisation logos are displayed exclusively for demonstration and client presentation. Logos are stored locally in your browser and never transmitted to external servers. The presenter is responsible for obtaining appropriate permission to use organizational branding.
          </div>

          {/* Logo Area Configuration */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="font-bold text-sm text-slate-900">
                {activeTab === 'top' ? 'Top Area Logo Configuration' : 'Bottom Area Logo Configuration'}
              </h3>
              <label className="flex items-center space-x-2 text-xs cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={currentLogo.enabled}
                  onChange={(e) => updateCurrent({ enabled: e.target.checked })}
                  className="rounded text-blue-900 focus:ring-blue-800"
                />
                <span>Display on Screen</span>
              </label>
            </div>

            {/* Corner Selector */}
            <div className="space-y-1.5">
              <label className="block font-semibold text-slate-800">
                Display Corner Position
              </label>
              <div className="grid grid-cols-2 gap-3">
                {activeTab === 'top' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => updateCurrent({ position: 'top-left' })}
                      className={`p-2.5 rounded-lg border text-center font-semibold text-xs transition ${
                        topLogo.position === 'top-left'
                          ? 'bg-blue-50 border-blue-800 text-blue-900 ring-1 ring-blue-800'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Top-Left Corner
                    </button>
                    <button
                      type="button"
                      onClick={() => updateCurrent({ position: 'top-right' })}
                      className={`p-2.5 rounded-lg border text-center font-semibold text-xs transition ${
                        topLogo.position === 'top-right'
                          ? 'bg-blue-50 border-blue-800 text-blue-900 ring-1 ring-blue-800'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Top-Right Corner
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => updateCurrent({ position: 'bottom-left' })}
                      className={`p-2.5 rounded-lg border text-center font-semibold text-xs transition ${
                        bottomLogo.position === 'bottom-left'
                          ? 'bg-blue-50 border-blue-800 text-blue-900 ring-1 ring-blue-800'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Bottom-Left Corner
                    </button>
                    <button
                      type="button"
                      onClick={() => updateCurrent({ position: 'bottom-right' })}
                      className={`p-2.5 rounded-lg border text-center font-semibold text-xs transition ${
                        bottomLogo.position === 'bottom-right'
                          ? 'bg-blue-50 border-blue-800 text-blue-900 ring-1 ring-blue-800'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Bottom-Right Corner
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Upload & Preview Box */}
            <div className="space-y-2">
              <label className="block font-semibold text-slate-800">
                Logo Image (PNG, JPG/JPEG, WebP — Up to 10 MB)
              </label>

              {currentLogo.dataUrl ? (
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 text-xs flex items-center space-x-1.5">
                      <Eye className="w-3.5 h-3.5 text-blue-900" />
                      <span>Live Aspect-Preserving Preview:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => updateCurrent({ dataUrl: null, fileName: undefined })}
                      className="text-xs text-rose-700 hover:text-rose-900 flex items-center space-x-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Logo</span>
                    </button>
                  </div>

                  <div className="h-24 bg-white border border-dashed border-slate-300 rounded-md flex items-center justify-center p-2">
                    <img
                      src={currentLogo.dataUrl}
                      alt={currentLogo.altText || 'Logo Preview'}
                      style={{ height: `${currentLogo.height}px`, maxHeight: '80px' }}
                      className="object-contain max-w-full"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-500 truncate max-w-xs">
                      {currentLogo.fileName || 'Custom uploaded image'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (activeTab === 'top') {
                          topFileInputRef.current?.click();
                        } else {
                          bottomFileInputRef.current?.click();
                        }
                      }}
                      className="px-3 py-1 bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-100 font-semibold text-xs flex items-center space-x-1"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Replace Image</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => {
                    if (activeTab === 'top') {
                      topFileInputRef.current?.click();
                    } else {
                      bottomFileInputRef.current?.click();
                    }
                  }}
                  className="border-2 border-dashed border-slate-300 hover:border-blue-700 bg-slate-50 hover:bg-blue-50/50 rounded-lg p-6 text-center cursor-pointer transition space-y-2"
                >
                  <div className="w-10 h-10 mx-auto rounded-full bg-blue-100 text-blue-900 flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800 text-xs">
                      Click to upload {activeTab === 'top' ? 'Top' : 'Bottom'} Logo
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      PNG, JPG, or WebP. Maximum size 10 MB.
                    </p>
                  </div>
                </div>
              )}

              {/* Hidden file inputs */}
              <input
                ref={topFileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/jpg, image/webp"
                onChange={(e) => handleFileUpload(e, true)}
                className="hidden"
                aria-label="Upload Top Logo Image"
              />
              <input
                ref={bottomFileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/jpg, image/webp"
                onChange={(e) => handleFileUpload(e, false)}
                className="hidden"
                aria-label="Upload Bottom Logo Image"
              />
            </div>

            {/* Display Size Slider */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-800 flex items-center space-x-1.5">
                  <Sliders className="w-3.5 h-3.5 text-blue-900" />
                  <span>Display Height: {currentLogo.height}px</span>
                </label>
                <span className="text-[11px] text-slate-500">
                  Aspect ratio is strictly preserved
                </span>
              </div>
              <input
                type="range"
                min="24"
                max="80"
                step="2"
                value={currentLogo.height}
                onChange={(e) => updateCurrent({ height: Number(e.target.value) })}
                className="w-full accent-blue-900 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Compact (24px)</span>
                <span>Standard (40px)</span>
                <span>Prominent (80px)</span>
              </div>
            </div>

            {/* Alternative Text */}
            <div className="space-y-1 pt-1">
              <label className="block font-semibold text-slate-800">
                Accessible Alternative Text (for Screen Readers)
              </label>
              <input
                type="text"
                value={currentLogo.altText}
                onChange={(e) => updateCurrent({ altText: e.target.value })}
                placeholder="e.g. Host Nation Diplomatic Security Service Official Emblem"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-900 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Settings persist locally across browser sessions
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
