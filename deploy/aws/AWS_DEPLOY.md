# AWS Deployment Guide — Free-Tier Production (ap-south-1 Mumbai)

The complete, zero-to-live runbook for putting the Mexos Studio API on AWS.
Written for someone who has **never used AWS before** — every command is
copy-paste runnable from **Git Bash on Windows**, and every AWS CLI command
pins `--region ap-south-1` so nothing lands in the wrong region by accident.

```
Browser
  └─► Netlify frontend  (https://mexos.netlify.app — already live, free)
        └─► CloudFront  (free HTTPS at the edge, redirect-to-https)
              └─► EC2 t3.micro, ap-south-1  (plain HTTP :80)
                    nginx ─► api :4000  (Docker image pulled from ECR)
                               ├─► AWS RDS PostgreSQL 16  (managed database)
                               ├─► redis  (container: rate limits + job queue)
                               └─► AWS S3  (design uploads, presigned PUTs)
```

Deliberate design choices (why this looks different from `docker-compose.prod.yml`):

- **No postgres container** — the database is AWS RDS (managed backups, patching).
- **No certbot / TLS on the box** — CloudFront terminates HTTPS for free, then
  talks plain HTTP to the EC2 origin. `ENFORCE_HTTPS` stays **off** and
  `TRUST_PROXY=true` so the app sees real client IPs and the original scheme.
- **No monitoring containers** — the box has 1 GB RAM. Exactly three containers
  run: `nginx`, `api`, `redis`. A **2 GB swapfile is mandatory** (the user-data
  script creates it) or image pulls and Prisma migrations will OOM.
- **Images are built on your laptop and pushed to ECR** — never built on the box.

Files this guide drives (all in this repo):

| File                                    | What it is                                                        |
| --------------------------------------- | ----------------------------------------------------------------- |
| `deploy/aws/ec2-user-data.sh`           | First-boot script: swap, Docker, AWS CLI, `/opt/mexos/deploy.sh`  |
| `deploy/aws/docker-compose.aws.yml`     | The 3-container stack → copied to the box as `docker-compose.yml` |
| `deploy/aws/nginx-aws.conf`             | Reverse proxy (port 80, CloudFront-aware) → copied as-is          |
| `deploy/aws/env.production.aws.example` | Annotated template for the server's `.env`                        |
| `Dockerfile`                            | Multi-stage build of the API image you push to ECR                |

Pairs with [GOING_LIVE.md](../../GOING_LIVE.md) (switching SMS/payments/WhatsApp
from stubs to real providers) and [DEPLOYMENT_CHECKLIST.md](../DEPLOYMENT_CHECKLIST.md)
(the final go-live gate).

**Contents**

