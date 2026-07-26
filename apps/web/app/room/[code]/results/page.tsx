import { ResultsClient } from "./results-client"

export default async function ResultsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  return <ResultsClient code={code.toUpperCase()} />
}
