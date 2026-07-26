"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import {
  DEFAULT_GAME_DURATION_SEC,
  DEFAULT_ROUND_COUNT,
  DEFAULT_TURN_TIME_LIMIT_SEC,
  DuplicatePolicy,
  EndCondition,
  MAX_GAME_DURATION_SEC,
  MAX_NICKNAME_LENGTH,
  MAX_ROUND_COUNT,
  MAX_TURN_TIME_LIMIT_SEC,
  MIN_GAME_DURATION_SEC,
  MIN_ROUND_COUNT,
  MIN_TURN_TIME_LIMIT_SEC,
} from "@workspace/shared"
import type { GameConfig } from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { RadioGroup, RadioGroupItem } from "@workspace/ui/components/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import { Switch } from "@workspace/ui/components/switch"

import { apiClient } from "@/lib/api-client"
import { saveRoomIdentity } from "@/lib/room-storage"

const formSchema = z
  .object({
    categoryKey: z.string().min(1, "Choose a category"),
    turnTimeLimitSec: z.coerce.number().int().min(MIN_TURN_TIME_LIMIT_SEC).max(MAX_TURN_TIME_LIMIT_SEC),
    endCondition: z.enum(EndCondition),
    roundCount: z.coerce.number().int().min(MIN_ROUND_COUNT).max(MAX_ROUND_COUNT),
    durationSec: z.coerce.number().int().min(MIN_GAME_DURATION_SEC).max(MAX_GAME_DURATION_SEC),
    duplicatePolicy: z.enum(DuplicatePolicy),
    hostPlaysToo: z.boolean(),
    hostNickname: z.string().max(MAX_NICKNAME_LENGTH).optional(),
  })
  .refine((data) => !data.hostPlaysToo || !!data.hostNickname?.trim(), {
    message: "Enter a nickname to join as a player",
    path: ["hostNickname"],
  })

type FormValues = z.infer<typeof formSchema>

export default function CreateGamePage() {
  const router = useRouter()
  const [categories, setCategories] = useState<{ key: string; label: string }[]>([])
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      categoryKey: "movies",
      turnTimeLimitSec: DEFAULT_TURN_TIME_LIMIT_SEC,
      endCondition: EndCondition.FIXED_ROUNDS,
      roundCount: DEFAULT_ROUND_COUNT,
      durationSec: DEFAULT_GAME_DURATION_SEC,
      duplicatePolicy: DuplicatePolicy.ONCE_PER_RECORD,
      hostPlaysToo: false,
      hostNickname: "",
    },
  })

  const endCondition = watch("endCondition")
  const hostPlaysToo = watch("hostPlaysToo")

  useEffect(() => {
    apiClient
      .listCategories()
      .then(setCategories)
      .catch(() => toast.error("Could not load categories"))
  }, [])

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    try {
      const config: GameConfig = {
        turnTimeLimitSec: values.turnTimeLimitSec,
        hostPlaysToo: values.hostPlaysToo,
        duplicatePolicy: values.duplicatePolicy,
        ...(values.endCondition === EndCondition.FIXED_ROUNDS
          ? { endCondition: EndCondition.FIXED_ROUNDS as const, roundCount: values.roundCount }
          : values.endCondition === EndCondition.FIXED_DURATION
            ? { endCondition: EndCondition.FIXED_DURATION as const, durationSec: values.durationSec }
            : { endCondition: EndCondition.MANUAL as const }),
        // Movies is the only registered category in v1 — a future category
        // picker would compose its own config fields in here instead.
        categoryKey: "movies" as const,
      }

      const response = await apiClient.createRoom({
        categoryKey: values.categoryKey,
        config,
        hostNickname: values.hostPlaysToo ? values.hostNickname : undefined,
      })

      // A host who also plays connects with their player token, not the
      // host token — the backend still grants host privileges (game:start,
      // game:end) because that Player row has isHost=true, so one stored
      // identity covers both gameplay and host actions.
      saveRoomIdentity({
        code: response.code,
        role: response.playerToken ? "player" : "host",
        token: response.playerToken ?? response.hostToken,
        playerId: response.playerId,
        nickname: values.hostPlaysToo ? (values.hostNickname ?? "Host") : "Host",
      })

      router.push(`/room/${response.code}/lobby`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create room")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-base">Create Room</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-1.5">
              <Label>Category</Label>
              <Controller
                control={control}
                name="categoryKey"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.key} value={category.key}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Turn time limit (seconds)</Label>
              <Input type="number" {...register("turnTimeLimitSec")} />
              {errors.turnTimeLimitSec && <p className="text-xs text-destructive">{errors.turnTimeLimitSec.message}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <Label>Game end condition</Label>
              <Controller
                control={control}
                name="endCondition"
                render={({ field }) => (
                  <RadioGroup value={field.value} onValueChange={field.onChange}>
                    <label className="flex items-center gap-2 text-xs">
                      <RadioGroupItem value={EndCondition.FIXED_ROUNDS} />
                      Fixed number of rounds
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                      <RadioGroupItem value={EndCondition.FIXED_DURATION} />
                      Fixed overall duration
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                      <RadioGroupItem value={EndCondition.MANUAL} />
                      Host manually ends the game
                    </label>
                  </RadioGroup>
                )}
              />
            </div>

            {endCondition === EndCondition.FIXED_ROUNDS && (
              <div className="flex flex-col gap-1.5">
                <Label>Number of rounds</Label>
                <Input type="number" {...register("roundCount")} />
              </div>
            )}
            {endCondition === EndCondition.FIXED_DURATION && (
              <div className="flex flex-col gap-1.5">
                <Label>Duration (seconds)</Label>
                <Input type="number" {...register("durationSec")} />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label>Duplicate title policy</Label>
              <Controller
                control={control}
                name="duplicatePolicy"
                render={({ field }) => (
                  <RadioGroup value={field.value} onValueChange={field.onChange}>
                    <label className="flex items-center gap-2 text-xs">
                      <RadioGroupItem value={DuplicatePolicy.ONCE_PER_RECORD} />
                      Each title can only be found once
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                      <RadioGroupItem value={DuplicatePolicy.UNLIMITED} />
                      Titles can be found multiple times
                    </label>
                  </RadioGroup>
                )}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Join as a player too?</Label>
              <Controller
                control={control}
                name="hostPlaysToo"
                render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
              />
            </div>

            {hostPlaysToo && (
              <div className="flex flex-col gap-1.5">
                <Label>Your nickname</Label>
                <Input {...register("hostNickname")} placeholder="Nickname" />
                {errors.hostNickname && <p className="text-xs text-destructive">{errors.hostNickname.message}</p>}
              </div>
            )}

            <Button type="submit" disabled={submitting} className="mt-2 w-full">
              {submitting ? "Creating..." : "Create Room"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