1. [What you get + what it costs](#1-what-you-get--what-it-costs)
2. [One-time account setup (owner, by hand)](#2-one-time-account-setup-owner-by-hand)
3. [Provisioning runbook (operator, CLI)](#3-provisioning-runbook-operator-cli)
4. [CloudFront + wiring up the Netlify frontend](#4-cloudfront--wiring-up-the-netlify-frontend)
5. [Attaching a custom domain later](#5-attaching-a-custom-domain-later)
6. [Updating the app on new commits](#6-updating-the-app-on-new-commits)
7. [Teardown](#7-teardown)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. What you get + what it costs

A production deployment of the full API — auth/OTP, catalog, orders, payments
webhooks, custom-design uploads to S3, WhatsApp hooks — with managed database
backups (7 days), free HTTPS, and a one-command deploy script on the server.

Estimated monthly cost (ap-south-1, on-demand, USD — **estimates**; confirm at
<https://calculator.aws>):

| Item                                                    | Free tier (first 12 months) | After free tier                 |
| ------------------------------------------------------- | --------------------------- | ------------------------------- |
| EC2 t3.micro (750 h/mo)                                 | $0                          | ~$8.50                          |
| EBS root volume 30 GB gp3                               | $0 (30 GB included)         | ~$3.00                          |
| Public IPv4 (Elastic IP on a running instance)          | $0 (750 h/mo included)      | ~$3.70                          |
| RDS PostgreSQL db.t4g.micro (750 h/mo, Single-AZ)       | $0                          | ~$15.00                         |
| RDS storage 20 GB gp3 + 7-day backups                   | $0 (20 GB included)         | ~$2.50                          |
| S3 (5 GB, design uploads)                               | $0                          | < $1.00                         |
| ECR private registry (500 MB)                           | $0                          | ~$0.10                          |
| CloudFront (≤ 1 TB/mo + 10M requests — **always free**) | $0                          | $0                              |
| Data transfer out (≤ 100 GB/mo — **always free**)       | $0                          | $0                              |
| Netlify frontend (free plan)                            | $0                          | $0                              |
| **Total**                                               | **~$0/mo**                  | **~$30–35/mo (≈ ₹2,600–3,000)** |

> **Free-tier fine print.** The "12 months free" table above is the classic AWS
> free tier. In **July 2025 AWS changed the free tier for new accounts** to a
> credit-based plan (a $100 sign-up credit, up to $100 more for completing
> activities, valid ~6 months). A brand-new account created today gets credits
> that comfortably cover this stack for months — but check the terms shown at
> sign-up, and **set a billing alarm either way** (step 2.6). RDS free tier
> requires **Single-AZ** (this guide uses `--no-multi-az`).

---

## 2. One-time account setup (owner, by hand)

The **owner** does this once, in a browser and a terminal. Everything after
this section is scripted CLI work.

### 2.1 Prerequisites on your Windows machine

- **Git for Windows** — you already have it (this repo). It provides **Git Bash**,
  `ssh`, and `scp`. **All commands in this guide are run from Git Bash, from the
  repo root** (`cd "/e/Nexira Tech/Mexos Studio"`), not PowerShell or CMD.
- **Docker Desktop** — <https://www.docker.com/products/docker-desktop/> —
  needed to build the API image locally. Start it before section 3.5.
- **Node.js 20+** — you already have it (this repo runs on it). Used to
  generate secrets and run the catalog seed.

### 2.2 Create the AWS account

1. Go to <https://aws.amazon.com> → **Create an AWS Account**.
2. Use a real email you control (this becomes the **root user** — the master
   key to everything), a strong unique password, and a credit/debit card
   (required even for the free tier; verification may hold a tiny amount).
3. Choose the **Basic (free)** support plan.
4. Sign in to the console at <https://console.aws.amazon.com>. In the top-right
   region selector, pick **Asia Pacific (Mumbai) ap-south-1**. Every console
   screenshot-check in this guide assumes Mumbai.

### 2.3 Lock the root user with MFA

The root user should be used exactly twice: to enable MFA, and to create the
IAM user below. Never for day-to-day work.

1. Console → search **IAM** → IAM dashboard shows a banner:
   **"Add MFA for root user"** → **Add MFA**.
2. Pick **Authenticator app** (Google Authenticator, Authy, 1Password, …),
   scan the QR code, enter two consecutive codes → **Add MFA**.

### 2.4 Create the `deployer` IAM user + access key

1. Console → **IAM** → **Users** → **Create user**.
2. User name: `deployer`. Console access: not needed (leave unchecked).
3. **Attach policies directly** → search and tick **AdministratorAccess** →
   Next → **Create user**.
4. Open the `deployer` user → **Security credentials** tab →
   **Create access key** → use case **Command Line Interface (CLI)** → tick the
   confirmation → Next → **Create access key**.
5. **Download the .csv** and store it somewhere safe (a password manager).
   You will never see the secret again after this screen.

> These two values (`Access key ID` + `Secret access key`) are the keys to your
> whole AWS account. Never paste them into a file inside this repo, a chat, or
> an email.

### 2.5 Install and configure the AWS CLI

In **PowerShell** (winget is a Windows tool):

```powershell
winget install Amazon.AWSCLI
```

Close and reopen **Git Bash**, then:

```bash
aws --version          # expect: aws-cli/2.x ...
aws configure
#   AWS Access Key ID:      <from the CSV>
#   AWS Secret Access Key:  <from the CSV>
#   Default region name:    ap-south-1
#   Default output format:  json
```

Verify it works:

```bash
aws sts get-caller-identity --region ap-south-1
# Expect JSON with your 12-digit "Account" id and .../user/deployer
```

### 2.6 Set a billing alarm (2 minutes, do not skip)

Console → **Billing and Cost Management** → **Budgets** → **Create budget** →
template **Zero spend budget** (or Monthly cost budget, e.g. $10) → your email
→ Create. Now AWS emails you before a mistake becomes a bill.

---

## 3. Provisioning runbook (operator, CLI)

Run everything below **from the repo root in Git Bash**, in order. Steps that
depend on earlier output use shell variables (`$API_SG_ID`, `$EIP`, …) — do the
whole section **in one Git Bash window** so the variables survive, and keep a
**values notepad** (a local text file _outside_ the repo) recording every value
this section prints. You will need them again in later sections.

> **Git Bash gotcha (read once).** Git Bash rewrites arguments that start with
> `/` into Windows paths (`/aws/...` → `C:/Program Files/Git/aws/...`), which
> corrupts some AWS parameters. Any command where this matters is prefixed with
> `MSYS_NO_PATHCONV=1` below — keep that prefix, it disables the rewrite for
> that one command.

Set the session variables every other step builds on:

```bash
cd "/e/Nexira Tech/Mexos Studio"    # repo root

AWS_REGION=ap-south-1
ACCOUNT_ID=$(aws sts get-caller-identity --region ap-south-1 --query Account --output text)
VPC_ID=$(aws ec2 describe-vpcs --region ap-south-1 \
  --filters Name=isDefault,Values=true --query 'Vpcs[0].VpcId' --output text)

echo "ACCOUNT_ID=$ACCOUNT_ID  VPC_ID=$VPC_ID"    # → notepad
```

### 3.1 Security groups (the firewalls)

Two groups: `mexos-api-sg` for the EC2 box (HTTP from the world so CloudFront
can reach it, SSH only from **your** IP), and `mexos-rds-sg` for the database
(Postgres **only** from the EC2 group — the database is never reachable from
the internet).

```bash
# ── api-sg: the EC2 box ──
API_SG_ID=$(aws ec2 create-security-group --region ap-south-1 \
  --group-name mexos-api-sg \
  --description "Mexos API box: 80 public (CloudFront origin), 22 admin only" \
  --vpc-id "$VPC_ID" --query GroupId --output text)

# HTTP from anywhere (CloudFront edges connect from many IPs).
aws ec2 authorize-security-group-ingress --region ap-south-1 \
  --group-id "$API_SG_ID" --protocol tcp --port 80 --cidr 0.0.0.0/0

# SSH from YOUR current public IP only.
MY_IP=$(curl -s https://checkip.amazonaws.com)
aws ec2 authorize-security-group-ingress --region ap-south-1 \
  --group-id "$API_SG_ID" --protocol tcp --port 22 --cidr "$MY_IP/32"

# ── rds-sg: the database ──
RDS_SG_ID=$(aws ec2 create-security-group --region ap-south-1 \
  --group-name mexos-rds-sg \
  --description "Mexos RDS: 5432 from the API security group only" \
  --vpc-id "$VPC_ID" --query GroupId --output text)

aws ec2 authorize-security-group-ingress --region ap-south-1 \
  --group-id "$RDS_SG_ID" --protocol tcp --port 5432 --source-group "$API_SG_ID"

echo "API_SG_ID=$API_SG_ID  RDS_SG_ID=$RDS_SG_ID  MY_IP=$MY_IP"    # → notepad
```

> If your home IP changes later and SSH times out, re-run the `MY_IP=` line and
> the port-22 `authorize-security-group-ingress` command (the old rule can be
> removed in the console under EC2 → Security Groups → `mexos-api-sg`).
>
> **Optional hardening (after section 4 works):** tighten port 80 from
> `0.0.0.0/0` to CloudFront's official origin-facing IP list, so only CloudFront
> can talk to the box — this is the assumption `nginx-aws.conf`'s real-IP
> comment documents:
>
> ```bash
> PREFIX_LIST_ID=$(aws ec2 describe-managed-prefix-lists --region ap-south-1 \
>   --filters Name=prefix-list-name,Values=com.amazonaws.global.cloudfront.origin-facing \
>   --query 'PrefixLists[0].PrefixListId' --output text)
> aws ec2 authorize-security-group-ingress --region ap-south-1 --group-id "$API_SG_ID" \
>   --ip-permissions "IpProtocol=tcp,FromPort=80,ToPort=80,PrefixListIds=[{PrefixListId=$PREFIX_LIST_ID}]"
> aws ec2 revoke-security-group-ingress --region ap-south-1 \
>   --group-id "$API_SG_ID" --protocol tcp --port 80 --cidr 0.0.0.0/0
> ```
>
> Note: after this, `curl http://$EIP/...` from your laptop stops working
> (expected — go through the CloudFront URL instead).

### 3.2 RDS — managed PostgreSQL 16

Creates the database with 7-day automated backups and deletion protection.
Takes **5–10 minutes** to become available — kick it off now and continue with
3.3 while it builds.

```bash
# A URL-safe password (hex only — no characters that need escaping in DATABASE_URL).
DB_PASSWORD=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")
echo "DB_PASSWORD=$DB_PASSWORD"    # → notepad (you need this for the server .env)

# Latest PostgreSQL 16.x available in ap-south-1 right now.
PG_VERSION=$(aws rds describe-db-engine-versions --region ap-south-1 --engine postgres \
  --query "DBEngineVersions[?starts_with(EngineVersion,'16.')]|[-1].EngineVersion" --output text)
echo "PG_VERSION=$PG_VERSION"

aws rds create-db-instance --region ap-south-1 \
  --db-instance-identifier mexos-db \
  --db-instance-class db.t4g.micro \
  --engine postgres \
  --engine-version "$PG_VERSION" \
  --allocated-storage 20 \
  --storage-type gp3 \
  --storage-encrypted \
  --master-username postgres \
  --master-user-password "$DB_PASSWORD" \
  --db-name tshirt \
  --vpc-security-group-ids "$RDS_SG_ID" \
  --backup-retention-period 7 \
  --deletion-protection \
  --no-publicly-accessible \
  --no-multi-az \
  --copy-tags-to-snapshot \
  --query 'DBInstance.DBInstanceStatus' --output text
# → "creating"
```

Flag-by-flag, for the curious: `db.t4g.micro` + 20 GB + `--no-multi-az` is the
free-tier shape; `--backup-retention-period 7` = automated daily backups +
point-in-time recovery for 7 days; `--deletion-protection` = the API refuses to
delete this database until you explicitly turn that off (see Teardown);
`--no-publicly-accessible` = private IP only, reachable solely from `api-sg`.

You'll fetch the endpoint hostname in step 3.9 once it's ready. To check on it:

```bash
aws rds describe-db-instances --region ap-south-1 --db-instance-identifier mexos-db \
  --query 'DBInstances[0].DBInstanceStatus' --output text
# "creating" → eventually "available"
```

### 3.3 S3 bucket for design uploads

Private bucket, public access fully blocked, CORS opened **only** for presigned
`PUT` uploads from the Netlify frontend.

```bash
BUCKET="mexos-design-uploads-$ACCOUNT_ID"    # bucket names are global; account id makes it unique
echo "BUCKET=$BUCKET"    # → notepad

aws s3api create-bucket --region ap-south-1 --bucket "$BUCKET" \
  --create-bucket-configuration LocationConstraint=ap-south-1

# Block every form of public access (uploads are served via presigned URLs only).
aws s3api put-public-access-block --region ap-south-1 --bucket "$BUCKET" \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

# CORS: the browser on mexos.netlify.app PUTs files directly to S3 via presigned URLs.
cat > s3-cors.json <<'EOF'
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://mexos.netlify.app"],
      "AllowedMethods": ["PUT", "GET"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3600
    }
  ]
}
EOF
aws s3api put-bucket-cors --region ap-south-1 --bucket "$BUCKET" \
  --cors-configuration file://s3-cors.json

# Housekeeping (DEPLOYMENT_CHECKLIST §6): expire never-attached uploads after 30 days.
cat > s3-lifecycle.json <<'EOF'
{
  "Rules": [
    {
      "ID": "expire-orphaned-uploads",
      "Status": "Enabled",
      "Filter": { "Prefix": "uploads/" },
      "Expiration": { "Days": 30 }
    }
  ]
}
EOF
aws s3api put-bucket-lifecycle-configuration --region ap-south-1 --bucket "$BUCKET" \
  --lifecycle-configuration file://s3-lifecycle.json

rm s3-cors.json s3-lifecycle.json
```

> When you add a custom domain later (section 5), come back and add it to
> `AllowedOrigins` alongside the Netlify origin, then re-run `put-bucket-cors`.

### 3.4 Dedicated IAM user for S3 (least privilege)

The API signs presigned URLs with these keys. They can touch **this one
bucket** and nothing else — never reuse the `deployer` key here.

```bash
aws iam create-user --region ap-south-1 --user-name mexos-s3-uploader

cat > s3-uploader-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ObjectRW",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::$BUCKET/*"
    },
    {
      "Sid": "BucketList",
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::$BUCKET"
    }
  ]
}
EOF
aws iam put-user-policy --region ap-south-1 --user-name mexos-s3-uploader \
  --policy-name mexos-s3-least-priv --policy-document file://s3-uploader-policy.json
rm s3-uploader-policy.json

aws iam create-access-key --region ap-south-1 --user-name mexos-s3-uploader \
  --query 'AccessKey.{S3_ACCESS_KEY:AccessKeyId,S3_SECRET_KEY:SecretAccessKey}'
```

Copy the printed `S3_ACCESS_KEY` and `S3_SECRET_KEY` **to your notepad now** —
the secret is shown exactly once. They go into the server `.env` in step 3.9.

### 3.5 ECR — build the API image and push it

The 1 GB box never builds images; your laptop does. **Start Docker Desktop
first**, then:

```bash
aws ecr create-repository --region ap-south-1 --repository-name mexos-api \
  --image-scanning-configuration scanOnPush=true \
  --query 'repository.repositoryUri' --output text

ECR="$ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com"
echo "ECR=$ECR"    # → notepad

# Log Docker in to your private registry (token lasts 12 hours).
aws ecr get-login-password --region ap-south-1 \
  | docker login --username AWS --password-stdin "$ECR"

# Build from the repo Dockerfile and push (first build takes a few minutes).
docker build -t "$ECR/mexos-api:latest" .
docker push "$ECR/mexos-api:latest"
```

### 3.6 Elastic IP

A fixed public IP that survives instance stops/restarts — CloudFront's origin
address must not change under it.

```bash
ALLOC_ID=$(aws ec2 allocate-address --region ap-south-1 --domain vpc \
  --query AllocationId --output text)
EIP=$(aws ec2 describe-addresses --region ap-south-1 --allocation-ids "$ALLOC_ID" \
  --query 'Addresses[0].PublicIp' --output text)
echo "ALLOC_ID=$ALLOC_ID  EIP=$EIP"    # → notepad
```

### 3.7 IAM role for the EC2 instance (ECR pulls without keys on disk)

The box authenticates to ECR through an **instance role** — no AWS access keys
are ever stored on the server.

```bash
cat > ec2-trust-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "ec2.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
aws iam create-role --region ap-south-1 --role-name mexos-ec2-role \
  --assume-role-policy-document file://ec2-trust-policy.json
rm ec2-trust-policy.json

aws iam attach-role-policy --region ap-south-1 --role-name mexos-ec2-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly

aws iam create-instance-profile --region ap-south-1 --instance-profile-name mexos-ec2-profile
aws iam add-role-to-instance-profile --region ap-south-1 \
  --instance-profile-name mexos-ec2-profile --role-name mexos-ec2-role
```

### 3.8 Launch the EC2 instance

SSH key pair (saved **outside** the repo so it can never be committed):

```bash
aws ec2 create-key-pair --region ap-south-1 --key-name mexos-key \
  --key-type ed25519 --query KeyMaterial --output text > ~/mexos-key.pem
chmod 400 ~/mexos-key.pem
```

Find the current official Ubuntu 24.04 image for Mumbai (the
`MSYS_NO_PATHCONV` prefix matters — the parameter name starts with `/`):

```bash
AMI_ID=$(MSYS_NO_PATHCONV=1 aws ssm get-parameter --region ap-south-1 \
  --name /aws/service/canonical/ubuntu/server/24.04/stable/current/amd64/hvm/ebs-gp3/ami-id \
  --query Parameter.Value --output text)
echo "AMI_ID=$AMI_ID"
```

Launch, passing `deploy/aws/ec2-user-data.sh` as user data — cloud-init runs it
once on first boot (swapfile, Docker, AWS CLI, `/opt/mexos/deploy.sh`; read the
file's header for the full list). 30 GB gp3 root disk = the free-tier maximum,
and headroom for images + logs:

```bash
INSTANCE_ID=$(aws ec2 run-instances --region ap-south-1 \
  --image-id "$AMI_ID" \
  --instance-type t3.micro \
  --count 1 \
  --key-name mexos-key \
  --security-group-ids "$API_SG_ID" \
  --iam-instance-profile Name=mexos-ec2-profile \
  --user-data file://deploy/aws/ec2-user-data.sh \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":30,"VolumeType":"gp3","DeleteOnTermination":true}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=mexos-api}]' \
  --query 'Instances[0].InstanceId' --output text)
echo "INSTANCE_ID=$INSTANCE_ID"    # → notepad
```

> If this errors with `Invalid IAM Instance Profile`, the profile from 3.7 is
> still propagating — wait 15 seconds and run it again.

Attach the Elastic IP, then record the public DNS name (this becomes the
CloudFront origin in section 4):

```bash
aws ec2 wait instance-running --region ap-south-1 --instance-ids "$INSTANCE_ID"
aws ec2 associate-address --region ap-south-1 \
  --instance-id "$INSTANCE_ID" --allocation-id "$ALLOC_ID"

EC2_DNS=$(aws ec2 describe-instances --region ap-south-1 --instance-ids "$INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].PublicDnsName' --output text)
echo "EIP=$EIP  EC2_DNS=$EC2_DNS"    # → notepad
```

Wait for first-boot provisioning to finish (2–4 minutes), then confirm:

```bash
# Type "yes" at the first-connection host-key prompt.
ssh -i ~/mexos-key.pem ubuntu@"$EIP" "cloud-init status --wait; tail -n 2 /var/log/user-data.log"
# Expect: status: done  +  "==> user-data finished OK at ..."
```

If it shows `error`, read `/var/log/user-data.log` on the box (Troubleshooting, §8.1).

### 3.9 Write the server `.env` and copy the stack files

Copy the three files the stack needs into `/opt/mexos` (the user-data script
created it, owned by `ubuntu`). The compose file **must** be named
`docker-compose.yml` and the nginx file **must** keep the name `nginx-aws.conf`
— `deploy.sh` and the compose volume mount expect exactly those names:

```bash
scp -i ~/mexos-key.pem deploy/aws/docker-compose.aws.yml ubuntu@"$EIP":/opt/mexos/docker-compose.yml
scp -i ~/mexos-key.pem deploy/aws/nginx-aws.conf         ubuntu@"$EIP":/opt/mexos/nginx-aws.conf
scp -i ~/mexos-key.pem deploy/aws/env.production.aws.example ubuntu@"$EIP":/opt/mexos/.env
```

Get the RDS endpoint (3.2 should be `available` by now):

```bash
aws rds wait db-instance-available --region ap-south-1 --db-instance-identifier mexos-db
RDS_ENDPOINT=$(aws rds describe-db-instances --region ap-south-1 \
  --db-instance-identifier mexos-db --query 'DBInstances[0].Endpoint.Address' --output text)
echo "RDS_ENDPOINT=$RDS_ENDPOINT"    # → notepad
```

Generate the secrets — run this one-liner **four separate times** and record
each output; every value must be **different** (the API refuses to boot if any
two JWT secrets match or any is under 32 chars):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Now SSH in and fill in the `.env`:

```bash
ssh -i ~/mexos-key.pem ubuntu@"$EIP"
# ── on the box from here ──
sed -i 's/\r$//' /opt/mexos/.env /opt/mexos/docker-compose.yml /opt/mexos/nginx-aws.conf   # strip Windows CRLF — ALWAYS run this after scp-ing from Windows
nano /opt/mexos/.env
```

Replace every `CHANGE_ME`. This is the complete contract — every variable, with
its production value or placeholder (`deploy/aws/env.production.aws.example`
is this same list with fuller commentary):

```dotenv
# ── Deploy ──
API_IMAGE=<ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/mexos-api:latest

# ── Core ──
NODE_ENV=production
PORT=4000
LOG_LEVEL=info

# ── Hardening ──
CORS_ORIGINS=https://mexos.netlify.app
TRUST_PROXY=true
# ENFORCE_HTTPS must stay EMPTY — do NOT write "false" (the string "false" is
# truthy and would turn it ON, causing an infinite redirect loop behind CloudFront).
ENFORCE_HTTPS=
RATE_LIMIT_WINDOW_MIN=15
RATE_LIMIT_MAX=300
REQUEST_TIMEOUT_MS=30000

# ── Database (RDS) — keep ?schema=public&sslmode=require EXACTLY ──
DATABASE_URL=postgresql://postgres:CHANGE_ME_DB_PASSWORD@CHANGE_ME_RDS_ENDPOINT:5432/tshirt?schema=public&sslmode=require

# ── Redis (container on this box; private network, no password needed) ──
REDIS_URL=redis://redis:6379

# ── Auth / JWT — three DIFFERENT 32+ char secrets (node one-liner, 3 runs) ──
JWT_ACCESS_SECRET=CHANGE_ME_SECRET_1
JWT_REFRESH_SECRET=CHANGE_ME_SECRET_2
JWT_GUEST_SECRET=CHANGE_ME_SECRET_3
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d
JWT_GUEST_TTL=7d

# ── Checkout shipping rule (INR, server-authoritative) ──
SHIPPING_FEE=79
FREE_SHIPPING_THRESHOLD=999

# ── OTP ──
OTP_TTL_MINUTES=10
OTP_MAX_PER_HOUR=3

# ── OTP — console logs OTPs (real customers CANNOT log in); switch to whatsapp
#    once the Business API is approved. WhatsApp is the only production channel. ──
OTP_PROVIDER=console
WHATSAPP_OTP_TEMPLATE=otp_login
WHATSAPP_OTP_LANGUAGE=en

# ── WhatsApp — noop until the Business API is approved (GOING_LIVE.md §5) ──
WHATSAPP_PROVIDER=noop
WHATSAPP_BUSINESS_NUMBER=+910000000000
WHATSAPP_API_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=
WHATSAPP_STATUS_TEMPLATE=order_status_update
WHATSAPP_GRAPH_VERSION=v21.0

# ── Payments — empty keys = stub gateway (no real money); GOING_LIVE.md §3.
#    When you add live keys, ALL THREE must be set or boot fails. ──
PAYMENT_GATEWAY=razorpay
PAYMENT_GATEWAY_KEY_ID=
PAYMENT_GATEWAY_KEY_SECRET=
PAYMENT_WEBHOOK_SECRET=

# ── Upload virus scanning — keep noop (clamav needs more RAM than this box has) ──
VIRUS_SCAN_PROVIDER=noop

# ── S3 — leave S3_ENDPOINT EMPTY for real AWS S3 (SDK picks the regional endpoint) ──
S3_ENDPOINT=
S3_REGION=ap-south-1
S3_BUCKET=CHANGE_ME_BUCKET_NAME
S3_ACCESS_KEY=CHANGE_ME_S3_ACCESS_KEY_ID
S3_SECRET_KEY=CHANGE_ME_S3_SECRET_ACCESS_KEY

# ── Meta Ads (optional; empty = no-op) ──
META_PIXEL_ID=
META_CONVERSIONS_API_TOKEN=

# ── Admin API — 32+ chars REQUIRED at boot ──
ADMIN_API_KEY=CHANGE_ME_SECRET_4
ADMIN_API_KEYS=

# ── Observability (leave as-is on this box) ──
METRICS_TOKEN=
OTEL_ENABLED=false
OTEL_SERVICE_NAME=tshirt-api
OTEL_EXPORTER_OTLP_ENDPOINT=
```

Fill-in map (notepad → `.env`):

| Placeholder                                            | Value from your notepad                                                   |
| ------------------------------------------------------ | ------------------------------------------------------------------------- |
| `<ACCOUNT_ID>` in `API_IMAGE`                          | `ACCOUNT_ID` (12 digits)                                                  |
| `CHANGE_ME_DB_PASSWORD`                                | `DB_PASSWORD` (3.2)                                                       |
| `CHANGE_ME_RDS_ENDPOINT`                               | `RDS_ENDPOINT` (3.9), e.g. `mexos-db.abc123.ap-south-1.rds.amazonaws.com` |
| `CHANGE_ME_SECRET_1..4`                                | the four `node` one-liner outputs                                         |
| `CHANGE_ME_BUCKET_NAME`                                | `BUCKET` (3.3)                                                            |
| `CHANGE_ME_S3_ACCESS_KEY_ID` / `..._SECRET_ACCESS_KEY` | the `mexos-s3-uploader` key pair (3.4)                                    |

Format rules (this file is parsed by docker compose interpolation, compose
`env_file:`, **and** `docker run --env-file`, which is very literal): **no
quotes** around values, **no same-line comments**, **no spaces around `=`**.

Save (`Ctrl+O`, Enter, `Ctrl+X`), then lock it down:

```bash
chmod 600 /opt/mexos/.env
```

### 3.10 First deploy + verify

Still on the box:

```bash
cd /opt/mexos && ./deploy.sh
```

`deploy.sh` (written by user-data — see `deploy/aws/ec2-user-data.sh`) logs in
to ECR via the instance role, pulls the image, runs
`docker run --rm --env-file .env <image> npx prisma migrate deploy` against RDS
**before** any new code serves traffic, then `docker compose up -d`. It is safe
to re-run any time.

Verify on the box:

```bash
docker compose ps            # nginx + api + redis, api shows (healthy)
curl -s http://localhost/api/health
# {"status":"ok",...}
docker compose logs api | tail -n 30
# No enforceProductionConfig errors; expect warnings about SMS console mode +
# stub payment gateway — that's correct until GOING_LIVE.md is done.
free -h                      # Swap: 2.0Gi (the mandatory swapfile is active)
exit
```

And from your laptop:

```bash
curl -s "http://$EIP/api/health"       # API through nginx
curl -s "http://$EIP/nginx-health"     # nginx itself → "ok"
```

- [ ] `docker compose ps` shows 3 services, api **(healthy)**
- [ ] `/api/health` returns 200 from the laptop
- [ ] `migrate deploy` printed applied migrations with no errors
- [ ] `free -h` shows 2 GB swap

### 3.11 Seed the storefront catalog

The catalog seed runs from **your laptop** with dev tooling (`tsx` is not in
the production image), reaching the private RDS through an SSH tunnel via the
EC2 box (which is allowed by `rds-sg`).

**Git Bash window 1** — open the tunnel and leave it running:

```bash
ssh -i ~/mexos-key.pem -N -L 5433:"$RDS_ENDPOINT":5432 ubuntu@"$EIP"
```

**Git Bash window 2** — repo root:

```bash
npm ci    # only if you haven't installed dev dependencies already
DATABASE_URL="postgresql://postgres:<DB_PASSWORD>@localhost:5433/tshirt?schema=public&sslmode=require" \
  npm run seed:storefront
```

(Substitute `<DB_PASSWORD>` from your notepad. The seed is idempotent — safe to
re-run.) Then `Ctrl+C` in window 1 to close the tunnel, and verify:

```bash
curl -s "http://$EIP/api/v1/products" | head -c 300
# JSON with the Mexos catalog products
```

---

## 4. CloudFront + wiring up the Netlify frontend

CloudFront gives the API a free HTTPS URL (`https://dxxxxxxxx.cloudfront.net`)
and forces browsers onto HTTPS. It does **no caching** (this is an API):
managed policy **CachingDisabled** + origin request policy **AllViewer** (which
forwards all headers, cookies, and query strings to the origin).

### 4.1 Create the distribution

```bash
cat > cloudfront-config.json <<EOF
{
  "CallerReference": "mexos-api-$(date +%s)",
  "Comment": "Mexos Studio API - EC2 origin, no caching",
  "Enabled": true,
  "PriceClass": "PriceClass_200",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "mexos-ec2-origin",
        "DomainName": "$EC2_DNS",
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "http-only",
          "OriginReadTimeout": 30,
          "OriginKeepaliveTimeout": 5
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "mexos-ec2-origin",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 7,
      "Items": ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"],
      "CachedMethods": { "Quantity": 2, "Items": ["GET", "HEAD"] }
    },
    "Compress": false,
    "CachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
    "OriginRequestPolicyId": "216adef6-5c7f-47e4-b989-5492eafa07d3"
  }
}
EOF

aws cloudfront create-distribution --region ap-south-1 \
  --distribution-config file://cloudfront-config.json \
  --query 'Distribution.{Id:Id,DomainName:DomainName,Status:Status}'
rm cloudfront-config.json
```

The two magic IDs are AWS **managed** policies, identical in every account:
`4135ea2d…` = CachingDisabled, `216adef6…` = AllViewer. `http-only` on the
origin is correct — the box has no TLS; CloudFront terminates HTTPS for
viewers. `Compress` stays false because nginx already gzips responses.

Record the output (**→ notepad**): `Id` (e.g. `E1A2B3C4D5E6F7`) and
`DomainName` (e.g. `d1a2b3c4d5e6f7.cloudfront.net`). Then wait for the edge
rollout (5–20 minutes):

```bash
DIST_ID=<Id from the output>
CF_DOMAIN=<DomainName from the output>
aws cloudfront wait distribution-deployed --region ap-south-1 --id "$DIST_ID"

curl -s "https://$CF_DOMAIN/api/health"
# {"status":"ok",...}  — over real HTTPS, no certificate warnings
```

### 4.2 Point the Netlify frontend at the API

1. Server side: `CORS_ORIGINS=https://mexos.netlify.app` is already set in the
   `.env` from 3.9 — nothing to change. (If you ever change it: edit
   `/opt/mexos/.env`, then `cd /opt/mexos && docker compose up -d` to restart.)
2. Netlify dashboard → your site → **Site configuration** →
   **Environment variables** → **Add a variable**:

   ```
   NEXT_PUBLIC_API_URL=https://<CF_DOMAIN>/api/v1
   ```

   (your real CloudFront domain, e.g. `https://d1a2b3c4d5e6f7.cloudfront.net/api/v1`)

3. **Deploys** → **Trigger deploy** → **Clear cache and deploy site**.
   `NEXT_PUBLIC_*` variables are baked in at build time — a redeploy is required.

Smoke test in a browser: open <https://mexos.netlify.app>, check the catalog
loads, and confirm the Network tab shows API calls to the CloudFront domain
with no CORS errors.

> When you activate real Razorpay keys later (GOING_LIVE.md §3), the webhook
> URL to register is `https://<CF_DOMAIN>/api/v1/payments/webhook`.

- [ ] `https://<CF_DOMAIN>/api/health` returns 200
- [ ] `http://<CF_DOMAIN>/api/health` redirects to HTTPS (301)
- [ ] Storefront loads catalog from the CloudFront URL, no CORS errors in console

---

## 5. Attaching a custom domain later

When you buy a domain (e.g. `mexos.in`), the usual shape is: frontend on
`www.mexos.in` (configured in Netlify), API on `api.mexos.in` (CloudFront).
CloudFront requires its certificate to live in **us-east-1** — that is the one
exception to this guide's ap-south-1 rule, and it's mandatory.

1. **Request the certificate (us-east-1!):**

   ```bash
   CERT_ARN=$(aws acm request-certificate --region us-east-1 \
     --domain-name api.mexos.in --validation-method DNS \
     --query CertificateArn --output text)
   echo "CERT_ARN=$CERT_ARN"    # → notepad

   # The DNS record ACM wants you to create to prove you own the domain:
   aws acm describe-certificate --region us-east-1 --certificate-arn "$CERT_ARN" \
     --query 'Certificate.DomainValidationOptions[0].ResourceRecord'
   ```

2. **Create that validation CNAME** at your registrar's DNS panel (Name → the
   printed `Name`, Value → the printed `Value`), then wait until issued:

   ```bash
   aws acm wait certificate-validated --region us-east-1 --certificate-arn "$CERT_ARN"
   ```

3. **Attach it to the distribution** (console is the least error-prone route):
   CloudFront console → your distribution → **General** → **Edit** →
   **Alternate domain name (CNAME)**: `api.mexos.in` →
   **Custom SSL certificate**: pick the issued cert →
   Security policy **TLSv1.2_2021** → Save. Wait for status **Deployed**.
4. **Point DNS at CloudFront** — at your registrar, add:
   `CNAME  api.mexos.in  →  <CF_DOMAIN>` (the `dxxxx.cloudfront.net` name).
5. **Rewire the app:**
   - Netlify: `NEXT_PUBLIC_API_URL=https://api.mexos.in/api/v1` → redeploy.
   - If the frontend also moves to the custom domain: on the box, edit
     `/opt/mexos/.env` → `CORS_ORIGINS=https://mexos.netlify.app,https://www.mexos.in`
     (comma-separated, no trailing slashes, no spaces) →
     `cd /opt/mexos && docker compose up -d`. Also add the new origin to the S3
     CORS rule (3.3) and re-run `put-bucket-cors`.
   - Update the Razorpay webhook URL if payments are live.

---

## 6. Updating the app on new commits

From the repo root, after merging to `main` (Docker Desktop running):

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --region ap-south-1 --query Account --output text)
ECR="$ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com"

aws ecr get-login-password --region ap-south-1 \
  | docker login --username AWS --password-stdin "$ECR"

# Tag with the git sha (rollback target) AND latest (what the box pulls).
GIT_SHA=$(git rev-parse --short HEAD)
docker build -t "$ECR/mexos-api:$GIT_SHA" -t "$ECR/mexos-api:latest" .
docker push "$ECR/mexos-api:$GIT_SHA"
docker push "$ECR/mexos-api:latest"

# Deploy: pull → migrate → restart, in that order, via the on-box helper.
ssh -i ~/mexos-key.pem ubuntu@"$EIP" "/opt/mexos/deploy.sh"

curl -s "https://$CF_DOMAIN/api/health"
```

**Rollback:** on the box, edit `/opt/mexos/.env` and set
`API_IMAGE=<ECR>/mexos-api:<previous-sha>`, then re-run `/opt/mexos/deploy.sh`.
(Migrations are forward-only — if a bad migration shipped, restore RDS from a
snapshot or point-in-time first.)

Keep a record per deploy, per DEPLOYMENT_CHECKLIST.md:

```
Deployment record: date=____ operator=____ git_sha=____ image_tag=____
```

---

## 7. Teardown

Destroys everything this guide created, in dependency order. **This deletes
your production database** — take a final snapshot (kept below) unless you are
certain. Costs stop when the resources are gone.

```bash
# 0. Session vars (from your notepad if the shell is fresh)
DIST_ID=<cloudfront id>; INSTANCE_ID=<instance id>; ALLOC_ID=<eip allocation id>
ACCOUNT_ID=$(aws sts get-caller-identity --region ap-south-1 --query Account --output text)
BUCKET="mexos-design-uploads-$ACCOUNT_ID"

# 1. CloudFront — must be disabled before it can be deleted.
ETAG=$(aws cloudfront get-distribution-config --region ap-south-1 --id "$DIST_ID" --query ETag --output text)
aws cloudfront get-distribution-config --region ap-south-1 --id "$DIST_ID" \
  --query DistributionConfig > dist.json
sed -i 's/"Enabled": true/"Enabled": false/' dist.json
aws cloudfront update-distribution --region ap-south-1 --id "$DIST_ID" \
  --if-match "$ETAG" --distribution-config file://dist.json
aws cloudfront wait distribution-deployed --region ap-south-1 --id "$DIST_ID"
ETAG=$(aws cloudfront get-distribution-config --region ap-south-1 --id "$DIST_ID" --query ETag --output text)
aws cloudfront delete-distribution --region ap-south-1 --id "$DIST_ID" --if-match "$ETAG"
rm dist.json

# 2. EC2 instance + Elastic IP + key pair
aws ec2 terminate-instances --region ap-south-1 --instance-ids "$INSTANCE_ID"
aws ec2 wait instance-terminated --region ap-south-1 --instance-ids "$INSTANCE_ID"
aws ec2 release-address --region ap-south-1 --allocation-id "$ALLOC_ID"
aws ec2 delete-key-pair --region ap-south-1 --key-name mexos-key
rm -f ~/mexos-key.pem

# 3. RDS — turn off deletion protection, then delete WITH a final snapshot.
aws rds modify-db-instance --region ap-south-1 --db-instance-identifier mexos-db \
  --no-deletion-protection --apply-immediately
aws rds delete-db-instance --region ap-south-1 --db-instance-identifier mexos-db \
  --final-db-snapshot-identifier mexos-db-final
#   (only if you truly want NO copy kept: replace the flag above with --skip-final-snapshot)
aws rds wait db-instance-deleted --region ap-south-1 --db-instance-identifier mexos-db

# 4. S3 — empty, then delete.
aws s3 rm "s3://$BUCKET" --recursive --region ap-south-1
aws s3api delete-bucket --region ap-south-1 --bucket "$BUCKET"

# 5. ECR (--force deletes all images too)
aws ecr delete-repository --region ap-south-1 --repository-name mexos-api --force

# 6. Security groups — rds-sg first (its rule references api-sg).
RDS_SG_ID=$(aws ec2 describe-security-groups --region ap-south-1 \
  --filters Name=group-name,Values=mexos-rds-sg --query 'SecurityGroups[0].GroupId' --output text)
API_SG_ID=$(aws ec2 describe-security-groups --region ap-south-1 \
  --filters Name=group-name,Values=mexos-api-sg --query 'SecurityGroups[0].GroupId' --output text)
aws ec2 delete-security-group --region ap-south-1 --group-id "$RDS_SG_ID"
aws ec2 delete-security-group --region ap-south-1 --group-id "$API_SG_ID"

# 7. IAM — S3 user (delete its keys first), then the EC2 role + profile.
KEY_ID=$(aws iam list-access-keys --region ap-south-1 --user-name mexos-s3-uploader \
  --query 'AccessKeyMetadata[0].AccessKeyId' --output text)
aws iam delete-access-key --region ap-south-1 --user-name mexos-s3-uploader --access-key-id "$KEY_ID"
aws iam delete-user-policy --region ap-south-1 --user-name mexos-s3-uploader --policy-name mexos-s3-least-priv
aws iam delete-user --region ap-south-1 --user-name mexos-s3-uploader
aws iam remove-role-from-instance-profile --region ap-south-1 \
  --instance-profile-name mexos-ec2-profile --role-name mexos-ec2-role
aws iam delete-instance-profile --region ap-south-1 --instance-profile-name mexos-ec2-profile
aws iam detach-role-policy --region ap-south-1 --role-name mexos-ec2-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly
aws iam delete-role --region ap-south-1 --role-name mexos-ec2-role
```

Leftovers that still bill: the final RDS snapshot (small; delete via
`aws rds delete-db-snapshot --region ap-south-1 --db-snapshot-identifier mexos-db-final`
when no longer needed) and the ACM certificate from section 5 (free; delete in
the us-east-1 ACM console). Double-check the **Billing console** a day later —
it should show everything at $0.

---

## 8. Troubleshooting

### 8.1 First boot: `cloud-init status` shows `error`

```bash
ssh -i ~/mexos-key.pem ubuntu@"$EIP" "sudo tail -n 50 /var/log/user-data.log"
```

Almost always a transient apt/network failure. Fix: terminate the instance
(`aws ec2 terminate-instances --region ap-south-1 --instance-ids "$INSTANCE_ID"`)
and repeat 3.8 — the user-data script is idempotent and everything else
(EIP, SGs, RDS) is untouched. If the log shows
`/bin/bash^M: bad interpreter`, the user-data file picked up Windows CRLF line
endings — restore it (`git checkout -- deploy/aws/ec2-user-data.sh`; the
`.gitattributes` in this folder pins it to LF) and relaunch.

### 8.2 `deploy.sh` fails at "Logging in to ECR"

The instance role is missing or wrong. Verify:

```bash
aws ec2 describe-instances --region ap-south-1 --instance-ids "$INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].IamInstanceProfile.Arn'
# Must show .../mexos-ec2-profile — if null, re-do 3.7 then:
aws ec2 associate-iam-instance-profile --region ap-south-1 --instance-id "$INSTANCE_ID" \
  --iam-instance-profile Name=mexos-ec2-profile
```

### 8.3 Health check fails (`curl /api/health` hangs, 502s, or connection refused)

Work outward from the app:

```bash
ssh -i ~/mexos-key.pem ubuntu@"$EIP"
docker compose -f /opt/mexos/docker-compose.yml ps        # what's actually running?
docker compose -f /opt/mexos/docker-compose.yml logs api | tail -n 50
```

- **api is restart-looping** → read the first error line:
  - `enforceProductionConfig` / "placeholder" errors → a `CHANGE_ME` is still
    in `/opt/mexos/.env`, a JWT secret is < 32 chars, or two JWT secrets are
    identical. Fix the `.env`, then `docker compose up -d`.
  - `Can't reach database server` → see 8.4.
  - Values mysteriously wrong (e.g. auth failures with the _right_ password) →
    Windows CRLF in `.env`: `sed -i 's/\r$//' /opt/mexos/.env && docker compose up -d`.
- **api runs but shows (unhealthy)** → the in-image healthcheck GETs
  `/api/health`; check `docker inspect --format '{{json .State.Health}}' $(docker compose ps -q api)`.
- **nginx not running / curl refused** → `docker compose logs nginx`; a config
  error usually means `/opt/mexos/nginx-aws.conf` is missing or misnamed (the
  compose file mounts exactly `./nginx-aws.conf`).
- **Works on the box, dead from the laptop** → security group: port 80 rule
  missing on `mexos-api-sg`, or you applied the CloudFront prefix-list
  hardening in 3.1 (expected — test via the CloudFront URL).
- **Everything slow / random OOM kills** → `free -h`. If Swap shows 0, the
  swapfile is missing (see `/var/log/user-data.log`); create it manually with
  the commands from step 2 of `deploy/aws/ec2-user-data.sh`.

### 8.4 Migration fails (`npx prisma migrate deploy` errors)

- **`P1001: Can't reach database server`** →
  1. RDS is `available`? `aws rds describe-db-instances --region ap-south-1 --db-instance-identifier mexos-db --query 'DBInstances[0].DBInstanceStatus'`
  2. `rds-sg` allows 5432 from `api-sg` (not from an IP)? Re-check 3.1.
  3. The RDS **endpoint hostname** in `DATABASE_URL` has no typo and ends with
     `.ap-south-1.rds.amazonaws.com`, port `:5432`.
- **`P1000: Authentication failed`** → password mismatch. If in doubt, reset it:
  `aws rds modify-db-instance --region ap-south-1 --db-instance-identifier mexos-db --master-user-password "<new>" --apply-immediately`
  and update `.env`.
- **TLS errors** → `DATABASE_URL` must end with `?schema=public&sslmode=require`
  — both parameters, exactly.
- **A migration itself fails** → the error names the migration. Fix forward
  (new migration) or restore RDS to a point in time; never hand-edit applied
  migrations. `docker run --rm --env-file .env "$API_IMAGE" npx prisma migrate status`
  shows what's pending vs applied.

### 8.5 CloudFront returns 502 / 504

502 = CloudFront reached out and the origin answered badly; 504 = no answer.

1. Origin alive? `curl -s "http://$EIP/api/health"` (from your laptop — needs
   the port-80-from-anywhere rule; temporarily re-add it if you hardened 3.1).
2. Distribution origin settings: **Origin domain** must be the EC2 public DNS
   (`ec2-…ap-south-1.compute.amazonaws.com` — resolves to the EIP), and
   **Protocol** must be **HTTP only** on **port 80**. `https-only` here is the
   #1 cause of instant 502s — the box has no TLS on purpose.
3. If you replaced/relaunched the instance, its public DNS changed with it —
   update the distribution's origin domain to the new `EC2_DNS`.
4. Origin timeout is 30 s (matches `REQUEST_TIMEOUT_MS`); sustained 504s with a
   healthy origin usually mean the box is swapping hard — `free -h`, `docker stats`.

### 8.6 Browser CORS errors on the storefront

- `CORS_ORIGINS` on the box must contain the **exact** origin: scheme + host,
  no trailing slash, comma-separated if several
  (`https://mexos.netlify.app`). Restart after edits: `docker compose up -d`.
- The storefront must call the API via `https://<CF_DOMAIN>/api/v1` (check
  `NEXT_PUBLIC_API_URL` in Netlify and that you redeployed after setting it).
- Upload PUTs failing with CORS → the **S3 bucket** CORS (3.3) must list the
  frontend origin too — it is separate from the API's CORS.

### 8.7 Lost SSH access (IP changed)

```bash
MY_IP=$(curl -s https://checkip.amazonaws.com)
aws ec2 authorize-security-group-ingress --region ap-south-1 \
  --group-id "$API_SG_ID" --protocol tcp --port 22 --cidr "$MY_IP/32"
```

Prune stale port-22 rules occasionally: EC2 console → Security Groups →
`mexos-api-sg` → Edit inbound rules.

---

_Next steps after this guide: work through [GOING_LIVE.md](../../GOING_LIVE.md)
to switch SMS, payments, and WhatsApp from stubs to real providers, then gate
the launch with [DEPLOYMENT_CHECKLIST.md](../DEPLOYMENT_CHECKLIST.md)._
