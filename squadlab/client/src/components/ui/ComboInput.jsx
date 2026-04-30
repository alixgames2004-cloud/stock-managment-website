import React, { useState, useRef, useMemo, useCallback } from 'react';
import { ChevronDown, X } from 'lucide-react';

/**
 * ComboInput — Fast hybrid input with dropdown suggestions.
 *
 * Performance fixes vs previous version:
 * - No document.addEventListener — uses onBlur + setTimeout trick instead
 *   (eliminates N listeners running on every mouse event in the parent)
 * - useMemo for filtered list — no recomputation unless query/options change
 * - useCallback for all handlers — stable function references, no child re-renders
 * - Dropdown not mounted in DOM at all when closed
 * - No useEffect for syncing query — controlled directly via value prop
 */
const ComboInput = ({
  label,
  value = '',
  onChange,
  options = [],
  placeholder,
  error,
  type = 'text',
  required,
}) => {
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);

  // Only recompute when query or options change
  const filtered = useMemo(() => {
    if (!value) return options;
    const q = String(value).toLowerCase();
    return options.filter(opt => String(opt).toLowerCase().includes(q));
  }, [value, options]);

  const handleChange = useCallback((e) => {
    onChange(e.target.value);
    setOpen(true);
  }, [onChange]);

  const handleFocus = useCallback(() => setOpen(true), []);

  // onBlur fires before onClick on the list items, so delay closing
  const handleBlur = useCallback(() => {
    setTimeout(() => setOpen(false), 150);
  }, []);

  const handleSelect = useCallback((opt) => {
    onChange(opt);
    setOpen(false);
    inputRef.current?.blur();
  }, [onChange]);

  const handleClear = useCallback((e) => {
    e.preventDefault(); // prevent blur before clear
    onChange('');
    inputRef.current?.focus();
  }, [onChange]);

  const toggleDropdown = useCallback((e) => {
    e.preventDefault();
    setOpen(prev => !prev);
    if (!open) inputRef.current?.focus();
  }, [open]);

  return (
    <div className="w-full relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          type={type}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          required={required}
          className={`w-full rounded-lg border px-3 py-2 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
            error ? 'border-red-400 focus:ring-red-400' : 'border-gray-300'
          }`}
        />

        {/* Icon buttons — use onMouseDown with preventDefault to avoid blur */}
        <div className="absolute right-0 top-0 h-full flex items-center pr-1 gap-0.5">
          {value !== '' && value !== undefined && (
            <button
              type="button"
              onMouseDown={handleClear}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
              tabIndex={-1}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {options.length > 0 && (
            <button
              type="button"
              onMouseDown={toggleDropdown}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
              tabIndex={-1}
            >
              <ChevronDown className={`w-4 h-4 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Dropdown — only mounted when open */}
      {open && options.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-44 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400 italic">
              Nouvelle valeur : "{value}"
            </div>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt}
                type="button"
                onMouseDown={() => handleSelect(opt)}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  String(opt) === String(value)
                    ? 'bg-primary-50 text-primary-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {opt}
              </button>
            ))
          )}
        </div>
      )}

      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default ComboInput;
