import { Metadata } from "next";

export const metadata: Metadata = {
  title: "What Is ActorRating? — How Acting Performances Are Rated",
  description: "ActorRating: 570K+ performances, 208K+ actors. Quick single-slider or 5-criteria ratings. Here's how it works.",
  robots: "index, follow",
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

