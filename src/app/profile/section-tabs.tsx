"use client";

import { cn } from "@/lib/utils";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export type TabStatus = "done" | "todo" | "optional";

export type Tab = {
  id: string;
  label: string;
  status: TabStatus;
  content: ReactNode;
};

// Tailwind's `lg` breakpoint, below which the nav is a strip above the panel.
const BELOW_LG = "(max-width: 1023px)";

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
export function SectionTabs({ groups, initial }: { groups: { label?: string; tabs: Tab[] }[]; initial: string }) {
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
    if (window.matchMedia(BELOW_LG).matches) {
      panelsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    const i = tabs.findIndex((t) => t.id === active);
    const targets: Record<string, number> = {
      ArrowDown: i + 1,
      ArrowRight: i + 1,
      ArrowUp: i - 1,
      ArrowLeft: i - 1,
      Home: 0,
      End: tabs.length - 1,
    };
    const target = targets[e.key];
    if (target === undefined) return;
    e.preventDefault();
    select(tabs[(target + tabs.length) % tabs.length].id, true);
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-8">
      <nav aria-label="Profile sections" className="-mx-4 min-w-0 lg:sticky lg:top-6 lg:mx-0">
        <div
          role="tablist"
          aria-orientation="vertical"
          onKeyDown={onKeyDown}
          className="flex gap-2 overflow-x-auto px-4 pb-1 lg:flex-col lg:gap-6 lg:overflow-visible lg:p-0"
        >
          {groups.map((group, i) => (
            <div key={i} className="flex shrink-0 gap-2 lg:flex-col lg:gap-0.5">
              {group.label && (
                <p className="hidden px-3 pb-1 text-xs text-muted-foreground lg:block">{group.label}</p>
              )}
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
                    className={cn(
                      "flex shrink-0 items-center gap-2.5 rounded-full px-4 py-2 text-left text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 lg:rounded-lg lg:px-3",
                      selected
                        ? "bg-primary text-primary-foreground lg:bg-accent lg:text-foreground"
                        : "text-muted-foreground hover:text-foreground max-lg:bg-muted lg:hover:bg-muted",
                    )}
                  >
                    <span className="min-w-0 flex-1 whitespace-nowrap lg:truncate">{tab.label}</span>
                    <StatusIcon status={tab.status} selected={selected} />
                    {dirty[tab.id] && (
                      <span className={cn("size-2 shrink-0 rounded-full border-2 border-warning", selected && "max-lg:border-current")} title="Changes to save">
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

// Quiet by default: a check when done, a dot when something is still needed, nothing when optional.
// Always a fixed-width slot, so the unsaved-changes ring lines up across rows.
function StatusIcon({ status, selected }: { status: TabStatus; selected: boolean }) {
  return <span className="flex size-4 shrink-0 items-center justify-center">{statusMark(status, selected)}</span>;
}

function statusMark(status: TabStatus, selected: boolean) {
  if (status === "done") {
    return (
      <svg viewBox="0 0 16 16" aria-label="Complete" role="img" className={cn("size-4 shrink-0 text-success", selected && "max-lg:text-current")}>
        <path d="M3.5 8.5l3 3 6-6.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === "todo") {
    return (
      <span role="img" aria-label="Needs attention" className={cn("size-2 shrink-0 rounded-full bg-brand", selected && "max-lg:bg-current")} />
    );
  }
  return null;
}
