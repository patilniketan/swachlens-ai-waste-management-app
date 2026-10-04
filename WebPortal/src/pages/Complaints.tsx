import { useEffect, useState } from "react";
import { ArrowDownWideNarrow, ChevronLeft, ChevronRight, Filter, RefreshCw } from "lucide-react";
import { getAnalytics } from "../api/analytics";
import { getComplaints, type ComplaintFilters } from "../api/complaints";
import { ComplaintTable } from "../components/ComplaintTable";
import { Async, Button, EmptyState, PageTitle } from "../components/ui";
import { useAsync } from "../hooks/useAsync";
import {
  ALL_STATUSES,
  PRIORITIES,
  STATUS_LABELS,
  type ComplaintPriority,
  type ComplaintStatus,
} from "../types";
import { timeAgo } from "../utils/format";

const PAGE_SIZE = 25;

export function Complaints() {
  const [status, setStatus] = useState<ComplaintStatus | "">("");
  const [priority, setPriority] = useState<ComplaintPriority | "">("");
  const [wasteType, setWasteType] = useState("");
  const [sort, setSort] = useState<"urgency" | "newest">("urgency");
  const [page, setPage] = useState(0);
  const [, tick] = useState(0);

  const filters: ComplaintFilters = {
    status: status || undefined,
    priority: priority || undefined,
    wasteType: wasteType || undefined,
    sort,
    take: PAGE_SIZE,
    skip: page * PAGE_SIZE,
  };

  const list = useAsync(() => getComplaints(filters), [status, priority, wasteType, sort, page], {
    pollMs: 10_000,
  });

  // Waste types that actually occur, for the filter.
  const wasteTypes = useAsync(() => getAnalytics(true), []);

  // Re-render the "updated Ns ago" label.
  useEffect(() => {
    const timer = window.setInterval(() => tick((n) => n + 1), 5_000);
    return () => window.clearInterval(timer);
  }, []);

  const resetPage = <T,>(set: (value: T) => void) => (value: T) => {
    set(value);
    setPage(0);
  };

  const clearFilters = () => {
    setStatus("");
    setPriority("");
    setWasteType("");
    setPage(0);
  };

  return (
    <>
      <PageTitle eyebrow="CASE MANAGEMENT" title="Complaints" />
      <div className="filters">
        <label className="select">
          <Filter size={16} />
          <select
            aria-label="Status"
            value={status}
            onChange={(e) => resetPage(setStatus)(e.target.value as ComplaintStatus | "")}
          >
            <option value="">All statuses</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="select">
          <select
            aria-label="Priority"
            value={priority}
            onChange={(e) => resetPage(setPriority)(e.target.value as ComplaintPriority | "")}
          >
            <option value="">All priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p.charAt(0) + p.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </label>
        <label className="select">
          <select
            aria-label="Waste type"
            value={wasteType}
            onChange={(e) => resetPage(setWasteType)(e.target.value)}
          >
            <option value="">All waste types</option>
            {wasteTypes.data?.byWasteType
              .filter((row) => row.wasteType !== "Unknown")
              .map((row) => (
                <option key={row.wasteType} value={row.wasteType}>
                  {row.wasteType}
                </option>
              ))}
          </select>
        </label>
        <label className="select">
          <ArrowDownWideNarrow size={16} />
          <select
            aria-label="Sort"
            value={sort}
            onChange={(e) => resetPage(setSort)(e.target.value as "urgency" | "newest")}
          >
            <option value="urgency">Most urgent first</option>
            <option value="newest">Newest first</option>
          </select>
        </label>
        <Button onClick={() => void list.reload()}>
          <RefreshCw size={15} />
          Refresh
        </Button>
      </div>

      <Async state={list} loadingLabel="Loading complaints…">
        {({ items, pagination }) => (
          <>
            <p className="result-count">
              {pagination.total === 0
                ? "No complaints"
                : `Showing ${pagination.skip + 1}–${pagination.skip + items.length} of ${pagination.total}`}
              <span>•</span>{" "}
              {list.loading ? "Updating…" : `Updated ${timeAgo(list.updatedAt)} (auto-refreshes every 10s)`}
            </p>
            {items.length ? (
              <>
                <ComplaintTable items={items} />
                <div className="pager">
                  <Button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                    <ChevronLeft size={16} />
                    Previous
                  </Button>
                  <span>
                    Page {page + 1} of {Math.max(1, Math.ceil(pagination.total / PAGE_SIZE))}
                  </span>
                  <Button disabled={!pagination.hasMore} onClick={() => setPage((p) => p + 1)}>
                    Next
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </>
            ) : (
              <EmptyState title="No complaints found" text="Try adjusting or clearing your filters.">
                <Button onClick={clearFilters}>Reset filters</Button>
              </EmptyState>
            )}
          </>
        )}
      </Async>
    </>
  );
}
