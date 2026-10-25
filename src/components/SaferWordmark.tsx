import React from 'react';

interface SaferWordmarkProps {
  variant?: 'header' | 'hero' | 'footer' | 'compact';
  className?: string;
  showTagline?: boolean;
  showFullForm?: boolean;
  showDescriptor?: boolean;
}

/**
 * Modern security-oriented wordmark for SAFER:
 * Security Administration, Field Readiness, Evidence & Reporting
 * Tagline: Prepared. Accountable. Secure.
 * Product descriptor: AI-Assisted Security Operations Platform
 *
 * Designed with deep navy (#0f172a, #1e3a8a) and emerald (#059669, #10b981) accents,
 * fully accessible and responsive across all tactical and high-vis themes.
 */
export const SaferWordmark: React.FC<SaferWordmarkProps> = ({
  variant = 'header',
  className = '',
  showTagline = true,
  showFullForm = true,
  showDescriptor = true,
}) => {
  // SVG Insignia: High-precision defensive shield with emerald verification chevron and operational crosshairs
  const insigniaIcon = (
    <div
      className={`relative shrink-0 flex items-center justify-center rounded-lg shadow-md border ${
        variant === 'compact'
          ? 'w-7 h-7 bg-slate-900 border-slate-700/80'
          : variant === 'hero'
          ? 'w-12 h-12 bg-slate-950 border-emerald-500/40 ring-1 ring-emerald-500/20'
          : 'w-10 h-10 bg-slate-950/90 border-slate-700/80 ring-1 ring-emerald-500/30'
      }`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 40 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={variant === 'compact' ? 'w-4 h-4' : variant === 'hero' ? 'w-7 h-7' : 'w-5 h-5'}
      >
        {/* Shield Outer Outline in Deep Navy/Slate */}
        <path
          d="M20 2L5 8.5V20.5C5 30.5 11.5 39.5 20 42C28.5 39.5 35 30.5 35 20.5V8.5L20 2Z"
          fill="#0B1329"
          stroke="#1E3A8A"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Shield Facet Gradient Detail */}
        <path
          d="M20 3L7 8.8V20.5C7 29.3 12.7 37.3 20 40V3Z"
          fill="#1E293B"
          fillOpacity="0.5"
        />
        {/* Emerald Core Verification Element */}
        <path
          d="M13 21.5L18 26.5L27 16"
          stroke="#10B981"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Radar/Readiness Axis Points */}
        <circle cx="20" cy="7" r="1.5" fill="#34D399" />
        <circle cx="20" cy="36" r="1.5" fill="#10B981" />
      </svg>
      {/* Subtle Emerald Pulse Indicator */}
      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
    </div>
  );

  if (variant === 'compact') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {insigniaIcon}
        <div className="flex items-baseline space-x-1.5">
          <span className="font-extrabold tracking-wider text-sm font-sans text-white">
            SAFER
          </span>
          <span className="text-[10px] text-emerald-400 font-mono font-medium tracking-tight">
            PLATFORM
          </span>
        </div>
      </div>
    );
  }

  if (variant === 'hero') {
    return (
      <div className={`flex flex-col sm:flex-row sm:items-center gap-4 ${className}`}>
        {insigniaIcon}
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-2xl sm:text-3xl font-black tracking-wider text-slate-900 font-sans flex items-center">
              SAFER
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-600 ml-1.5 self-center" />
            </span>
            <span className="text-xs uppercase font-mono font-bold tracking-wider px-2.5 py-0.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-md">
              AI-Assisted Security Operations Platform
            </span>
          </div>
          <div className="text-xs font-semibold text-slate-800 tracking-wide">
            Security Administration, Field Readiness, Evidence &amp; Reporting
          </div>
          <div className="text-[11px] font-mono font-medium text-emerald-700 flex items-center space-x-1.5 pt-0.5">
            <span>Prepared.</span>
            <span>&bull;</span>
            <span>Accountable.</span>
            <span>&bull;</span>
            <span>Secure.</span>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'footer') {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        {insigniaIcon}
        <div className="space-y-0.5 text-left">
          <div className="flex items-center space-x-2">
            <span className="font-extrabold tracking-wider text-white text-sm font-sans flex items-center">
              SAFER
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 ml-1" />
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              AI-Assisted Security Operations Platform
            </span>
          </div>
          <div className="text-[11px] text-slate-300">
            Security Administration, Field Readiness, Evidence &amp; Reporting
          </div>
          <div className="text-[10px] text-emerald-400 font-mono font-medium">
            Prepared. Accountable. Secure.
          </div>
        </div>
      </div>
    );
  }

  // Default: Header variant
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {insigniaIcon}
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center">
            <span className="text-xl sm:text-2xl font-black tracking-wider text-white font-sans">
              SAFER
            </span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 ml-1 self-center" />
          </div>

          {showDescriptor && (
            <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 tracking-tight">
              AI-Assisted Security Operations Platform
            </span>
          )}

          <span className="text-[10px] uppercase tracking-wider font-mono font-semibold px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-300 rounded">
            Portfolio Prototype
          </span>
        </div>

        {showFullForm && (
          <div className="text-[11px] sm:text-xs text-slate-300 font-medium tracking-normal mt-0.5">
            Security Administration, Field Readiness, Evidence &amp; Reporting
          </div>
        )}

        {showTagline && (
          <div className="text-[10px] sm:text-[11px] font-mono text-emerald-400 font-semibold tracking-wide flex items-center space-x-1.5 mt-0.5">
            <span>Prepared.</span>
            <span>&bull;</span>
            <span>Accountable.</span>
            <span>&bull;</span>
            <span>Secure.</span>
          </div>
        )}
      </div>
    </div>
  );
};
