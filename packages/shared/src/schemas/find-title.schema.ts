import { z } from "zod"

export const findTitlePayloadSchema = z
  .object({
    tileIds: z.array(z.string()).min(1),
  })
  .refine((data) => new Set(data.tileIds).size === data.tileIds.length, {
    message: "tileIds must not contain duplicates",
    path: ["tileIds"],
  })
export type FindTitlePayload = z.infer<typeof findTitlePayloadSchema>
