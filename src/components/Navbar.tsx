import React from 'react';
import {
  LayoutDashboard,
  Users,
  FileText,
  ShieldCheck,
  ClipboardList,
  Menu,
  X,
} from 'lucide-react';

export type NavigationSection =
  | 'dashboard'
  | 'personnel'
  | 'incidents'
  | 'cybersecurity'
  | 'checklist';

interface NavbarProps {
  activeSection: NavigationSection;
  onSelectSection: (section: NavigationSection) => void;
  personnelReviewCount: number;
  openIncidentsCount: number;
  outstandingChecklistCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeSection,
  onSelectSection,
  personnelReviewCount,
  openIncidentsCount,
  outstandingChecklistCount = 0,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navItems = [
    {
      id: 'dashboard' as NavigationSection,
      label: '1. Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'personnel' as NavigationSection,
      label: '2. Personnel Readiness',
      icon: Users,
      badge: personnelReviewCount > 0 ? personnelReviewCount : null,
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    },
    {
      id: 'incidents' as NavigationSection,
      label: '3. Incident Reports',
      icon: FileText,
      badge: openIncidentsCount > 0 ? openIncidentsCount : null,
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
    },
    {
      id: 'cybersecurity' as NavigationSection,
      label: '4. Cybersecurity Hygiene',
      icon: ShieldCheck,
      badge: 'Defensive',
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
    },
    {
      id: 'checklist' as NavigationSection,
      label: '5. Pre-Deployment Checklist',
      icon: ClipboardList,
      badge: outstandingChecklistCount > 0 ? `${outstandingChecklistCount} Due` : null,
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    },
  ];

  const handleSelect = (id: NavigationSection) => {
    onSelectSection(id);
    setMobileMenuOpen(false);
  };

  return (
    <nav className="bg-slate-800 border-b border-slate-700 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Desktop Nav Tabs */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-900/90 text-white shadow-sm border border-blue-600/50'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-300' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge !== null && (
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full border ${item.badgeColor || 'bg-slate-700 text-slate-200'}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Current Active Indicator for Small Viewports */}
          <div className="md:hidden flex items-center space-x-2 text-white font-medium text-sm">
            <span className="text-slate-400 text-xs">Section:</span>
            <span className="font-semibold text-slate-100">
              {navItems.find((n) => n.id === activeSection)?.label}
            </span>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-700 px-2 pt-2 pb-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium ${
                  isActive
                    ? 'bg-blue-900 text-white font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-blue-300' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== null && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border ${item.badgeColor || 'bg-slate-800 text-slate-200'}`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </nav>
  );
};
