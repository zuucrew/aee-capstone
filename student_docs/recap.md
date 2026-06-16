### A. Containers and local dev

- Docker
- Image vs container
- Docker Compose

### B. AWS

- AWS Copilot
- ECS
- Fargate
- ECR
- ALB
- VPC & Subnet
- NAT Gateway (We want to reach out like calling APIs but we don't want to internet reaching into them.)
- SSM Param Store
- CloudWatch
- AWS Budgets

### C. CI/CD & The App Layer.

- Arq
- GIthub Actions
- OIDC

ECS

- Cluster
- Task and Task Definition
- Service
- Desired vs Running

ALB

- Listner
- Target Group
- Health Check
- Distribution
- Connection draining


API 1 -> WORKS

API 2 -> NOT WORKS -> ALB LABEL THIS AS UNHEALTHY BY REMOVING FROM TRAGET GROUP



aws ecr get-login-password --profile "nawaloka" --region "us-west-2" | dockerlogin --username AWS --password-stdin "<ACCOUNT_ID>.dkr.ecr.us-west-2.amazonaws.com" >/dev/null
