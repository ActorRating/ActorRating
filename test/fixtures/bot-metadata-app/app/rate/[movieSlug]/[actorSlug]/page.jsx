export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { movieSlug, actorSlug } = await params;
  await new Promise((resolve) => setTimeout(resolve, 200));
  return {
    title: `Rate ${actorSlug} in ${movieSlug}`,
    description: `${actorSlug} in ${movieSlug}`,
    alternates: {
      canonical: `https://actorrating.com/rate/${movieSlug}/${actorSlug}`,
    },
  };
}

export default async function PerformancePage({ params }) {
  const { movieSlug, actorSlug } = await params;
  return (
    <h1>
      {actorSlug} in {movieSlug}
    </h1>
  );
}
