import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "../api/client";

interface Options {
  // Re-fetch in the background every N ms while the tab is visible.
  pollMs?: number;
}

// Loads data for a component: loading / error / data, reload(), optional
// polling. Responses that arrive after a newer request are ignored.
export function useAsync<T>(load: () => Promise<T>, deps: unknown[], options: Options = {}) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const loadRef = useRef(load);
  loadRef.current = load;
  const requestId = useRef(0);

  const run = useCallback(async (background: boolean) => {
    const id = ++requestId.current;

    if (!background) setLoading(true);

    try {
      const result = await loadRef.current();

      if (id !== requestId.current) return;

      setData(result);
      setError(null);
      setUpdatedAt(new Date());
    } catch (err) {
      if (id !== requestId.current) return;

      setError(errorMessage(err));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void run(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (!options.pollMs) return;

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void run(true);
    }, options.pollMs);

    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.pollMs, run, ...deps]);

  const reload = useCallback(() => run(true), [run]);

  return { data, error, loading, updatedAt, reload };
}
