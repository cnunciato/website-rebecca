import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as fs from "fs";
import * as mime from "mime";
import * as glob from "glob";

export class WebsiteBucket {

    public resource: aws.s3.Bucket;

    constructor(config: pulumi.Config) {

        // The folder into which the static site is rendered. Files are expected to be here
        // when this Pulumi application runs.
        const siteDir = config.require("site_dir");

        // The destination bucket for the website.
        this.resource = new aws.s3.Bucket(config.require("site_bucket"), {
            website: {
                indexDocument: "index.html",
                errorDocument: "404.html"
            }
        });

        // The files comprising the website, which will ultimately be copied to S3.
        const files = glob.sync(`${siteDir}/**/*`);

        // For each file, create a new S3 bucket object for Pulumi to manage.
        files.forEach((path: string) => {
            if (!fs.lstatSync(path).isDirectory()) {
                let object = new aws.s3.BucketObject(path.replace(siteDir, ""), {
                    bucket: this.resource,
                    source: new pulumi.asset.FileAsset(path),
                    contentType: mime.getType(path) || undefined
                });
            }
        });

        // Define an access policy allowing public read access to all objects in the bucket.
        const publicReadPolicyForBucket = (name: string) => {
            return JSON.stringify({
                Version: "2012-10-17",
                Statement: [{
                    Effect: "Allow",
                    Principal: "*",
                    Action: [
                        "s3:GetObject"
                    ],
                    Resource: [
                        `arn:aws:s3:::${name}/*`
                    ]
                }]
            })
        }

        // Associate the policy with the bucket.
        const bucketPolicy = new aws.s3.BucketPolicy("bucketPolicy", {
            bucket: this.resource.bucket,
            policy: this.resource.bucket.apply(publicReadPolicyForBucket)
        });
    }
}
