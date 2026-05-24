"use client";

import useSWR from "swr";

async function fetcher(url: string): Promise<{ dms: number }> {
  const res = await fetch(url);
  if (!res.ok) return { dms: 0 };
  return res.json();
}

export function DmBadge() {
  const { data } = useSWR("/api/notifications/unread", fetcher, {
    refreshInterval: 15_000,
    refreshWhenHidden: false,
    revalidateOnFocus: true,
    dedupingInterval: 5_000,
  });

  const count = data?.dms ?? 0;
  if (count === 0) return null;

  return (
    <span className="ml-1 inline-flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold leading-none text-primary-foreground">
      {count > 9 ? "9+" : count}
    </span>
  );
}
