import { MatchCenterClient } from "@/components/MatchCenterClient";

interface MatchPageProps {
  params: Promise<{ id: string }>;
}

export default async function MatchDetailsPage({ params }: MatchPageProps) {
  const { id } = await params;
  return <MatchCenterClient matchId={id} />;
}
