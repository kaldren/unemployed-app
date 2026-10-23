"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export type TabStatus = "done" | "todo" | "optional";

export type Tab = {
  id: string;
  label: string;
  status: TabStatus;
  // Short secondary line, e.g. "3 jobs".
  meta?: string;
  content: ReactNode;
};

const ReportDirty = createContext<((id: string, dirty: boolean) => void) | null>(null);

// Lets a section form flag unsaved edits in the nav.
export function useReportDirty(id: string, dirty: boolean) {
  const report = useContext(ReportDirty);
  useEffect(() => {
    report?.(id, dirty);
  }, [report, id, dirty]);
}

// Vertical tabs on large screens, a scrolling strip on small ones. Every panel stays mounted
// so unsaved edits survive switching sections.
export function SectionTabs({ groups, initial }: { groups: { label: string; tabs: Tab[] }[]; initial: string }) {
  const [active, setActive] = useState(initial);
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());
  const panelsRef = useRef<HTMLDivElement>(null);
  const tabs = groups.flatMap((g) => g.tabs);

  const report = useCallback((id: string, d: boolean) => {
    setDirty((prev) => (prev[id] === d ? prev : { ...prev, [id]: d }));
  }, []);

  function select(id: string, focus = false) {
    setActive(id);
    if (focus) tabRefs.current.get(id)?.focus();
    // On small screens the panel sits below the strip; bring it into view.
    if (window.matchMedia("(max-width: 1023px)").matches) {
      panelsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    const i = tabs.findIndex((t) => t.id === active);
    const next =
      e.key === "ArrowDown" || e.key === "ArrowRight"
        ? (i + 1) % tabs.length
        : e.key === "ArrowUp" || e.key === "ArrowLeft"
          ? (i - 1 + tabs.length) % tabs.length
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? tabs.length - 1
              : null;
    if (next === null) return;
    e.preventDefault();
    select(tabs[next].id, true);
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-8">
      <nav aria-label="Profile sections" className="-mx-4 min-w-0 lg:sticky lg:top-6 lg:mx-0">
        <div
          role="tablist"
          aria-orientation="vertical"
          onKeyDown={onKeyDown}
          className="flex gap-2 overflow-x-auto px-4 pb-1 lg:flex-col lg:gap-5 lg:overflow-visible lg:p-0"
        >
          {groups.map((group) => (
            <div key={group.label} className="flex shrink-0 gap-2 lg:flex-col lg:gap-1">
              <p className="hidden px-3 pb-1 text-xs font-medium uppercase tracking-wide text-zinc-500 lg:block dark:text-zinc-500">
                {group.label}
              </p>
              {group.tabs.map((tab) => {
                const selected = tab.id === active;
                return (
                  <button
                    key={tab.id}
                    ref={(el) => {
                      if (el) tabRefs.current.set(tab.id, el);
                      else tabRefs.current.delete(tab.id);
                    }}
                    type="button"
                    role="tab"
                    id={`tab-${tab.id}`}
                    aria-selected={selected}
                    aria-controls={`panel-${tab.id}`}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => select(tab.id)}
                    className={`flex shrink-0 items-center gap-3 rounded-full border px-3 py-2 text-left text-sm transition-colors lg:rounded-xl lg:border-0 ${
                      selected
                        ? "max-lg:border-zinc-950 max-lg:bg-zinc-950 max-lg:text-white max-lg:dark:border-zinc-50 max-lg:dark:bg-zinc-50 max-lg:dark:text-zinc-950 lg:bg-white lg:text-zinc-950 lg:shadow-sm lg:ring-1 lg:ring-black/[.04] lg:dark:bg-zinc-900 lg:dark:text-zinc-50 lg:dark:ring-white/[.08]"
                        : "text-zinc-700 hover:text-zinc-950 max-lg:border-black/[.08] max-lg:bg-white max-lg:dark:border-white/[.12] max-lg:dark:bg-zinc-950 lg:hover:bg-black/[.04] dark:text-zinc-300 dark:hover:text-zinc-50 lg:dark:hover:bg-white/[.06]"
                    }`}
                  >
                    <StatusIcon status={tab.status} selected={selected} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="whitespace-nowrap font-medium lg:truncate">{tab.label}</span>
                      {tab.meta && (
                        <span className="hidden truncate text-xs text-zinc-500 lg:block dark:text-zinc-400">{tab.meta}</span>
                      )}
                    </span>
                    {dirty[tab.id] && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" title="Changes to save">
                        <span className="sr-only">Changes to save</span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </nav>

      <ReportDirty.Provider value={report}>
        <div ref={panelsRef} className="min-w-0 scroll-mt-4">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              role="tabpanel"
              id={`panel-${tab.id}`}
              aria-labelledby={`tab-${tab.id}`}
              hidden={tab.id !== active}
            >
              {tab.content}
            </div>
          ))}
        </div>
      </ReportDirty.Provider>
    </div>
  );
}

function StatusIcon({ status, selected }: { status: TabStatus; selected: boolean }) {
  if (status === "done") {
    return (
      <svg viewBox="0 0 20 20" aria-label="Complete" role="img" className="h-5 w-5 shrink-0 text-green-600 dark:text-green-500">
        <circle cx="10" cy="10" r="9" fill="currentColor" />
        <path d="M6 10.5l2.5 2.5L14 7.5" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === "todo") {
    return (
      <svg viewBox="0 0 20 20" aria-label="Needs attention" role="img" className="h-5 w-5 shrink-0 text-amber-500">
        <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2.6" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden
      className={`h-5 w-5 shrink-0 ${selected ? "text-current opacity-40" : "text-zinc-300 dark:text-zinc-700"}`}
    >
      <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
