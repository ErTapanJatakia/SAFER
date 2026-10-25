/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import type {
  PersonnelRecord,
  IncidentReport,
  CyberHygieneItem,
  PreDeploymentChecklistItem,
  PreDeploymentStatus,
} from './types/index.ts';
import type {
  LogoConfig,
  AccessibilitySettings,
  CustomThemeSettings,
} from './types/theme.ts';
import {
  INITIAL_PERSONNEL,
  INITIAL_INCIDENTS,
  INITIAL_CYBER_ITEMS,
  INITIAL_CHECKLIST,
  DEFAULT_FICTIONAL_SCENARIO,
} from './data/mockData.ts';
import {
  THEME_PRESETS,
  DEFAULT_THEME_ID,
  DEFAULT_TOP_LOGO,
  DEFAULT_BOTTOM_LOGO,
  DEFAULT_ACCESSIBILITY_SETTINGS,
} from './utils/themePresets.ts';
import { isSafeImageDataUrl } from './utils/securitySanitizer.ts';
import { SaferWordmark } from './components/SaferWordmark.tsx';
import { HeaderBanner } from './components/HeaderBanner.tsx';
import { Navbar, type NavigationSection } from './components/Navbar.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { PersonnelReadinessView } from './components/PersonnelReadinessView.tsx';
import { IncidentReportsView } from './components/IncidentReportsView.tsx';
import { CyberHygieneView } from './components/CyberHygieneView.tsx';
import { PreDeploymentChecklistView } from './components/PreDeploymentChecklistView.tsx';
import { PersonnelModal } from './components/PersonnelModal.tsx';
import { PersonnelDetailModal } from './components/PersonnelDetailModal.tsx';
import { ReadinessSummaryModal } from './components/ReadinessSummaryModal.tsx';
import { DemonstrationNoticeModal } from './components/DemonstrationNoticeModal.tsx';
import { BrandingSettingsModal } from './components/BrandingSettingsModal.tsx';
import { ThemeSettingsModal } from './components/ThemeSettingsModal.tsx';
import { AccessibilityMenuModal } from './components/AccessibilityMenuModal.tsx';
import { PersonnelExportModal } from './components/PersonnelExportModal.tsx';
import { LiveAnnouncer } from './components/LiveAnnouncer.tsx';
import {
  evaluatePersonnelReadiness,
  computeOperationalMetrics,
} from './utils/readinessRules.ts';
import { RotateCcw, Shield, Check, FileText, AlertTriangle, Eye, Palette, Building2 } from 'lucide-react';

