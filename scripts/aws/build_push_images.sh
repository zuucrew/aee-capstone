#!/usr/bin/env bash
# =============================================================================
# build_push_images.sh — build images locally, push to ECR.
#
# Why this exists: Copilot's docker-container builder can't read the build
# context from this Dropbox-hosted path (the 🚧 emoji in the absolute path
# breaks its context tarball). The DEFAULT docker driver reads it fine, so
# we build with `docker build` and push the result, then deploy with
# `image.location` in the Copilot manifests.
#
# Builds for linux/arm64 (Graviton) — native on Apple Silicon, ~20% cheaper
# on Fargate.
#
# Usage:
#     ./scripts/aws/build_push_images.sh           # build + push all 3
#     ./scripts/aws/build_push_images.sh api       # just one
# =============================================================================
set -euo pipefail

PROFILE="${AWS_PROFILE:-nawaloka}"
REGION="${AWS_REGION:-us-west-2}"
ACCOUNT="$(aws sts get-caller-identity --profile "$PROFILE" --query Account --output text)"
REGISTRY="${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com"
echo "Registry: $REGISTRY, Profile: $PROFILE, Region: $REGION, Account: $ACCOUNT"

cd "$(dirname "$0")/../.."

echo "==> ECR login…"
aws ecr get-login-password --profile "$PROFILE" --region "$REGION" \
  | docker login --username AWS --password-stdin "$REGISTRY" >/dev/null

build_push() {
  local svc="$1" dockerfile="$2"
  echo ""
  echo "==> [$svc] building (linux/arm64, default driver)…"
  # --load puts the image in the local store so we can push it.
  docker build \
    --platform linux/arm64 \
    -f "$dockerfile" \
    -t "${REGISTRY}/nawaloka/${svc}:latest" \
    .
  echo "==> [$svc] pushing to ECR…"
  docker push "${REGISTRY}/nawaloka/${svc}:latest"
}

TARGET="${1:-all}"

if [ "$TARGET" = "all" ] || [ "$TARGET" = "api" ]; then
  build_push api docker/api/Dockerfile
fi
if [ "$TARGET" = "all" ] || [ "$TARGET" = "worker" ]; then
  # worker reuses the api image — just retag + push under the worker repo.
  echo ""
  echo "==> [worker] retagging api image…"
  docker tag "${REGISTRY}/nawaloka/api:latest" "${REGISTRY}/nawaloka/worker:latest"
  docker push "${REGISTRY}/nawaloka/worker:latest"
fi
if [ "$TARGET" = "all" ] || [ "$TARGET" = "voice" ]; then
  build_push voice docker/voice/Dockerfile
fi

echo ""
echo "✅ Images in ECR. Now: copilot svc deploy --name api/worker/voice --env dev"
