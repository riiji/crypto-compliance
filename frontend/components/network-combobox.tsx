'use client';

import type { JSX } from 'react';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  getNetworkOptionByCaip2,
  searchNetworkOptions,
} from '@/lib/network-options';
import { AssetBadges, NetworkAvatar } from '@/components/network-ui';

interface NetworkComboboxProps {
  describedById?: string;
  disabled?: boolean;
  onChange: (nextValue: string) => void;
  value: string;
}

function ChevronDownIcon(): JSX.Element {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 text-slate-400"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M6 9.5L12 15.5L18 9.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function NetworkCombobox({
  describedById,
  disabled = false,
  onChange,
  value,
}: NetworkComboboxProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const inputId = useId();
  const listboxId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedOption = useMemo(() => getNetworkOptionByCaip2(value), [value]);
  const baselineQuery = selectedOption?.label ?? value.trim();
  const activeQuery = isOpen ? query : baselineQuery;
  const trimmedQuery = activeQuery.trim();
  const searchQuery =
    isOpen && trimmedQuery === baselineQuery ? '' : trimmedQuery;
  const filteredOptions = useMemo(
    () => searchNetworkOptions(searchQuery),
    [searchQuery],
  );
  const leadingOption =
    isOpen && searchQuery
      ? getNetworkOptionByCaip2(trimmedQuery) ?? filteredOptions[0]
      : selectedOption;

  const showCustomOption =
    trimmedQuery.length > 0 &&
    (trimmedQuery.includes(':') || filteredOptions.length === 0) &&
    getNetworkOptionByCaip2(trimmedQuery) === undefined;
  const isCustomOptionSelected = showCustomOption && trimmedQuery === value.trim();
  const closeCombobox = useCallback(() => {
    setQuery(baselineQuery);
    setIsOpen(false);
  }, [baselineQuery]);
  const openCombobox = useCallback(() => {
    setQuery(baselineQuery);
    setIsOpen(true);
  }, [baselineQuery]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent): void {
      if (!containerRef.current?.contains(event.target as Node)) {
        closeCombobox();
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [closeCombobox, isOpen]);

  const commitSelection = useCallback(
    (nextValue: string) => {
      const normalizedValue = nextValue.trim();
      onChange(normalizedValue);
      setQuery(getNetworkOptionByCaip2(normalizedValue)?.label ?? normalizedValue);
      setIsOpen(false);
    },
    [onChange],
  );

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-center gap-3 rounded-xl border border-slate-300 bg-white px-3 py-2.5 shadow-sm transition focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200">
        <NetworkAvatar option={leadingOption} />
        <input
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls={isOpen ? listboxId : undefined}
          aria-describedby={describedById}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:text-slate-400"
          disabled={disabled}
          id={inputId}
          ref={inputRef}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={(event) => {
            openCombobox();
            event.currentTarget.select();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              closeCombobox();
              return;
            }

            if (event.key === 'Enter') {
              event.preventDefault();

              if (filteredOptions.length > 0) {
                commitSelection(filteredOptions[0].caip2);
                return;
              }

              if (showCustomOption) {
                commitSelection(trimmedQuery);
              }
            }
          }}
          placeholder="Search network, ticker, asset, or paste CAIP-2"
          role="combobox"
          spellCheck={false}
          value={activeQuery}
        />
        <button
          aria-label="Toggle network list"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
          onClick={() => {
            if (isOpen) {
              closeCombobox();
              return;
            }

            openCombobox();
            inputRef.current?.focus();
            inputRef.current?.select();
          }}
          type="button"
        >
          <ChevronDownIcon />
        </button>
      </div>

      {isOpen ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-300/30">
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Match by network, ticker, or asset
          </div>
          <div className="max-h-80 overflow-y-auto p-2" id={listboxId} role="listbox">
            {filteredOptions.map((option) => {
              const isSelected = option.caip2 === value.trim();

              return (
                <button
                  aria-selected={isSelected}
                  className="flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-slate-50"
                  key={option.id}
                  onClick={() => commitSelection(option.caip2)}
                  onMouseDown={(event) => event.preventDefault()}
                  role="option"
                  type="button"
                >
                  <NetworkAvatar option={option} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        {option.label}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        {option.family}
                      </span>
                      {isSelected ? (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                          selected
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {option.caip2}
                    </span>
                    <span className="mt-1 block text-xs text-slate-600">
                      {option.description}
                    </span>
                    <span className="mt-2 block">
                      <AssetBadges assets={option.assets} />
                    </span>
                  </span>
                </button>
              );
            })}

            {showCustomOption ? (
              <button
                aria-selected={isCustomOptionSelected}
                className="mt-1 flex w-full items-start gap-3 rounded-2xl border border-dashed border-slate-300 px-3 py-3 text-left transition hover:border-slate-400 hover:bg-slate-50"
                onClick={() => commitSelection(trimmedQuery)}
                onMouseDown={(event) => event.preventDefault()}
                role="option"
                type="button"
              >
                <NetworkAvatar />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900">
                    Use custom CAIP-2
                  </span>
                  <span className="mt-1 block font-mono text-xs text-slate-600">
                    {trimmedQuery}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    Use this when the network is not in the preset list.
                  </span>
                </span>
              </button>
            ) : null}

            {filteredOptions.length === 0 && !showCustomOption ? (
              <div className="px-3 py-4 text-sm text-slate-500">
                No networks matched this search.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