export default function App() {
  // Navigation State
  const [activeSection, setActiveSection] = useState<NavigationSection>('dashboard');

  // Application Data States (with localStorage backing)
  const [personnelList, setPersonnelList] = useState<PersonnelRecord[]>(() => {
    try {
      const saved = localStorage.getItem('prot_ops_personnel_v2');
      return saved ? JSON.parse(saved) : INITIAL_PERSONNEL;
    } catch {
      return INITIAL_PERSONNEL;
    }
  });

  const [incidentList, setIncidentList] = useState<IncidentReport[]>(() => {
    try {
      const saved = localStorage.getItem('prot_ops_incidents_v2');
      return saved ? JSON.parse(saved) : INITIAL_INCIDENTS;
    } catch {
      return INITIAL_INCIDENTS;
    }
  });

  const [cyberItems, setCyberItems] = useState<CyberHygieneItem[]>(() => {
    try {
      const saved = localStorage.getItem('prot_ops_cyber_v2');
      return saved ? JSON.parse(saved) : INITIAL_CYBER_ITEMS;
    } catch {
      return INITIAL_CYBER_ITEMS;
    }
  });

  const [checklistItems, setChecklistItems] = useState<PreDeploymentChecklistItem[]>(() => {
    try {
      const saved = localStorage.getItem('prot_ops_checklist_v2');
      return saved ? JSON.parse(saved) : INITIAL_CHECKLIST;
    } catch {
      return INITIAL_CHECKLIST;
    }
  });

  // Theme Settings State
  const [currentThemeId, setCurrentThemeId] = useState<string>(() => {
    try {
      return localStorage.getItem('prot_ops_theme_v2') || DEFAULT_THEME_ID;
    } catch {
      return DEFAULT_THEME_ID;
    }
  });

  const [isCustomThemeActive, setIsCustomThemeActive] = useState<boolean>(() => {
    try {
      return localStorage.getItem('prot_ops_is_custom_theme_v2') === 'true';
    } catch {
      return false;
    }
  });

  const [customTheme, setCustomTheme] = useState<CustomThemeSettings>(() => {
    try {
      const saved = localStorage.getItem('prot_ops_custom_theme_v2');
      return saved
        ? JSON.parse(saved)
        : {
            primary: '#1e3a8a',
            bg: '#f8fafc',
            surface: '#ffffff',
            text: '#0f172a',
            border: '#cbd5e1',
          };
    } catch {
      return {
        primary: '#1e3a8a',
        bg: '#f8fafc',
        surface: '#ffffff',
        text: '#0f172a',
        border: '#cbd5e1',
      };
    }
  });

  // Independent Logo Branding States
  const [topLogo, setTopLogo] = useState<LogoConfig>(() => {
    try {
      const saved = localStorage.getItem('prot_ops_top_logo_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.dataUrl && !isSafeImageDataUrl(parsed.dataUrl)) {
          parsed.dataUrl = null;
        }
        return parsed;
      }
      return DEFAULT_TOP_LOGO;
    } catch {
      return DEFAULT_TOP_LOGO;
    }
  });

  const [bottomLogo, setBottomLogo] = useState<LogoConfig>(() => {
    try {
      const saved = localStorage.getItem('prot_ops_bottom_logo_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.dataUrl && !isSafeImageDataUrl(parsed.dataUrl)) {
          parsed.dataUrl = null;
        }
        return parsed;
      }
      return DEFAULT_BOTTOM_LOGO;
    } catch {
      return DEFAULT_BOTTOM_LOGO;
    }
  });

  // Accessibility Settings State
  const [accessibilitySettings, setAccessibilitySettings] = useState<AccessibilitySettings>(() => {
    try {
      const saved = localStorage.getItem('prot_ops_a11y_v2');
      return saved ? JSON.parse(saved) : DEFAULT_ACCESSIBILITY_SETTINGS;
    } catch {
      return DEFAULT_ACCESSIBILITY_SETTINGS;
    }
  });

  // Modal Visibility States
  const [isDemoNoticeOpen, setIsDemoNoticeOpen] = useState(false);
  const [isBrandingOpen, setIsBrandingOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isAccessibilityOpen, setIsAccessibilityOpen] = useState(false);

  // Operational Modals
  const [isPersonnelModalOpen, setIsPersonnelModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<PersonnelRecord | null>(null);
  const [detailPerson, setDetailPerson] = useState<PersonnelRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [summaryTargetPerson, setSummaryTargetPerson] = useState<PersonnelRecord | null>(null);
  const [exportPerson, setExportPerson] = useState<PersonnelRecord | null | undefined>(undefined);

  // Feedback & Screen Reader Announcements
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState<string | null>(null);

  const announce = (msg: string) => {
    setLiveAnnouncement(msg);
    setTimeout(() => setLiveAnnouncement(null), 3000);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    announce(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('prot_ops_personnel_v2', JSON.stringify(personnelList));
    } catch {}
  }, [personnelList]);

  useEffect(() => {
    try {
      localStorage.setItem('prot_ops_incidents_v2', JSON.stringify(incidentList));
    } catch {}
  }, [incidentList]);

  useEffect(() => {
    try {
      localStorage.setItem('prot_ops_cyber_v2', JSON.stringify(cyberItems));
    } catch {}
  }, [cyberItems]);

  useEffect(() => {
    try {
      localStorage.setItem('prot_ops_checklist_v2', JSON.stringify(checklistItems));
    } catch {}
  }, [checklistItems]);

  useEffect(() => {
    try {
      localStorage.setItem('prot_ops_theme_v2', currentThemeId);
      localStorage.setItem('prot_ops_is_custom_theme_v2', String(isCustomThemeActive));
      localStorage.setItem('prot_ops_custom_theme_v2', JSON.stringify(customTheme));
    } catch {}
  }, [currentThemeId, isCustomThemeActive, customTheme]);

  useEffect(() => {
    try {
      localStorage.setItem('prot_ops_top_logo_v2', JSON.stringify(topLogo));
      localStorage.setItem('prot_ops_bottom_logo_v2', JSON.stringify(bottomLogo));
    } catch {}
  }, [topLogo, bottomLogo]);

  useEffect(() => {
    try {
      localStorage.setItem('prot_ops_a11y_v2', JSON.stringify(accessibilitySettings));
    } catch {}
  }, [accessibilitySettings]);

  // Apply Accessibility attributes to <html> root
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-text-size', accessibilitySettings.textSize);
    root.setAttribute('data-contrast', accessibilitySettings.contrast);
    root.setAttribute('data-color-mode', accessibilitySettings.colorMode);
    root.setAttribute('data-reduced-motion', String(accessibilitySettings.reducedMotion));
    root.setAttribute('data-focus-ring', String(accessibilitySettings.focusRing));
    root.setAttribute('data-large-targets', String(accessibilitySettings.largeTargets));
    root.setAttribute('data-line-spacing', accessibilitySettings.lineSpacing);
    root.setAttribute('data-letter-spacing', accessibilitySettings.letterSpacing);
    root.setAttribute('data-dyslexic', String(accessibilitySettings.dyslexicFont));
  }, [accessibilitySettings]);

  // Active theme tokens
  const activePreset = useMemo(() => {
    return THEME_PRESETS.find((p) => p.id === currentThemeId) || THEME_PRESETS[0];
  }, [currentThemeId]);

  const activeColors = useMemo(() => {
    if (isCustomThemeActive) {
      return {
        bg: customTheme.bg,
        surface: customTheme.surface,
        surfaceSubtle: customTheme.bg,
        border: customTheme.border,
        text: customTheme.text,
        textMuted: customTheme.text,
        primary: customTheme.primary,
        primaryHover: customTheme.primary,
        primaryText: '#ffffff',
        headerBg: '#0f172a',
        headerBorder: '#1e293b',
        navBg: '#1e293b',
        navBorder: '#334155',
        accent: customTheme.primary,
        isDark: false,
        isHighContrast: false,
      };
    }
    return activePreset.colors;
  }, [isCustomThemeActive, customTheme, activePreset]);

  // Metrics computation for badge counters
  const metrics = computeOperationalMetrics(personnelList);
  const openIncidentsCount = incidentList.filter((i) => i.status !== 'Documented & Filed').length;
  const outstandingChecklistCount = checklistItems.filter((i) => i.status === 'Incomplete').length;

  // Handlers for Personnel
  const handleOpenAddPersonnel = () => {
    setEditingPerson(null);
    setIsPersonnelModalOpen(true);
    announce('Opened Add Personnel Record form');
  };

  const handleOpenEditPersonnel = (person: PersonnelRecord) => {
    setEditingPerson(person);
    setIsPersonnelModalOpen(true);
    announce(`Opened edit form for ${person.displayName || person.fullName}`);
  };

  const handleOpenDetailModal = (person: PersonnelRecord) => {
    setDetailPerson(person);
    setIsDetailModalOpen(true);
    announce(`Viewing readiness dossier for ${person.displayName || person.fullName}`);
  };

  const handleOpenReadinessSummary = (person?: PersonnelRecord) => {
    setSummaryTargetPerson(person || null);
    setIsSummaryModalOpen(true);
    announce('Opened Plain-English Readiness Summary briefing');
  };

  const handleOpenExportPersonnel = (person?: PersonnelRecord | null) => {
    setExportPerson(person ?? null);
    announce(
      person
        ? `Exporting personnel record for ${person.displayName || person.fullName}`
        : 'Exporting entire personnel roster'
    );
  };

  const handleSavePersonnel = (savedPerson: PersonnelRecord) => {
    if (editingPerson) {
      setPersonnelList((prev) =>
        prev.map((p) => (p.id === savedPerson.id ? savedPerson : p))
      );
      showToast(`Updated record for ${savedPerson.displayName || savedPerson.fullName}`);
    } else {
      setPersonnelList((prev) => [savedPerson, ...prev]);
      showToast(`Created record for ${savedPerson.displayName || savedPerson.fullName}`);
    }
    setIsPersonnelModalOpen(false);
    setEditingPerson(null);
  };

  const handleDeletePersonnel = (id: string) => {
    setPersonnelList((prev) => prev.filter((p) => p.id !== id));
    showToast('Personnel record removed from demonstration roster.');
    if (detailPerson?.id === id) {
      setIsDetailModalOpen(false);
      setDetailPerson(null);
    }
  };

  const handleUpdateSupervisorReview = (
    personId: string,
    supervisorName: string,
    reviewNotes: string
  ) => {
    const today = '2026-10-15';
    setPersonnelList((prev) =>
      prev.map((p) => {
        if (p.id === personId) {
          return {
            ...p,
            lastSupervisorReviewDate: today,
            reviewedBy: supervisorName,
            requiresReview: false,
            notes: p.notes
              ? `${p.notes}\n[${today} - ${supervisorName}]: ${reviewNotes}`
              : `[${today} - ${supervisorName}]: ${reviewNotes}`,
            administrativeNotes: p.administrativeNotes
              ? `${p.administrativeNotes}\n[${today} - ${supervisorName}]: ${reviewNotes}`
              : `[${today} - ${supervisorName}]: ${reviewNotes}`,
          };
        }
        return p;
      })
    );

    setDetailPerson((prev) =>
      prev && prev.id === personId
        ? {
            ...prev,
            lastSupervisorReviewDate: today,
            reviewedBy: supervisorName,
            requiresReview: false,
            notes: prev.notes
              ? `${prev.notes}\n[${today} - ${supervisorName}]: ${reviewNotes}`
              : `[${today} - ${supervisorName}]: ${reviewNotes}`,
          }
        : prev
    );

    showToast(`Supervisory review logged by ${supervisorName}`);
  };

  const handleResolveRequirement = (personId: string, requirementText: string) => {
    setPersonnelList((prev) =>
      prev.map((p) => {
        if (p.id === personId) {
          const updated = (p.outstandingRequirements || []).filter((r) => r !== requirementText);
          return {
            ...p,
            outstandingRequirements: updated,
            tasksCompleted: (p.tasksCompleted || 0) + 1,
            tasksOutstanding: Math.max(0, (p.tasksOutstanding || 1) - 1),
          };
        }
        return p;
      })
    );

    setDetailPerson((prev) =>
      prev && prev.id === personId
        ? {
            ...prev,
            outstandingRequirements: (prev.outstandingRequirements || []).filter(
              (r) => r !== requirementText
            ),
            tasksCompleted: (prev.tasksCompleted || 0) + 1,
            tasksOutstanding: Math.max(0, (prev.tasksOutstanding || 1) - 1),
          }
        : prev
    );

    showToast(`Marked requirement resolved: "${requirementText.slice(0, 32)}..."`);
  };

  // Handlers for Incidents
  const handleAddIncident = (newReport: IncidentReport) => {
    setIncidentList((prev) => [newReport, ...prev]);
    showToast(`Incident report ${newReport.referenceNumber} recorded.`);
  };

  const handleUpdateIncidentStatus = (id: string, status: IncidentReport['status']) => {
    setIncidentList((prev) =>
      prev.map((inc) => (inc.id === id ? { ...inc, status } : inc))
    );
    showToast(`Incident status updated to: ${status}`);
  };

  // Handlers for Cybersecurity Hygiene
  const handleUpdateCyberStatus = (id: string, status: CyberHygieneItem['status']) => {
    setCyberItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const completed = status === 'Completed';
          return {
            ...item,
            completed,
            status,
            lastChecked: '2026-10-15',
          };
        }
        return item;
      })
    );
    showToast('Cybersecurity item verification status updated.');
  };

  const handleRunCyberAudit = () => {
    const today = '2026-10-15';
    setCyberItems((prev) =>
      prev.map((item) => ({
        ...item,
        lastAuditedDate: today,
        auditedBy: 'Ops Security Team (Automated Session)',
      }))
    );
    showToast('Cybersecurity administrative audit completed across all 10 operational domains.');
  };

  const handleSaveCyberItem = (item: CyberHygieneItem) => {
    setCyberItems((prev) => {
      const exists = prev.some((i) => i.id === item.id);
      if (exists) {
        return prev.map((i) => (i.id === item.id ? item : i));
      }
      return [item, ...prev];
    });
    showToast(`Saved cybersecurity record: ${item.domain}`);
  };

  const handleDeleteCyberItem = (id: string) => {
    setCyberItems((prev) => prev.filter((i) => i.id !== id));
    showToast('Cybersecurity requirement removed.');
  };

  // Handlers for Pre-Deployment Checklist
  const handleUpdateChecklistStatus = (id: string, status: PreDeploymentStatus) => {
    setChecklistItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status,
              completed: status === 'Complete',
            }
          : item
      )
    );
    showToast(`Checklist task status updated to ${status}.`);
  };

  const handleSignOffChecklistTask = (id: string, reviewerName: string) => {
    setChecklistItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: 'Complete',
              completed: true,
              requiresHumanReview: false,
              reviewedBy: reviewerName,
              reviewDate: '2026-10-15',
            }
          : item
      )
    );
    showToast(`Task reviewed and signed off by ${reviewerName}.`);
  };

  const handleAddChecklistTask = (newTask: PreDeploymentChecklistItem) => {
    setChecklistItems((prev) => [newTask, ...prev]);
    showToast(`Checklist task "${newTask.task}" added.`);
  };

  const handleResetChecklistScenario = () => {
    setChecklistItems(INITIAL_CHECKLIST);
    showToast('Pre-deployment checklist reset to standard deployment scenario.');
  };

  const handleResetDemoData = () => {
    setPersonnelList(INITIAL_PERSONNEL);
    setIncidentList(INITIAL_INCIDENTS);
    setCyberItems(INITIAL_CYBER_ITEMS);
    setChecklistItems(INITIAL_CHECKLIST);
    try {
      localStorage.removeItem('prot_ops_personnel_v2');
      localStorage.removeItem('prot_ops_incidents_v2');
      localStorage.removeItem('prot_ops_cyber_v2');
      localStorage.removeItem('prot_ops_checklist_v2');
    } catch {}
    showToast('Reset all demonstration data to baseline prototype state.');
  };

  // Theme Handlers
  const handleSelectTheme = (themeId: string) => {
    setCurrentThemeId(themeId);
    setIsCustomThemeActive(false);
    const theme = THEME_PRESETS.find((p) => p.id === themeId);
    showToast(`Theme applied: ${theme?.name || themeId}`);
  };

  const handleActivateCustomTheme = () => {
    setIsCustomThemeActive(true);
    showToast('Custom theme palette activated.');
  };

  const handleResetLogos = () => {
    setTopLogo(DEFAULT_TOP_LOGO);
    setBottomLogo(DEFAULT_BOTTOM_LOGO);
    showToast('Restored default organisation branding layout.');
  };

  const handleResetAccessibility = () => {
    setAccessibilitySettings(DEFAULT_ACCESSIBILITY_SETTINGS);
    showToast('Accessibility settings reset to default.');
  };

  const showBottomLogoLeft =
    bottomLogo.enabled && isSafeImageDataUrl(bottomLogo.dataUrl) && bottomLogo.position === 'bottom-left';
  const showBottomLogoRight =
    bottomLogo.enabled && isSafeImageDataUrl(bottomLogo.dataUrl) && bottomLogo.position === 'bottom-right';

  return (
    <div
      className="min-h-screen flex flex-col antialiased transition-colors duration-150"
      style={{
        backgroundColor: activeColors.bg,
        color: activeColors.text,
      }}
    >
      {/* Accessible Skip Link */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Screen Reader Live Notification Announcer */}
      <LiveAnnouncer announcement={liveAnnouncement} />

      {/* Top Header Banner & Safety Principles */}
      <HeaderBanner
        requiringReviewCount={metrics.requiringHumanReviewCount}
        expiredCertsCount={metrics.expiredCertsCount}
        onOpenNotice={() => setIsDemoNoticeOpen(true)}
        onOpenBranding={() => setIsBrandingOpen(true)}
        onOpenTheme={() => setIsThemeOpen(true)}
        onOpenAccessibility={() => setIsAccessibilityOpen(true)}
        topLogo={topLogo}
        themeCamoPattern={activeColors.camoPattern}
      />

      {/* Navigation Bar */}
      <Navbar
        activeSection={activeSection}
        onSelectSection={(section) => {
          setActiveSection(section);
          announce(`Navigated to ${section} view`);
        }}
        personnelReviewCount={metrics.requiringHumanReviewCount}
        openIncidentsCount={openIncidentsCount}
        outstandingChecklistCount={outstandingChecklistCount}
      />

      {/* Main View Area */}
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 focus:outline-none"
      >
        {activeSection === 'dashboard' && (
          <DashboardView
            personnelList={personnelList}
            incidentList={incidentList}
            checklistItems={checklistItems}
            onNavigate={(sec) => {
              setActiveSection(sec);
              announce(`Navigated to ${sec}`);
            }}
            onSelectPersonnel={handleOpenDetailModal}
            onOpenAddPersonnel={handleOpenAddPersonnel}
          />
        )}

        {activeSection === 'personnel' && (
          <PersonnelReadinessView
            personnelList={personnelList}
            onOpenAddModal={handleOpenAddPersonnel}
            onOpenEditModal={handleOpenEditPersonnel}
            onOpenDetailModal={handleOpenDetailModal}
            onDeletePerson={handleDeletePersonnel}
            onOpenReadinessSummary={handleOpenReadinessSummary}
            onResolveRequirement={handleResolveRequirement}
            onOpenExport={handleOpenExportPersonnel}
          />
        )}

        {activeSection === 'incidents' && (
          <IncidentReportsView
            incidents={incidentList}
            onAddIncident={handleAddIncident}
            onUpdateStatus={handleUpdateIncidentStatus}
          />
        )}

        {activeSection === 'cybersecurity' && (
          <CyberHygieneView
            items={cyberItems}
            onUpdateStatus={handleUpdateCyberStatus}
            onRunAudit={handleRunCyberAudit}
            onSaveItem={handleSaveCyberItem}
            onDeleteItem={handleDeleteCyberItem}
          />
        )}

        {activeSection === 'checklist' && (
          <PreDeploymentChecklistView
            items={checklistItems}
            scenario={DEFAULT_FICTIONAL_SCENARIO}
            onUpdateStatus={handleUpdateChecklistStatus}
            onSignOffTask={handleSignOffChecklistTask}
            onAddTask={handleAddChecklistTask}
            onResetScenario={handleResetChecklistScenario}
          />
        )}
      </main>

      {/* Footer & Compliance Principles */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 py-6 px-4 sm:px-6 lg:px-8 text-xs relative">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Left Footer: Bottom-Left Logo + Info */}
          <div className="flex items-center space-x-3 text-center md:text-left">
            {showBottomLogoLeft && (
              <div className="shrink-0 bg-white/10 p-1 rounded-md border border-white/20">
                <img
                  src={bottomLogo.dataUrl!}
                  alt={bottomLogo.altText || 'Organisation Bottom-Left Logo'}
                  style={{ height: `${bottomLogo.height}px` }}
                  className="object-contain max-w-[130px]"
                />
              </div>
            )}

            <div className="space-y-1">
              <SaferWordmark variant="footer" />
              <p className="text-[11px] text-slate-400 pl-1">
                Independent Portfolio Prototype. Sample and Unverified Records for Demonstration Purposes Only.
              </p>
            </div>
          </div>

          {/* Center / Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {/* Clickable DEMONSTRATION NOTICE Link */}
            <button
              type="button"
              onClick={() => setIsDemoNoticeOpen(true)}
              className="inline-flex items-center px-2.5 py-1.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 transition cursor-pointer underline underline-offset-2"
              title="View full demonstration notice and legal disclosures"
            >
              DEMONSTRATION NOTICE
            </button>

            <button
              type="button"
              onClick={() => handleOpenReadinessSummary()}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-blue-300 hover:text-white transition border border-slate-700"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Readiness Briefing (.txt)</span>
            </button>

            <button
              type="button"
              onClick={handleResetDemoData}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700"
              title="Reset all demo records back to baseline"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Records</span>
            </button>

            {/* Bottom-Right Logo if configured */}
            {showBottomLogoRight && (
              <div className="shrink-0 bg-white/10 p-1 rounded-md border border-white/20 ml-2">
                <img
                  src={bottomLogo.dataUrl!}
                  alt={bottomLogo.altText || 'Organisation Bottom-Right Logo'}
                  style={{ height: `${bottomLogo.height}px` }}
                  className="object-contain max-w-[130px]"
                />
              </div>
            )}
          </div>
        </div>
      </footer>

      {/* Accessible Demonstration Notice Modal */}
      <DemonstrationNoticeModal
        isOpen={isDemoNoticeOpen}
        onClose={() => setIsDemoNoticeOpen(false)}
      />

      {/* Organisation Branding Settings Modal */}
      <BrandingSettingsModal
        isOpen={isBrandingOpen}
        onClose={() => setIsBrandingOpen(false)}
        topLogo={topLogo}
        bottomLogo={bottomLogo}
        onUpdateTopLogo={(partial) => setTopLogo((prev) => ({ ...prev, ...partial }))}
        onUpdateBottomLogo={(partial) => setBottomLogo((prev) => ({ ...prev, ...partial }))}
        onResetLogos={handleResetLogos}
      />

      {/* Theme Settings Modal */}
      <ThemeSettingsModal
        isOpen={isThemeOpen}
        onClose={() => setIsThemeOpen(false)}
        currentThemeId={currentThemeId}
        onSelectTheme={handleSelectTheme}
        customTheme={customTheme}
        onUpdateCustomTheme={(partial) => setCustomTheme((prev) => ({ ...prev, ...partial }))}
        isCustomActive={isCustomThemeActive}
        onActivateCustomTheme={handleActivateCustomTheme}
      />

      {/* Accessibility Preferences Modal */}
      <AccessibilityMenuModal
        isOpen={isAccessibilityOpen}
        onClose={() => setIsAccessibilityOpen(false)}
        settings={accessibilitySettings}
        onUpdateSettings={(partial) =>
          setAccessibilitySettings((prev) => ({ ...prev, ...partial }))
        }
        onResetSettings={handleResetAccessibility}
      />

      {/* Personnel Record Create/Edit Modal */}
      <PersonnelModal
        isOpen={isPersonnelModalOpen}
        onClose={() => {
          setIsPersonnelModalOpen(false);
          setEditingPerson(null);
        }}
        onSave={handleSavePersonnel}
        initialRecord={editingPerson}
      />

      {/* Personnel Detail Dossier Modal */}
      <PersonnelDetailModal
        isOpen={isDetailModalOpen}
        person={detailPerson}
        onClose={() => {
          setIsDetailModalOpen(false);
          setDetailPerson(null);
        }}
        onEdit={(person) => {
          setIsDetailModalOpen(false);
          handleOpenEditPersonnel(person);
        }}
        onUpdateSupervisorReview={handleUpdateSupervisorReview}
        onOpenSummary={(person) => {
          handleOpenReadinessSummary(person);
        }}
        onResolveRequirement={handleResolveRequirement}
        onExport={handleOpenExportPersonnel}
      />

      {/* Plain-English Readiness Summary Modal */}
      <ReadinessSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => {
          setIsSummaryModalOpen(false);
          setSummaryTargetPerson(null);
        }}
        selectedPerson={summaryTargetPerson}
        roster={personnelList}
      />

      {/* Personnel Export Modal (TXT, CSV, XLSX, PDF, DOCX with redaction controls) */}
      <PersonnelExportModal
        isOpen={exportPerson !== undefined}
        onClose={() => setExportPerson(undefined)}
        person={exportPerson || null}
        personnelList={personnelList}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-lg border border-slate-700 flex items-center space-x-2 text-xs animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <Check className="w-4 h-4 text-teal-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
