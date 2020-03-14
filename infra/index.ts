import * as pulumi from "@pulumi/pulumi";

import { Website } from "./website";
import { WebsiteUploadHandler } from "./website-upload-handler";

// Stack configuration.
const config = new pulumi.Config("website");

// Cloud resources.
const site = new Website(config)
const processor = new WebsiteUploadHandler(config);

// Stack outputs.
export const siteBucketName = site.bucket.resource.bucketDomainName;
export const siteBucketURL = site.bucket.resource.websiteEndpoint;
export const uploadBucketName = processor.resource.bucket;
export const distributionID = site.distribution.resource.id;
export const distributionURL = site.distribution.resource.domainName;
