#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib'

import { ServerlessApiTemplateStack } from '../lib/serverless-api-template-stack'

const app = new cdk.App()
new ServerlessApiTemplateStack(app, 'ServerlessApiTemplateStack', {})
