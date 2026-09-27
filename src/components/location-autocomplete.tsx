'use client';

import { useEffect, useRef, useState } from 'react';

export type GeocodeResult = {
  id: string;
  label: string;
  name: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
};

type LocationAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (result: GeocodeResult) => void;
  placeholder?: string;
  label: string;
};

export function LocationAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  label
}: LocationAutocompleteProps) {
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    if (value.trim().length < 2) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return () => controller.abort();
    }

    const timeout = window.setTimeout(async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/geocode/search?q=${encodeURIComponent(value)}`, {
          signal: controller.signal
        });
        const data = await response.json();
        setResults(data.results ?? []);
        setOpen(true);
        setHighlightedIndex(-1);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setResults([]);
          setOpen(false);
        }
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(result: GeocodeResult) {
    onChange(result.name || result.city || result.label);
    onSelect(result);
    setResults([]);
    setOpen(false);
    setHighlightedIndex(-1);
  }

  return (
    <div ref={rootRef} style={{ position: 'relative', width: '100%' }}>
      <label>
        {label}
        <input
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (results.length) setOpen(true);
          }}
          onKeyDown={(e) => {
            if (!open || results.length === 0) return;

            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setHighlightedIndex((current) => (current + 1) % results.length);
            }

            if (e.key === 'ArrowUp') {
              e.preventDefault();
              setHighlightedIndex((current) => (current <= 0 ? results.length - 1 : current - 1));
            }

            if (e.key === 'Enter' && highlightedIndex >= 0) {
              e.preventDefault();
              handleSelect(results[highlightedIndex]);
            }

            if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
        />
      </label>

      {loading && <div className="small" style={{ marginTop: 4 }}>Searching…</div>}

      {open && results.length > 0 ? (
        <div
          className="card"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 20,
            marginTop: 6,
            padding: 6,
            maxHeight: 260,
            overflowY: 'auto'
          }}
        >
          <div className="stack" style={{ gap: 4 }}>
            {results.map((result, index) => (
              <button
                key={result.id}
                type="button"
                className={index === highlightedIndex ? '' : 'secondary'}
                style={{ textAlign: 'left', justifyContent: 'flex-start' }}
                onClick={() => handleSelect(result)}
              >
                <span>
                  <strong>{result.name || result.city || result.country}</strong>
                  <br />
                  <span className="small">{result.label}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
