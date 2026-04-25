"use client";

import { PropsWithChildren, useEffect, useMemo, useRef } from "react";
import { createClient, UsermavenProvider, usePageView } from "@usermaven/nextjs";
import { useSession } from "@/components/providers/SessionProvider";
import { useCookieConsentContext } from "@/components/providers/CookieConsentProvider";

const USERMAVEN_API_KEY =
  process.env.NEXT_PUBLIC_USERMAVEN_KEY || "UMZeHyLWV7";

type UsermavenTrackEventDetail = {
  event: string;
  payload?: Record<string, unknown>;
};

export function UsermavenAnalyticsProvider({ children }: PropsWithChildren) {
  const { user, status } = useSession();
  const { consent, isLoading } = useCookieConsentContext();
  const identifiedUserIdRef = useRef<string | null>(null);
  const queuedEventsRef = useRef<UsermavenTrackEventDetail[]>([]);
  const isAnalyticsEnabled = !isLoading && !!consent?.analytics;

  const usermavenClient = useMemo(() => {
    if (!USERMAVEN_API_KEY) return null;

    return createClient({
      key: USERMAVEN_API_KEY,
    });
  }, []);

  usePageView(isAnalyticsEnabled ? usermavenClient : null);

  useEffect(() => {
    if (!isAnalyticsEnabled || !usermavenClient || status !== "authenticated" || !user) return;

    const typedUser = user as typeof user & { id?: string };
    const userId = typedUser.id || user.email || "anonymous-user";
    const email = user.email || `${userId}@actorrating.local`;
    const [firstName = "", ...rest] = (user.name || "").trim().split(" ");
    const lastName = rest.join(" ");

    if (identifiedUserIdRef.current === userId) return;
    identifiedUserIdRef.current = userId;

    usermavenClient.id({
      id: userId,
      email,
      // Fallback value; replace with real signup date if available in session/db.
      created_at: new Date().toISOString(),
      first_name: firstName || "User",
      last_name: lastName,
      custom: {
        plan_name: "free",
      },
      company: {
        id: "actorrating",
        name: "ActorRating",
        created_at: "2024-01-01T00:00:00.000Z",
        custom: {
          plan: "startup",
          industry: "Entertainment",
          website: "https://actorrating.com",
        },
      },
    });
  }, [isAnalyticsEnabled, usermavenClient, status, user]);

  useEffect(() => {
    if (!isAnalyticsEnabled || !usermavenClient) return;

    const flushQueuedEvents = () => {
      if (!identifiedUserIdRef.current) return;
      for (const queuedEvent of queuedEventsRef.current) {
        usermavenClient.track(queuedEvent.event, queuedEvent.payload || {});
      }
      queuedEventsRef.current = [];
    };

    const onTrack = (evt: Event) => {
      const customEvent = evt as CustomEvent<UsermavenTrackEventDetail>;
      const detail = customEvent.detail;
      if (!detail?.event) return;

      if (status === "authenticated" && !identifiedUserIdRef.current) {
        queuedEventsRef.current.push(detail);
        return;
      }

      usermavenClient.track(detail.event, detail.payload || {});
    };

    flushQueuedEvents();
    window.addEventListener("usermaven:track", onTrack as EventListener);

    return () => {
      window.removeEventListener("usermaven:track", onTrack as EventListener);
    };
  }, [isAnalyticsEnabled, usermavenClient, status]);

  return <UsermavenProvider client={usermavenClient}>{children}</UsermavenProvider>;
}
