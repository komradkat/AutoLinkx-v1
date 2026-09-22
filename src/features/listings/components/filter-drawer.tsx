'use client';

/**
 * Filter drawer, from `Ui design/mobile/00-Mobile-overview.png`.
 *
 * On mobile the filters live behind a "Filters · N" chip and open as a panel;
 * from 960px up they are always visible as the sidebar in the desktop design.
 * The toggle exists only for the narrow layout, so CSS keeps the panel open on
 * wide screens regardless of this state.
 */
import { useState } from 'react';
import type { ReactNode } from 'react';

export function FilterDrawer({
  activeFilters,
  children,
}: {
  activeFilters: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="filters-drawer">
      <button
        className="filters__summary"
        type="button"
        aria-expanded={open}
        aria-controls="filter-panel"
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">≡</span>
        Filters{activeFilters > 0 ? ` · ${activeFilters}` : ''}
      </button>
      <div className={open ? 'filters-panel is-open' : 'filters-panel'} id="filter-panel">
        {children}
      </div>
    </div>
  );
}
