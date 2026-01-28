import { Metadata } from "next";

export const metadata: Metadata = {
  title: "What Is ActorRating? — How Acting Performances Are Rated",
  description: "ActorRating breaks performances down scene by scene using clear criteria. Here’s how ratings actually work.",
  robots: "index, follow",
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

