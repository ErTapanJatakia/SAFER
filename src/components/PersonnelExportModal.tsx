import React, { useState, useMemo, useEffect } from 'react';
import type { PersonnelRecord } from '../types/index.ts';
import {
  type ExportFormat,
  type ExportableField,
  getPersonnelExportableFields,
  getRosterExportableFields,
  getSafeExportFilename,
  generateTxtExport,
  generateCsvExport,
  generateXlsxExport,
  generatePdfExport,
  generateDocxExport,
  EXPORT_LEGAL_DISCLAIMER,
} from '../utils/personnelExport.ts';
import { sanitizeErrorMessage } from '../utils/securitySanitizer.ts';
import {
  Download,
  X,
  FileText,
  FileSpreadsheet,
  FileCode,
  Shield,
  ShieldAlert,
  CheckSquare,
  Square,
  RefreshCw,
  Search,
  Eye,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface PersonnelExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: PersonnelRecord | null; // If null, exports full roster
  personnelList: PersonnelRecord[];
}

export const PersonnelExportModal: React.FC<PersonnelExportModalProps> = ({
  isOpen,
  onClose,
  person,
  personnelList,
}) => {
  const isRosterExport = !person;
  const targetRecords = useMemo(
    () => (person ? [person] : personnelList),
    [person, personnelList]
  );

  const [format, setFormat] = useState<ExportFormat>('txt');
  const [activeTab, setActiveTab] = useState<'redact' | 'preview'>('redact');
  const [fieldSearch, setFieldSearch] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);
  const [exportErrorMsg, setExportErrorMsg] = useState<string | null>(null);

  // Dynamic field list
  const allFields: ExportableField[] = useMemo(() => {
    if (person) {
      return getPersonnelExportableFields(person);
    }
    return getRosterExportableFields();
  }, [person]);

  // Sensitive field keys for default preselection
  const defaultSensitiveKeys = useMemo(() => {
    const set = new Set<string>();
    allFields.forEach((f) => {
      if (f.isSensitive) set.add(f.key);
    });
    return set;
  }, [allFields]);

  // Redacted field keys state
  const [redactedKeys, setRedactedKeys] = useState<Set<string>>(new Set());

  // Initialize with sensitive defaults when opening
  useEffect(() => {
    if (isOpen) {
      setRedactedKeys(new Set(defaultSensitiveKeys));
      setExportSuccessMsg(null);
      setActiveTab('redact');
    }
  }, [isOpen, defaultSensitiveKeys]);

  // Keyboard navigation & Escape key handling
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Toggle single field redaction
  const toggleFieldRedaction = (key: string) => {
    setRedactedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Bulk actions
  const selectAllRedactions = () => {
    const all = new Set<string>();
    allFields.forEach((f) => all.add(f.key));
    setRedactedKeys(all);
  };

  const clearAllRedactions = () => {
    setRedactedKeys(new Set());
  };

  const resetToSensitiveDefaults = () => {
    setRedactedKeys(new Set(defaultSensitiveKeys));
  };

  // Group fields by category
  const groupedFields = useMemo(() => {
    const groups: Record<string, ExportableField[]> = {};
    const query = fieldSearch.toLowerCase().trim();

    allFields.forEach((field) => {
      if (
        query &&
        !field.label.toLowerCase().includes(query) &&
        !field.category.toLowerCase().includes(query) &&
        !(field.parentGroup && field.parentGroup.toLowerCase().includes(query))
      ) {
        return;
      }

      const cat = field.category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(field);
    });

    return groups;
  }, [allFields, fieldSearch]);

  const targetIdentifier = person
    ? `${person.displayName || person.fullName} (${person.pmcEmployeeId || person.demoId || 'PMC-ID-001'} | ${person.badgeId})`
    : `Full Personnel Roster (${personnelList.length} Personnel Records)`;

  const safeFilename = getSafeExportFilename(person || personnelList, format);

  // Live preview text generator
  const previewContent = useMemo(() => {
    if (format === 'csv') {
      return generateCsvExport(person || personnelList, redactedKeys);
    }
    // For TXT, XLSX, PDF, DOCX, the TXT representation serves as the primary readable preview
    return generateTxtExport(person || personnelList, redactedKeys);
  }, [person, personnelList, redactedKeys, format]);

  // Execute download
  const handleDownload = async () => {
    try {
      setIsExporting(true);
      setExportSuccessMsg(null);

      const target = person || personnelList;
      let blob: Blob;

      if (format === 'txt') {
        const textData = generateTxtExport(target, redactedKeys);
        blob = new Blob([textData], { type: 'text/plain;charset=utf-8' });
      } else if (format === 'csv') {
        const csvData = generateCsvExport(target, redactedKeys);
        blob = new Blob([csvData], { type: 'text/csv;charset=utf-8' });
      } else if (format === 'xlsx') {
        const uint8 = generateXlsxExport(target, redactedKeys);
        blob = new Blob([uint8.buffer as ArrayBuffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
      } else if (format === 'pdf') {
        const pdfBytes = generatePdfExport(target, redactedKeys);
        blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      } else if (format === 'docx') {
        blob = await generateDocxExport(target, redactedKeys);
      } else {
        throw new Error(`Unsupported format: ${format}`);
      }

      // Trigger download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = safeFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportSuccessMsg(`Successfully generated and downloaded "${safeFilename}".`);
    } catch (err: any) {
      setExportErrorMsg(
        sanitizeErrorMessage(
          err,
          'Export document generation failed. Please try a different format or reduce selection.'
        )
      );
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-300">
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-900 text-white rounded-t-xl flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-blue-900 flex items-center justify-center text-blue-200 border border-blue-700 shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 id="export-modal-title" className="font-bold text-base text-white">
                  {isRosterExport ? 'Export Entire Personnel Roster' : 'Export Personnel Record'}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-200 border border-blue-800 uppercase tracking-wider">
                  Client-Side Only
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 font-mono">
                Target: <span className="text-amber-300">{targetIdentifier}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close export modal"
            className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning & Instructions Banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 text-xs text-amber-900 shrink-0">
          <div className="flex items-start space-x-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-semibold text-amber-950">
                Redaction & Data Protection Verification
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Checkboxes marked for redaction will have their values replaced with{' '}
                <strong className="font-mono bg-amber-100 px-1 py-0.2 rounded border border-amber-300 text-amber-950">
                  [REDACTED]
                </strong>{' '}
                in the downloaded file. Highly sensitive fields (contact details, birth dates, health particulars, addresses, and employer phone numbers) are preselected by default. Review your selections before downloading.
              </p>
            </div>
          </div>
        </div>

        {/* Format Selector Bar */}
        <div className="px-6 py-3 bg-slate-100/90 border-b border-slate-200 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Export Format:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'txt', label: '.TXT', desc: 'Plain Text', icon: FileText },
                { id: 'csv', label: '.CSV', desc: 'Comma-Separated', icon: FileSpreadsheet },
                { id: 'xlsx', label: '.XLSX', desc: 'Excel Workbook', icon: FileSpreadsheet },
                { id: 'pdf', label: '.PDF', desc: 'PDF Document', icon: FileCode },
                { id: 'docx', label: '.DOCX', desc: 'Word Document', icon: FileText },
              ].map((fmt) => {
                const Icon = fmt.icon;
                const isSelected = format === fmt.id;
                return (
                  <button
                    key={fmt.id}
                    onClick={() => setFormat(fmt.id as ExportFormat)}
                    className={`px-2.5 py-1.5 rounded text-xs font-semibold flex items-center space-x-1.5 transition border ${
                      isSelected
                        ? 'bg-blue-900 text-white border-blue-950 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{fmt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Switcher: Redactions vs Preview */}
          <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-300">
            <button
              onClick={() => setActiveTab('redact')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition flex items-center space-x-1.5 ${
                activeTab === 'redact'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Configure Redactions ({redactedKeys.size})</span>
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition flex items-center space-x-1.5 ${
                activeTab === 'preview'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview Export</span>
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {exportSuccessMsg && (
            <div className="p-3 bg-teal-50 border border-teal-300 rounded-lg flex items-center space-x-2 text-xs font-semibold text-teal-900">
              <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
              <span>{exportSuccessMsg}</span>
            </div>
          )}

          {exportErrorMsg && (
            <div role="alert" className="p-3 bg-rose-50 border border-rose-300 rounded-lg flex items-center space-x-2 text-xs font-semibold text-rose-900">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{exportErrorMsg}</span>
            </div>
          )}

          {activeTab === 'redact' ? (
            <div className="space-y-4">
              {/* Controls Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={selectAllRedactions}
                    className="px-2.5 py-1 text-xs font-semibold rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition flex items-center space-x-1"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-blue-700" />
                    <span>Select All Redactions</span>
                  </button>

                  <button
                    onClick={clearAllRedactions}
                    className="px-2.5 py-1 text-xs font-semibold rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition flex items-center space-x-1"
                  >
                    <Square className="w-3.5 h-3.5 text-slate-500" />
                    <span>Clear All Redactions</span>
                  </button>

                  <button
                    onClick={resetToSensitiveDefaults}
                    className="px-2.5 py-1 text-xs font-semibold rounded bg-white border border-amber-300 text-amber-900 hover:bg-amber-50 transition flex items-center space-x-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-amber-700" />
                    <span>Reset to Sensitive Defaults</span>
                  </button>
                </div>

                <div className="relative w-full sm:w-60">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filter fields..."
                    value={fieldSearch}
                    onChange={(e) => setFieldSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-blue-600 bg-white"
                  />
                </div>
              </div>

              {/* Redaction Field Categories */}
              <div className="space-y-4">
                {Object.keys(groupedFields).length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
                    No fields match "{fieldSearch}".
                  </div>
                ) : (
                  Object.entries(groupedFields).map(([category, fields]) => (
                    <div
                      key={category}
                      className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs"
                    >
                      <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          {category} ({fields.length})
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {fields.filter((f) => redactedKeys.has(f.key)).length} of {fields.length} redacted
                        </span>
                      </div>

                      <div className="p-3 divide-y divide-slate-100">
                        {fields.map((field) => {
                          const isRedacted = redactedKeys.has(field.key);
                          const inputId = `redact-field-${field.key.replace(/[^a-zA-Z0-9]/g, '_')}`;

                          return (
                            <label
                              key={field.key}
                              htmlFor={inputId}
                              className={`py-2 px-2 rounded flex items-center justify-between cursor-pointer transition ${
                                isRedacted ? 'bg-rose-50/60' : 'hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center space-x-3 pr-4">
                                <input
                                  type="checkbox"
                                  id={inputId}
                                  checked={isRedacted}
                                  onChange={() => toggleFieldRedaction(field.key)}
                                  className="w-4 h-4 rounded text-rose-600 border-slate-300 focus:ring-rose-500"
                                />
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <span
                                      className={`text-xs font-semibold ${
                                        isRedacted ? 'text-rose-950 line-through' : 'text-slate-800'
                                      }`}
                                    >
                                      {field.label}
                                    </span>
                                    {field.isSensitive && (
                                      <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                        Sensitive
                                      </span>
                                    )}
                                  </div>
                                  {field.parentGroup && (
                                    <span className="text-[10px] text-slate-500 block">
                                      {field.parentGroup}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                {isRedacted ? (
                                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 font-bold">
                                    [REDACTED]
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-mono text-slate-500 max-w-[200px] truncate block">
                                    {field.sampleValue || '(active)'}
                                  </span>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* Live Preview Tab */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200">
                <div className="flex items-center space-x-2">
                  <Info className="w-4 h-4 text-blue-700" />
                  <span>
                    Previewing <strong>{format.toUpperCase()}</strong> format output with{' '}
                    <strong>{redactedKeys.size}</strong> field(s) redacted.
                  </span>
                </div>
                <span className="font-mono text-[11px] text-slate-500">
                  Approx. {previewContent.length.toLocaleString()} characters
                </span>
              </div>

              <div className="border border-slate-300 rounded-lg overflow-hidden bg-slate-950 text-slate-100 font-mono text-xs p-4 max-h-[460px] overflow-y-auto whitespace-pre leading-relaxed select-text shadow-inner">
                {previewContent}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 rounded-b-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2 text-xs text-slate-600 font-mono truncate max-w-sm">
            <span className="font-bold text-slate-700">Filename:</span>
            <span className="text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 truncate">
              {safeFilename}
            </span>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-md border border-slate-300 text-slate-700 hover:bg-slate-200 transition"
            >
              Cancel
            </button>

            <button
              onClick={handleDownload}
              disabled={isExporting}
              className="px-5 py-2 text-xs font-bold rounded-md bg-blue-900 text-white hover:bg-blue-800 disabled:opacity-50 transition shadow-xs flex items-center space-x-2"
            >
              {isExporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generating {format.toUpperCase()}...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download {format.toUpperCase()}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
