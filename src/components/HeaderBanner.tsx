import type { LogoConfig } from '../types/theme.ts';
import { isSafeImageDataUrl } from '../utils/securitySanitizer.ts';
import { SaferWordmark } from './SaferWordmark.tsx';
import {
  Shield,
  AlertTriangle,
  UserCheck,
  Calendar,
  Building2,
  Palette,
  Eye,
  Info,
} from 'lucide-react';

interface HeaderBannerProps {
  requiringReviewCount: number;
  expiredCertsCount: number;
  onOpenNotice: () => void;
  onOpenBranding: () => void;
  onOpenTheme: () => void;
  onOpenAccessibility: () => void;
  topLogo: LogoConfig;
  themeCamoPattern?: string;
}

export const HeaderBanner: React.FC<HeaderBannerProps> = ({
  requiringReviewCount,
  expiredCertsCount,
  onOpenNotice,
  onOpenBranding,
  onOpenTheme,
  onOpenAccessibility,
  topLogo,
  themeCamoPattern,
}) => {
  const showTopLogoLeft =
    topLogo.enabled && isSafeImageDataUrl(topLogo.dataUrl) && topLogo.position === 'top-left';
  const showTopLogoRight =
    topLogo.enabled && isSafeImageDataUrl(topLogo.dataUrl) && topLogo.position === 'top-right';

  return (
    <header className="w-full bg-slate-900 text-white border-b border-slate-800 shadow-sm relative">
      {/* Decorative Camouflage Accent Trim (Boundary-only, never behind text) */}
      {themeCamoPattern && (
        <div
          className={`h-2.5 w-full border-b border-black/30 ${themeCamoPattern}`}
          aria-hidden="true"
        />
      )}

      {/* Required Prototype Demonstration Banner */}
      <div className="bg-slate-950 px-4 py-2 text-xs font-medium text-slate-300 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          {/* Permanently visible clickable text link */}
          <button
            type="button"
            onClick={onOpenNotice}
            className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition cursor-pointer underline underline-offset-2"
            title="Read Full Demonstration Notice"
            aria-label="Open Demonstration Notice Modal"
          >
            DEMONSTRATION NOTICE
          </button>
          <span className="font-semibold text-slate-200 hidden sm:inline">
            Prototype Demonstration
          </span>
        </div>

        {/* Presentation Controls: Accessibility, Theme, Branding */}
        <div className="flex items-center space-x-2 sm:space-x-3 text-xs">
          <button
            type="button"
            onClick={onOpenAccessibility}
            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-teal-300 hover:text-white border border-slate-700 transition"
            title="Open Accessibility Menu"
            aria-label="Open Accessibility Menu"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="font-semibold text-[11px]">Accessibility</span>
          </button>

          <button
            type="button"
            onClick={onOpenTheme}
            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-blue-300 hover:text-white border border-slate-700 transition"
            title="Open Theme Settings"
            aria-label="Open Theme Settings"
          >
            <Palette className="w-3.5 h-3.5" />
            <span className="font-semibold text-[11px]">Theme</span>
          </button>

          <button
            type="button"
            onClick={onOpenBranding}
            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition"
            title="Open Branding & Organisation Logo Settings"
            aria-label="Open Organisation Branding Settings"
          >
            <Building2 className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold text-[11px] hidden sm:inline">Branding</span>
          </button>

          <span className="hidden md:inline-flex items-center text-slate-400 text-xs">
            <Calendar className="w-3.5 h-3.5 mr-1" />
            Oct 15, 2026
          </span>
        </div>
      </div>

      {/* Main Header Brand & Safety Principle Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-3">
            {/* Top Logo Positioned Top-Left if selected */}
            {showTopLogoLeft && (
              <div className="shrink-0 bg-white/10 p-1 rounded-md border border-white/20">
                <img
                  src={topLogo.dataUrl!}
                  alt={topLogo.altText || 'Organisation Top-Left Logo'}
                  style={{ height: `${topLogo.height}px` }}
                  className="object-contain max-w-[140px]"
                />
              </div>
            )}

            <SaferWordmark variant="header" />
          </div>

          {/* Right Header items (Status Badges + Optional Top-Right Logo) */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Real-time Readiness & Human Review Status Indicators */}
            <div className="bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs">
              <AlertTriangle
                className={`w-4 h-4 ${
                  expiredCertsCount > 0 ? 'text-rose-400' : 'text-slate-400'
                }`}
              />
              <div>
                <div className="text-[10px] uppercase text-slate-400 font-medium">Expired Certs</div>
                <div className="font-semibold text-white">
                  {expiredCertsCount} {expiredCertsCount === 1 ? 'Action Item' : 'Action Items'}
                </div>
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs">
              <UserCheck
                className={`w-4 h-4 ${
                  requiringReviewCount > 0 ? 'text-amber-400' : 'text-teal-400'
                }`}
              />
              <div>
                <div className="text-[10px] uppercase text-slate-400 font-medium">Human Review Queue</div>
                <div className="font-semibold text-white">
                  {requiringReviewCount} Personnel Pending
                </div>
              </div>
            </div>

            {/* Top Logo Positioned Top-Right if selected */}
            {showTopLogoRight && (
              <div className="shrink-0 bg-white/10 p-1 rounded-md border border-white/20 ml-1">
                <img
                  src={topLogo.dataUrl!}
                  alt={topLogo.altText || 'Organisation Top-Right Logo'}
                  style={{ height: `${topLogo.height}px` }}
                  className="object-contain max-w-[140px]"
                />
              </div>
            )}
          </div>
        </div>

        {/* Human Mandate Disclaimer Strip */}
        <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            <span>
              <strong className="text-slate-300 font-semibold">Human Review Mandate:</strong> This system does not automatically declare personnel fit or cleared for duty. Status reflects administrative document validity requiring supervisor verification.
            </span>
          </div>
          <span className="hidden lg:inline text-slate-500 font-mono">
            SEC-ADMIN-v1.0.4-MVP
          </span>
        </div>
      </div>
    </header>
  );
};
