#!/bin/bash

export IMAGE_TAG="cnunciato/process:$(date +%s)"
docker build processor -t $IMAGE_TAG
docker push $IMAGE_TAG

echo "$IMAGE_TAG"
pulumi -C infra config set process_image_tag "$IMAGE_TAG"
