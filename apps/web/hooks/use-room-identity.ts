"use client"

import { useEffect, useState } from "react"

import { loadRoomIdentity, type RoomIdentity } from "@/lib/room-storage"

export function useRoomIdentity(code: string) {
  const [identity, setIdentity] = useState<RoomIdentity | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setIdentity(loadRoomIdentity(code))
    setLoaded(true)
  }, [code])

  return { identity, loaded }
}
