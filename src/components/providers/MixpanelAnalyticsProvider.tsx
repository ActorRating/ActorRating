"use client";

import { PropsWithChildren, useEffect, useRef } from "react";
import mixpanel from "mixpanel-browser";
import { useSession } from "@/components/providers/SessionProvider";
import { useCookieConsentContext } from "@/components/providers/CookieConsentProvider";

const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN || "";
let hasInitializedMixpanel = false;

type MixpanelTrackEventDetail = {
  event: string;
  payload?: Record<string, unknown>;
};

export function MixpanelAnalyticsProvider({ children }: PropsWithChildren) {
  const { user, status } = useSession();
  const { consent, isLoading } = useCookieConsentContext();
  const initializedRef = useRef(false);
  const identifiedUserIdRef = useRef<string | null>(null);
  const isAnalyticsEnabled = !isLoading && !!consent?.analytics;

  useEffect(() => {
    if (!isAnalyticsEnabled || initializedRef.current || hasInitializedMixpanel || !MIXPANEL_TOKEN) {
      if (process.env.NODE_ENV !== "production") {
        console.log("[mixpanel] init skipped", {
          isAnalyticsEnabled,
          initializedRef: initializedRef.current,
          hasInitializedMixpanel,
          hasToken: !!MIXPANEL_TOKEN,
        });
      }
      return;
    }

    mixpanel.init(MIXPANEL_TOKEN, {
      debug: process.env.NODE_ENV !== "production",
      persistence: "localStorage",
      track_pageview: true,
      autocapture: true,
      record_sessions_percent: 100,
    });
    hasInitializedMixpanel = true;
    initializedRef.current = true;
    console.log("[mixpanel] initialized");
  }, [isAnalyticsEnabled]);

  useEffect(() => {
    if (!isAnalyticsEnabled || !initializedRef.current) return;
    if (status !== "authenticated" || !user) return;

    const typedUser = user as typeof user & { id?: string };
    const userId = typedUser.id;
    if (!userId) {
      console.log("[mixpanel] identify skipped: missing user.id", {
        status,
        hasEmail: !!user.email,
      });
      return;
    }
    const email = user.email || null;

    if (identifiedUserIdRef.current === userId) return;
    identifiedUserIdRef.current = userId;

    mixpanel.identify(userId);
    console.log("[mixpanel] identify", { userId });
    mixpanel.people.set({
      $email: email,
      $name: user.name || null,
      user_id: userId,
    });
    console.log("[mixpanel] people.set", {
      userId,
      email,
      name: user.name || null,
    });
  }, [isAnalyticsEnabled, status, user]);

  useEffect(() => {
    if (!isAnalyticsEnabled || !initializedRef.current) return;

    const onTrack = (evt: Event) => {
      const customEvent = evt as CustomEvent<MixpanelTrackEventDetail>;
      const detail = customEvent.detail;
      if (!detail?.event) return;
      mixpanel.track(detail.event, detail.payload || {});
    };

    window.addEventListener("mixpanel:track", onTrack as EventListener);
    return () => window.removeEventListener("mixpanel:track", onTrack as EventListener);
  }, [isAnalyticsEnabled]);

  return <>{children}</>;
}
