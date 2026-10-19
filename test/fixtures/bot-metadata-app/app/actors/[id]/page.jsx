export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { id } = await params;
  await new Promise((resolve) => setTimeout(resolve, 200));
  return {
    title: `Actor ${id}`,
    description: `How good is ${id} really?`,
    alternates: { canonical: `https://actorrating.com/actors/${id}` },
  };
}

export default async function ActorPage({ params }) {
  const { id } = await params;
  return <h1>{id}</h1>;
}
