import { z } from 'zod'

// 環境変数のスキーマ定義
export const configSchema = z.object({
  AWS_REGION: z.string().min(1, 'AWS_REGION must not be empty'),
})

export type Config = z.infer<typeof configSchema>
