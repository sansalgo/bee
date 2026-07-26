import { LobbyClient } from "./lobby-client"

export default async function LobbyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  return <LobbyClient code={code.toUpperCase()} />
}
