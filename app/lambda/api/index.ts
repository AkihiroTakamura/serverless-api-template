import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn'
import { format } from '@ext-libs/date-fns'
import { greet } from '@shared/utils/util'
import { Hono } from 'hono'
import { handle } from 'hono/aws-lambda'

const app = new Hono()

app.get('/hello', (c) => {
  const now = new Date()
  return c.json({
    message: greet('World'),
    now: format(now, 'yyyy-MM-dd HH:mm:ss'),
  })
})

app.post('/run-flow', async (c) => {
  const input = await c.req.json()
  const stateMachineArn = process.env.STATE_MACHINE_ARN
  const sfn = new SFNClient({})
  await sfn.send(
    new StartExecutionCommand({
      stateMachineArn,
      input: JSON.stringify(input),
    }),
  )
  return c.json({ status: 'Step Functions started' })
})

export const handler = handle(app)
