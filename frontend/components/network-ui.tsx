'use client';

import type { JSX } from 'react';
import type { NetworkOption } from '@/lib/network-options';

interface NetworkAvatarProps {
  option?: NetworkOption;
  size?: 'sm' | 'md';
}

interface AssetBadgesProps {
  assets: readonly string[];
  limit?: number;
}

const avatarSizeClasses = {
  sm: 'h-9 w-9 text-[11px]',
  md: 'h-11 w-11 text-xs',
} as const;

export function NetworkAvatar({
  option,
  size = 'md',
}: NetworkAvatarProps): JSX.Element {
  const label = option?.shortLabel ?? 'CAIP';

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-2xl border font-semibold tracking-[0.12em] ${avatarSizeClasses[size]}`}
      style={{
        backgroundColor: option?.iconBackground ?? '#E2E8F0',
        borderColor: option?.iconBorder ?? '#CBD5E1',
        color: option?.iconForeground ?? '#334155',
      }}
    >
      {label}
    </span>
  );
}

export function AssetBadges({
  assets,
  limit = 4,
}: AssetBadgesProps): JSX.Element | null {
  if (assets.length === 0) {
    return null;
  }

  const visibleAssets = assets.slice(0, limit);
  const hiddenCount = assets.length - visibleAssets.length;

  return (
    <div className="flex flex-wrap gap-1.5">
      {visibleAssets.map((asset) => (
        <span
          key={asset}
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold tracking-[0.08em] text-slate-600"
        >
          {asset}
        </span>
      ))}
      {hiddenCount > 0 ? (
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-[10px] font-semibold tracking-[0.08em] text-slate-500">
          +{hiddenCount}
        </span>
      ) : null}
    </div>
  );
}
