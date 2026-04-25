"use client";

import { useEffect, useRef } from "react";
import mixpanel from "mixpanel-browser";
import type { Session } from "next-auth";

type MixpanelUserTrackerProps = {
  user: Session["user"] | null;
  isAuthenticated: boolean;
};

export function MixpanelUserTracker({
  user,
  isAuthenticated,
}: MixpanelUserTrackerProps) {
  const lastIdentifiedRef = useRef<string | null>(null);

  useEffect(() => {
    console.log("[mixpanel] session.user", user);

    if (!isAuthenticated || !user) {
      return;
    }

    const typedUser = user as typeof user & { id?: string };
    const distinctId = typedUser.id || user.email || null;

    if (!distinctId) {
      console.log("[mixpanel] identify skipped: missing user.id and user.email");
      return;
    }

    if (lastIdentifiedRef.current === distinctId) {
      return;
    }
    lastIdentifiedRef.current = distinctId;

    mixpanel.identify(distinctId);
    mixpanel.people.set({
      email: user.email || null,
      name: user.name || null,
    });

    console.log(`Mixpanel identified user: ${distinctId}`);
  }, [isAuthenticated, user]);

  return null;
}
