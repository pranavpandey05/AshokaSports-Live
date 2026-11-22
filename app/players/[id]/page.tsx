import { PlayerProfileClient } from "@/components/PlayerProfileClient";

interface PlayerPageProps {
  params: Promise<{ id: string }>;
}

export default async function PlayerProfilePage({ params }: PlayerPageProps) {
  const { id } = await params;
  return <PlayerProfileClient playerId={id} />;
}
