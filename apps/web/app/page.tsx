"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"

export default function LandingPage() {
  const router = useRouter()
  const [code, setCode] = useState("")

  function handleJoin() {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return
    router.push(`/join?code=${encodeURIComponent(trimmed)}`)
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-base">Word Game</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Input
            placeholder="#"
            value={code}
            maxLength={6}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleJoin()
            }}
          />
          <Button className="w-full" disabled={!code.trim()} onClick={handleJoin}>
            Join Room
          </Button>
          <Button className="w-full" variant="outline" onClick={() => router.push("/create")}>
            Create Room
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
