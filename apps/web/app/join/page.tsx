"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { MAX_NICKNAME_LENGTH, MIN_NICKNAME_LENGTH } from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { apiClient } from "@/lib/api-client"
import { saveRoomIdentity } from "@/lib/room-storage"

const formSchema = z.object({
  code: z.string().length(6, "Room codes are 6 characters"),
  nickname: z.string().trim().min(MIN_NICKNAME_LENGTH, "Enter a nickname").max(MAX_NICKNAME_LENGTH),
})

type FormValues = z.infer<typeof formSchema>

function JoinGameForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: (searchParams.get("code") ?? "").toUpperCase(),
      nickname: "",
    },
  })

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    try {
      const code = values.code.toUpperCase()
      await apiClient.getRoom(code) // validated up front for a clearer "room not found" error
      const response = await apiClient.joinRoom(code, { nickname: values.nickname })
      saveRoomIdentity({
        code,
        role: "player",
        token: response.playerToken,
        playerId: response.playerId,
        nickname: values.nickname,
      })
      router.push(`/room/${code}/lobby`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to join room")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-base">Join Room</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-1.5">
              <Label>Room code</Label>
              <Input
                {...register("code")}
                maxLength={6}
                onChange={(event) => {
                  event.target.value = event.target.value.toUpperCase()
                }}
              />
              {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Nickname</Label>
              <Input {...register("nickname")} placeholder="Nickname" />
              {errors.nickname && <p className="text-xs text-destructive">{errors.nickname.message}</p>}
            </div>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Joining..." : "Join Room"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function JoinGamePage() {
  return (
    <Suspense>
      <JoinGameForm />
    </Suspense>
  )
}
