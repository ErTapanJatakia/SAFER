import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Check, Plus, ChevronDown, ChevronUp } from 'lucide-react';

interface SearchableMultiSelectProps {
  label: string;
  options: string[];
  selectedValues: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  allowCustomOther?: boolean;
  required?: boolean;
  error?: string | null;
}

export const SearchableMultiSelect: React.FC<SearchableMultiSelectProps> = ({
  label,
  options,
  selectedValues,
  onChange,
  placeholder = 'Search and select...',
  allowCustomOther = true,
  required = false,
  error = null,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [otherText, setOtherText] = useState('');
  const [showOtherInput, setShowOtherInput] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleOption = (opt: string) => {
    if (selectedValues.includes(opt)) {
      onChange(selectedValues.filter((v) => v !== opt));
    } else {
      onChange([...selectedValues, opt]);
    }
  };

  const removeValue = (val: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedValues.filter((v) => v !== val));
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (otherText.trim() && !selectedValues.includes(otherText.trim())) {
      onChange([...selectedValues, otherText.trim()]);
      setOtherText('');
      setShowOtherInput(false);
    }
  };

  return (
    <div ref={containerRef} className="space-y-1.5 relative">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-800">
          {label} {required && <span className="text-rose-600">*</span>}
        </label>
        {selectedValues.length > 0 && (
          <span className="text-[11px] font-medium text-slate-500">
            {selectedValues.length} selected
          </span>
        )}
      </div>

      {/* Selected Tags Display */}
      {selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-md">
          {selectedValues.map((val) => (
            <span
              key={val}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-900 border border-blue-300 gap-1"
            >
              <span>{val}</span>
              <button
                type="button"
                onClick={(e) => removeValue(val, e)}
                className="hover:text-rose-700 p-0.5 rounded focus:outline-none"
                aria-label={`Remove ${val}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[10px] text-slate-500 hover:text-slate-800 underline ml-auto self-center"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Dropdown Toggle Trigger Button */}
      <div
        onClick={() => {
          setIsOpen(!isOpen);
          setTimeout(() => {
            if (!isOpen) searchInputRef.current?.focus();
          }, 50);
        }}
        className={`w-full px-3 py-2 bg-white border rounded-md cursor-pointer flex items-center justify-between transition text-xs ${
          error
            ? 'border-rose-400 ring-1 ring-rose-300'
            : isOpen
            ? 'border-blue-900 ring-1 ring-blue-900'
            : 'border-slate-300 hover:border-slate-400'
        }`}
        tabIndex={0}
        role="button"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className={selectedValues.length === 0 ? 'text-slate-400' : 'text-slate-700 font-medium'}>
          {selectedValues.length === 0 ? placeholder : `${selectedValues.length} item(s) selected (Click to modify)`}
        </span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
        )}
      </div>

      {error && <p className="text-[11px] text-rose-600 font-medium">{error}</p>}

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-40 left-0 right-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-xl overflow-hidden flex flex-col max-h-72 animate-in fade-in zoom-in-95 duration-100">
          {/* Search Input Box */}
          <div className="p-2 border-b border-slate-200 bg-slate-50 flex items-center space-x-2">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter list..."
              className="w-full text-xs bg-transparent focus:outline-none text-slate-900 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="overflow-y-auto p-1 divide-y divide-slate-100 text-xs">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isChecked = selectedValues.includes(opt);
                return (
                  <label
                    key={opt}
                    className={`flex items-center px-3 py-2 cursor-pointer rounded hover:bg-slate-100 transition space-x-2.5 ${
                      isChecked ? 'bg-blue-50/70 font-semibold text-blue-950' : 'text-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleOption(opt)}
                      className="rounded text-blue-900 focus:ring-blue-800"
                    />
                    <span className="flex-1">{opt}</span>
                    {isChecked && <Check className="w-3.5 h-3.5 text-blue-900 shrink-0" />}
                  </label>
                );
              })
            ) : (
              <div className="p-3 text-center text-xs text-slate-500">
                No matching presets found.
              </div>
            )}
          </div>

          {/* Optional 'Other' custom input */}
          {allowCustomOther && (
            <div className="p-2 border-t border-slate-200 bg-slate-50">
              {!showOtherInput ? (
                <button
                  type="button"
                  onClick={() => setShowOtherInput(true)}
                  className="w-full text-left text-xs font-semibold text-blue-900 hover:text-blue-800 flex items-center space-x-1.5 py-1 px-2 rounded hover:bg-blue-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add custom / unlisted option...</span>
                </button>
              ) : (
                <div className="flex items-center space-x-1.5">
                  <input
                    type="text"
                    value={otherText}
                    onChange={(e) => setOtherText(e.target.value)}
                    placeholder="Enter custom title..."
                    className="flex-1 px-2.5 py-1 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-900"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustom(e);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustom}
                    className="px-2.5 py-1 bg-blue-900 text-white rounded text-xs font-semibold hover:bg-blue-800"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowOtherInput(false);
                      setOtherText('');
                    }}
                    className="p-1 text-slate-500 hover:text-slate-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Close / Apply button */}
          <div className="p-2 bg-slate-100 border-t border-slate-200 flex justify-end">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-200"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
