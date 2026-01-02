import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About ActorRating — Rate the acting, not the movie",
  description: "ActorRating is a platform dedicated to evaluating individual acting performances, not overall films.",
  robots: "index, follow",
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

