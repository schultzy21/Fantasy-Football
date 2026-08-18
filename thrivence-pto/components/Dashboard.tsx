"use client";

import { useCallback, useEffect, useState } from "react";
import CalendarView from "@/components/CalendarView";
import AddPtoForm from "@/components/AddPtoForm";
import UpcomingList from "@/components/UpcomingList";
import type { PtoEntry } from "@/lib/types";

export default function Dashboard() {
  const [entries, setEntries] = useState<PtoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/entries");
      const data = await res.json();
      setEntries(data.entries || []);
      setConfigured(data.configured !== false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!loading && !configured) {
    return (
      <section className="card">
        <div className="card-accent" />
        <div className="card-body">
          <p className="section-eyebrow">Setup needed</p>
          <h2>Supabase isn&apos;t connected yet</h2>
          <p>
            This dashboard needs a Supabase project to store PTO entries. See
            README.md for the one-time setup steps.
          </p>
        </div>
      </section>
    );
  }

  return (
    <>
      <CalendarView entries={entries} />
      <AddPtoForm onAdded={load} />
      <UpcomingList entries={entries} />
    </>
  );
}
