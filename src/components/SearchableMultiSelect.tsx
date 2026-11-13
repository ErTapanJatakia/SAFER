import React, { useEffect, useId, useRef, useState } from 'react';
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const labelId = `multiselect-label-${id}`;
  const panelId = `multiselect-panel-${id}`;
  const searchId = `multiselect-search-${id}`;
  const errorId = `multiselect-error-${id}`;

  useEffect(() => {
    if (isOpen) searchInputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleOption = (option: string) => {
    onChange(
      selectedValues.includes(option)
        ? selectedValues.filter((value) => value !== option)
        : [...selectedValues, option]
    );
  };

  const removeValue = (value: string) => {
    onChange(selectedValues.filter((item) => item !== value));
  };

  const handleAddCustom = () => {
    const value = otherText.trim();
    if (!value || selectedValues.includes(value)) return;
    onChange([...selectedValues, value]);
    setOtherText('');
    setShowOtherInput(false);
  };

  const closeFromKeyboard = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setIsOpen(false);
      triggerRef.current?.focus();
    }
  };

  return (
    <div ref={containerRef} className="space-y-1.5 relative">
      <div className="flex items-center justify-between">
        <span id={labelId} className="block text-xs font-semibold text-slate-800">
          {label} {required && <span className="text-rose-600" aria-hidden="true">*</span>}
          {required && <span className="sr-only"> (required)</span>}
        </span>
        {selectedValues.length > 0 && (
          <span className="text-[11px] font-medium text-slate-500" aria-live="polite" aria-atomic="true">
            {selectedValues.length} selected
          </span>
        )}
      </div>

      {selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-md" aria-label={`Selected ${label}`}>
          {selectedValues.map((value) => (
            <span
              key={value}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-900 border border-blue-300 gap-1"
            >
              <span>{value}</span>
              <button
                type="button"
                onClick={() => removeValue(value)}
                className="hover:text-rose-700 p-0.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-800"
                aria-label={`Remove ${value}`}
              >
                <X className="w-3 h-3" aria-hidden="true" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[10px] text-slate-500 hover:text-slate-800 underline ml-auto self-center focus-visible:ring-2 focus-visible:ring-blue-800"
          >
            Clear all
          </button>
        </div>
      )}

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={`w-full px-3 py-2 bg-white border rounded-md cursor-pointer flex items-center justify-between transition text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-800 ${
          error
            ? 'border-rose-400 ring-1 ring-rose-300'
            : isOpen
            ? 'border-blue-900 ring-1 ring-blue-900'
            : 'border-slate-300 hover:border-slate-400'
        }`}
        aria-labelledby={labelId}
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        aria-required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
      >
        <span className={selectedValues.length === 0 ? 'text-slate-400' : 'text-slate-700 font-medium'}>
          {selectedValues.length === 0 ? placeholder : `${selectedValues.length} item(s) selected (Click to modify)`}
        </span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
        )}
      </button>

      {error && (
        <p id={errorId} role="alert" className="text-[11px] text-rose-600 font-medium">
          {error}
        </p>
      )}

      {isOpen && (
        <div
          id={panelId}
          role="group"
          aria-labelledby={labelId}
          onKeyDown={closeFromKeyboard}
          className="absolute z-40 left-0 right-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-xl overflow-hidden flex flex-col max-h-72 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="p-2 border-b border-slate-200 bg-slate-50 flex items-center space-x-2">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
            <label htmlFor={searchId} className="sr-only">Filter {label} options</label>
            <input
              ref={searchInputRef}
              id={searchId}
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Filter list..."
              className="w-full text-xs bg-transparent focus:outline-none text-slate-900 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-blue-800"
                aria-label={`Clear ${label} search`}
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="overflow-y-auto p-1 divide-y divide-slate-100 text-xs">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isChecked = selectedValues.includes(option);
                return (
                  <label
                    key={option}
                    className={`flex items-center px-3 py-2 cursor-pointer rounded hover:bg-slate-100 transition space-x-2.5 ${
                      isChecked ? 'bg-blue-50/70 font-semibold text-blue-950' : 'text-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleOption(option)}
                      className="rounded text-blue-900 focus:ring-blue-800"
                    />
                    <span className="flex-1">{option}</span>
                    {isChecked && <Check className="w-3.5 h-3.5 text-blue-900 shrink-0" aria-hidden="true" />}
                  </label>
                );
              })
            ) : (
              <div className="p-3 text-center text-xs text-slate-500" role="status">
                No matching presets found.
              </div>
            )}
          </div>

          {allowCustomOther && (
            <div className="p-2 border-t border-slate-200 bg-slate-50">
              {!showOtherInput ? (
                <button
                  type="button"
                  onClick={() => setShowOtherInput(true)}
                  className="w-full text-left text-xs font-semibold text-blue-900 hover:text-blue-800 flex items-center space-x-1.5 py-1 px-2 rounded hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-800"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Add custom / unlisted option...</span>
                </button>
              ) : (
                <div className="flex items-center space-x-1.5">
                  <label htmlFor={`multiselect-custom-${id}`} className="sr-only">Add custom {label} option</label>
                  <input
                    id={`multiselect-custom-${id}`}
                    type="text"
                    value={otherText}
                    onChange={(event) => setOtherText(event.target.value)}
                    placeholder="Enter custom title..."
                    className="flex-1 px-2.5 py-1 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-900"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleAddCustom();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustom}
                    disabled={!otherText.trim()}
                    className="px-2.5 py-1 bg-blue-900 text-white rounded text-xs font-semibold hover:bg-blue-800 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue-800"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowOtherInput(false);
                      setOtherText('');
                    }}
                    className="p-1 text-slate-500 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-blue-800"
                    aria-label="Cancel adding custom option"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="p-2 bg-slate-100 border-t border-slate-200 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                triggerRef.current?.focus();
              }}
              className="px-3 py-1 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-blue-800"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
