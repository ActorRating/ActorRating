"use client";

import { PropsWithChildren, useEffect, useRef } from "react";
import mixpanel from "mixpanel-browser";
import { useSession } from "@/components/providers/SessionProvider";
import { useCookieConsentContext } from "@/components/providers/CookieConsentProvider";
import { MixpanelUserTracker } from "@/components/providers/MixpanelUserTracker";

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

    const onTrack = (evt: Event) => {
      const customEvent = evt as CustomEvent<MixpanelTrackEventDetail>;
      const detail = customEvent.detail;
      if (!detail?.event) return;
      mixpanel.track(detail.event, detail.payload || {});
    };

    window.addEventListener("mixpanel:track", onTrack as EventListener);
    return () => window.removeEventListener("mixpanel:track", onTrack as EventListener);
  }, [isAnalyticsEnabled]);

  return (
    <>
      {children}
      {isAnalyticsEnabled ? (
        <MixpanelUserTracker
          user={user}
          isAuthenticated={status === "authenticated"}
        />
      ) : null}
    </>
  );
}
