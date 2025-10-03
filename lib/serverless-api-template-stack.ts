import * as cdk from 'aws-cdk-lib'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs'
import * as logs from 'aws-cdk-lib/aws-logs'
import * as sfn from 'aws-cdk-lib/aws-stepfunctions'
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks'

import { Construct } from 'constructs'

import { Config } from '../bin/config-schema'

import * as path from 'node:path'

interface ServerlessApiTemplateStackProps extends cdk.StackProps {
  config: Config
}

export class ServerlessApiTemplateStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: ServerlessApiTemplateStackProps,
  ) {
    super(scope, id, props)

    const { config } = props
    console.log('Region:', config.AWS_REGION)

    // Lambda Layers
    const extLibsLayer = new lambda.LayerVersion(this, 'ExtLibsLayer', {
      code: lambda.Code.fromAsset('app/layers/ext-libs'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_22_X],
      description: 'External libraries layer',
    })

    const awsSdkLayer = new lambda.LayerVersion(this, 'AwsSdkLayer', {
      code: lambda.Code.fromAsset('app/layers/aws-sdk'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_22_X],
      description: 'AWS SDK layer',
    })

    const sharedLayer = new lambda.LayerVersion(this, 'SharedLayer', {
      code: lambda.Code.fromAsset('app/layers/shared'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_22_X],
      description: 'Shared utilities layer',
    })

    // Step Functions Lambda
    const step1Lambda = new lambda.Function(this, 'Step1Lambda', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'lambda/sfn/step1.handler',
      code: lambda.Code.fromAsset('dist/app'),
      layers: [extLibsLayer, sharedLayer],
    })

    const step2Lambda = new lambda.Function(this, 'Step2Lambda', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'lambda/sfn/step2.handler',
      code: lambda.Code.fromAsset('dist/app'),
      layers: [extLibsLayer, sharedLayer],
    })

    // Step Functions Definition
    const step1Task = new tasks.LambdaInvoke(this, 'InvokeStep1', {
      lambdaFunction: step1Lambda,
      outputPath: '$.Payload',
    })

    const step2Task = new tasks.LambdaInvoke(this, 'InvokeStep2', {
      lambdaFunction: step2Lambda,
      outputPath: '$.Payload',
    })

    const definition = step1Task.next(step2Task)

    const stateMachine = new sfn.StateMachine(this, 'MyStateMachine', {
      definitionBody: sfn.DefinitionBody.fromChainable(definition),
      stateMachineType: sfn.StateMachineType.EXPRESS,
      logs: {
        destination: new logs.LogGroup(this, 'StateMachineLogGroup', {
          removalPolicy: cdk.RemovalPolicy.DESTROY,
          retention: logs.RetentionDays.ONE_MONTH,
        }),
        level: sfn.LogLevel.ALL,
        includeExecutionData: true,
      },
    })

    // Hono API Lambda
    const apiLambda = new nodejs.NodejsFunction(this, 'ApiLambda', {
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(import.meta.dirname, '../app/lambda/api/index.ts'),
      environment: {
        STATE_MACHINE_ARN: stateMachine.stateMachineArn,
      },
      layers: [extLibsLayer, awsSdkLayer, sharedLayer],
      bundling: {
        externalModules: ['@aws-sdk/*', 'date-fns'],
        format: nodejs.OutputFormat.ESM,
        target: 'es2020',
        tsconfig: path.join(import.meta.dirname, '../app/tsconfig.json'),
      },
    })

    stateMachine.grantStartExecution(apiLambda)

    apiLambda.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: ['*'],
        allowedMethods: [lambda.HttpMethod.GET, lambda.HttpMethod.POST],
      },
    })
  }
}
