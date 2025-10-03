#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib'

import { z } from 'zod'

import { ServerlessApiTemplateStack } from '../lib/serverless-api-template-stack'
import { configSchema } from './config-schema'

const result = configSchema.safeParse(process.env)

if (!result.success) {
  console.error('Environment variable validation failed:')
  console.error(z.treeifyError(result.error))
  throw new Error('Invalid environment variables')
}

const config = result.data

const app = new cdk.App()
new ServerlessApiTemplateStack(app, 'ServerlessApiTemplateStack', {
  config,
})
