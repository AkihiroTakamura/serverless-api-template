# cdk setup

```bash
npx cdk init -l typescript
```

## cdk を esm 化

[参考](https://www.esplo.net/ja/products/cdk-esm-template)

- `package.json`

  - `"type": "module"`を追加

- `tsconfig.json`

  - target: ESNext
  - module: ESNext
  - moduleResolution: node

- `cdk.json`
  - `npx ts-node --prefer-ts-exts bin/infra.ts` を `npx tsx bin/serverless-api-template.ts` に変更


# biome

```
npm i -D @biomejs/biome@1.9.4
```

```json:/biome.json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "vcs": {
    "enabled": false,
    "clientKind": "git",
    "useIgnoreFile": false
  },
  "files": {
    "ignoreUnknown": false,
    "ignore": ["./tsconfig.json"]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 80
  },
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "suspicious": {
        "noExplicitAny": "off",
        "noReactSpecificProps": "off",
        "noEmptyBlockStatements": "off",
        "noArrayIndexKey": "off"
      },
      "style": {
        "useNamingConvention": "off",
        "noDefaultExport": "off",
        "useFilenamingConvention": "off",
        "useImportType": "off",
        "noNamespaceImport": "off",
        "noImplicitBoolean": "off",
        "useBlockStatements": "off"
      },
      "complexity": {
        "useSimplifiedLogicExpression": "off",
        "noExcessiveCognitiveComplexity": "off"
      },
      "correctness": {
        "noUnusedImports": "warn",
        "noUnusedVariables": "warn",
        "noNodejsModules": "off",
        "noUndeclaredDependencies": "off"
      },
      "nursery": {
        "useSortedClasses": {
          "level": "warn",
          "fix": "safe",
          "options": {}
        }
      }
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "jsxQuoteStyle": "single",
      "semicolons": "asNeeded"
    }
  }
}
```

# lefthook

project rootで

```bash
npm i -D lefthook
```

```yaml:lefthook.yml
pre-commit:
  parallel: true
  commands:
    biome-lambda:
      root: app/
      glob: "app/**/*.{ts,tsx}"
      run: npx @biomejs/biome@1.9.4 check --write --no-errors-on-unmatched --files-ignore-unknown=true {staged_files}

    biome-cdk:
      root: lib/
      glob: "lib/**/*.{ts,tsx}"
      run: npx @biomejs/biome@1.9.4 check --write --no-errors-on-unmatched --files-ignore-unknown=true {staged_files}

    type-check-lambda:
      root: app/
      glob: "app/**/*.{ts,tsx}"
      run: npx tsc --noEmit

    type-check-cdk:
      root: lib/
      glob: "lib/**/*.{ts,tsx}"
      run: npx tsc --noEmit
```



# vscode

```json:.vscode/extensions.json
{
  "recommendations": [
    "biomejs.biome"
  ]
}
```

```json:.vscode/settings.json
{
  // 開発者エディタで独自に動く可能性があるESLintとPrettierを無効化
  "eslint.enable": false,
  "prettier.enable": false,
  // フォーマッターをBiomeに設定
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "biomejs.biome",
  "editor.codeActionsOnSave": {
    "quickfix.biome": "explicit",
    "source.organizeImports": "explicit",
    "source.organizeImports.biome": "explicit"
  },
  "[typescript]": {
    "editor.defaultFormatter": "biomejs.biome",
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "biomejs.biome",
  },
  "[json]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  // importを絶対パスで補完
  "typescript.preferences.importModuleSpecifier": "non-relative",
  // emmet記法は邪魔なのでsuggestの最後にする
  "emmet.showSuggestionsAsSnippets": true,
  "editor.snippetSuggestions": "bottom"
}
```


# application

application 用のコードは `/app` にまとめることとする

## tsconfig

application 用に作る

```json:app/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "outDir": "../dist/app",
    "baseUrl": ".",
    "paths": {
      "@shared/*": [
        "layers/shared/nodejs/*"
      ],
      "@ext-libs/*": [
        "layers/ext-libs/nodejs/node_modules/*"
      ],
      "@aws-sdk/*": [
        "layers/aws-sdk/nodejs/node_modules/@aws-sdk/*"
      ]
    },
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "skipLibCheck": true,
    "declaration": false,
    "sourceMap": false
  },
  "include": [
    "lambda/**/*.ts",
    "layers/shared/nodejs/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    "layers/*/nodejs/node_modules"
  ]
}
```

## Lambda Layers

### for external packages

```bash
mkdir -p app/layer/ext-libs/nodejs
cd app/layer/ext-libs/nodejs
npm init
npm install date-fns
cd ../../../
```

### for aws sdk packages

```bash
mkdir -p app/layer/aws-sdk/nodejs
cd app/layer/aws-sdk/nodejs
npm init
npm install @aws-sdk/client-sfn
cd ../../../
```

### for shared library

```bash
mkdir -p app/layer/shared/nodejs/utils
```

動作確認用の関数を作る

```ts:app/layer/shared/nodejs/utils/util.ts
export const greet = (name: string) => `Hello, ${name}!`
```

## Lambda

```bash
mkdir -p app/lambda
cd app/lambda

# honoはlayerでなく、lambda側のpackageにする（layer配下だとhono/aws-lambdaのようなサブパッケージが参照できない）
npm init
npm install hono

mkdir -p app/lambda/api
```

### API用Lambda


```ts:app/lambda/api/index.ts
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

```

### Step Functions用Lambda

```ts:app/lambda/sfn/step1.ts
export const handler = async (event: any) => {
  return { step: 1, message: 'Step 1 executed', input: event }
}
```

```ts:app/lambda/sfn/step2.ts
export const handler = async (event: any) => {
  return { step: 2, message: 'Step 2 executed', input: event }
}
```


## build script

`プロジェクトルート/package.json` に以下を追加

```json
  "scripts": {
    "build": "tsc",
    "watch": "tsc -w",
    "test": "jest",
    "cdk": "cdk",
+   "install:app": "cd app/lambda && npm install",
+   "build:app": "npm run install:app && tsc --project app/tsconfig.json",
+   "build:layers": "npm run build:layers:ext-libs && npm run build:layers:aws-sdk",
+   "build:layers:ext-libs": "cd app/layers/ext-libs/nodejs && npm install",
+   "build:layers:aws-sdk": "cd app/layers/aws-sdk/nodejs && npm install",
+   "build:all": "npm run build:layers && npm run build:app"
+ },

```

# infra

cdkのスタック例

```ts:lib/serverless-api-template-stack.ts

import * as cdk from 'aws-cdk-lib'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs'
import * as logs from 'aws-cdk-lib/aws-logs'
import * as sfn from 'aws-cdk-lib/aws-stepfunctions'
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks'
import { Construct } from 'constructs'
import * as path from 'node:path'

export class ServerlessApiTemplateStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

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

```

