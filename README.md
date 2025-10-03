# Serverless API Template

[![Deploy CDK Stack](https://github.com/AkihiroTakamura/serverless-api-template/actions/workflows/deploy.yml/badge.svg)](https://github.com/AkihiroTakamura/serverless-api-template/actions/workflows/deploy.yml)

A modern serverless API template built with AWS CDK and TypeScript, featuring a lightweight architecture without API Gateway.

## ✨ Features

- **🚀 Lightweight API Server**: Uses [Hono](https://hono.dev/) instead of API Gateway for simpler, faster APIs
- **⚡ Full TypeScript**: End-to-end TypeScript for both application and infrastructure code
- **🔄 Async Processing**: Built-in Step Functions workflow for complex business logic
- **📦 Optimized Layers**: Shared libraries and utilities for better cold start performance
- **🛡️ Production Ready**: Includes CI/CD pipeline with GitHub Actions
- **💰 Cost Effective**: Function URLs eliminate API Gateway costs

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client        │───▶│  Lambda Function │───▶│ Step Functions  │
│                 │    │  (Hono + Func URL)│    │   Workflow      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                        ┌──────────────────┐    ┌─────────────────┐
                        │  Lambda Layers   │    │ Lambda Functions│
                        │ • AWS SDK        │    │ • Step 1        │
                        │ • External Libs  │    │ • Step 2        │
                        │ • Shared Utils   │    │ • ...           │
                        └──────────────────┘    └─────────────────┘
```

### Tech Stack

- **API Framework**: [Hono](https://hono.dev/) - Ultra-fast web framework
- **Runtime**: AWS Lambda with Function URLs (Node.js 22.x)
- **Orchestration**: AWS Step Functions
- **Infrastructure**: AWS CDK v2
- **Language**: TypeScript
- **Testing**: Jest
- **CI/CD**: GitHub Actions

## 🚀 Quick Start

### Prerequisites

- Node.js 22.x or later
- AWS CLI configured
- AWS CDK CLI installed (`npm install -g aws-cdk`)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/AkihiroTakamura/serverless-api-template.git
   cd serverless-api-template
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build:all
   ```

4. **Deploy to AWS**
   ```bash
   npx cdk deploy
   ```

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run watch` | Watch for file changes and compile |
| `npm run test` | Run Jest unit tests |
| `npm run build:all` | Build application and layers |
| `npx cdk deploy` | Deploy stack to AWS |
| `npx cdk diff` | Compare deployed stack with current state |
| `npx cdk synth` | Generate CloudFormation template |

## 📁 Project Structure

```
├── app/
│   ├── lambda/          # Lambda function code
│   │   ├── api/         # Main API handler (Hono)
│   │   └── sfn/         # Step Functions handlers
│   └── layers/          # Lambda layers
│       ├── aws-sdk/     # AWS SDK layer
│       ├── ext-libs/    # External libraries
│       └── shared/      # Shared utilities
├── lib/                 # CDK infrastructure code
├── bin/                 # CDK app entry point
└── .github/workflows/   # CI/CD pipeline
```

## 🔧 GitHub Actions CI/CD

This template includes a complete CI/CD pipeline that automatically deploys your serverless API.

### Setup AWS Integration

#### 1. Create IAM Role for GitHub Actions

Create an IAM role that allows GitHub Actions to deploy your CDK stack.

**Steps:**

1. **Login to AWS Management Console**
   - Access [AWS IAM Console](https://console.aws.amazon.com/iam/)

2. **Add GitHub as Identity Provider**
   - Open IAM Console
   - Navigate to **Identity providers** → **Add Provider**
   - Select **OpenID Connect**
   - Provider URL: `https://token.actions.githubusercontent.com`
   - Audience: `sts.amazonaws.com`
   - Click **Add Provider**

3. **Create IAM Policy**
   - Go to **Policies** → **Create Policy**
   - Select JSON tab and paste:
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [
         {
           "Effect": "Allow",
           "Action": "sts:AssumeRole",
           "Resource": "arn:aws:iam::<ACCOUNT_ID>:role/cdk-*"
         }
       ]
     }
     ```
   - Policy name: `GitHubActionsCDKDeployPolicy`
   - Click **Create Policy**

4. **Create IAM Role**
   - Go to **Roles** → **Create Role**
   - Select **Custom trust policy**
   - Replace with the following JSON (update `YOUR_ACCOUNT_ID`, `YOUR_GITHUB_USERNAME`, `YOUR_REPO_NAME`):
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [
         {
           "Effect": "Allow",
           "Principal": {
             "Federated": "arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
           },
           "Action": "sts:AssumeRoleWithWebIdentity",
           "Condition": {
             "StringEquals": {
               "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
             },
             "StringLike": {
               "token.actions.githubusercontent.com:sub": "repo:YOUR_GITHUB_USERNAME/YOUR_REPO_NAME/*"
             }
           }
         }
       ]
     }
     ```
   - Attach the policy created in step 3
   - Role name: `GitHubActionsCDKDeployRole`
   - Click **Create Role**

5. **Copy Role ARN**
   - Copy the role ARN from the role summary page (needed for GitHub secrets)

#### 2. Configure GitHub Secrets

In your GitHub repository, go to **Settings** → **Secrets and variables** → **Actions** and add:

- `AWS_ROLE_TO_ASSUME`: The ARN of the IAM role created above like `arn:aws:iam::YOUR_ACCOUNT_ID:role/GitHubActionsCDKDeployRole`

### 🔄 Deployment Workflow

- **Push to main/master**: Automatic deployment to AWS
- **Pull Request**: Build and test only (no deployment)
- **Manual Trigger**: Deploy from Actions tab using "Deploy CDK Stack" workflow

## 🧪 Testing

Run the test suite:

```bash
npm test
```

The template includes Jest configuration for unit testing your Lambda functions and CDK constructs.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [Hono Documentation](https://hono.dev/)
- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [AWS Step Functions Documentation](https://docs.aws.amazon.com/step-functions/)

## 💡 Why This Architecture?

### Benefits of Function URLs over API Gateway

- **Lower Latency**: Direct invocation without API Gateway overhead
- **Cost Savings**: No API Gateway charges (only Lambda costs)
- **Simpler Configuration**: Less infrastructure complexity
- **Better Developer Experience**: Direct integration with Hono framework

### When to Use This Template

✅ **Good for:**
- Simple to medium complexity APIs
- Cost-sensitive applications
- Microservices architecture
- Rapid prototyping

❌ **Consider API Gateway if you need:**
- Advanced authentication/authorization
- Request/response transformations
- Complex routing and middleware
- Built-in throttling and caching

---

**Made with ❤️ for the serverless community**
