import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

export class WebsiteDistribution {

    public resource: aws.cloudfront.Distribution;

    constructor(config: pulumi.Config, bucket: aws.s3.Bucket) {

        // Cache distributed objects for ten minutes.
        const cacheTtl = 60 * 10;

        // Define the properties of the CloudFront distribution.
        const distributionArgs = {
            enabled: true,
            aliases: [
                config.require("targetDomain")
            ],
            origins: [
                {
                    originId: bucket.arn,
                    domainName: bucket.websiteEndpoint,
                    customOriginConfig: {
                        originProtocolPolicy: "http-only",
                        httpPort: 80,
                        httpsPort: 443,
                        originSslProtocols: ["TLSv1.2"],
                    },
                }
            ],
            defaultRootObject: "index.html",
            defaultCacheBehavior: {
                targetOriginId: bucket.arn,
                viewerProtocolPolicy: "redirect-to-https",
                allowedMethods: ["GET", "HEAD", "OPTIONS"],
                cachedMethods: ["GET", "HEAD", "OPTIONS"],
                defaultTtl: cacheTtl,
                maxTtl: cacheTtl,
                minTtl: 0,
                forwardedValues: {
                    cookies: { forward: "none" },
                    queryString: false,
                }
            },
            priceClass: "PriceClass_100",
            customErrorResponses: [
                {
                    errorCode: 404,
                    responseCode: 404,
                    responsePagePath: "/404.html"
                }
            ],
            restrictions: {
                geoRestriction: {
                    restrictionType: "none"
                }
            },
            viewerCertificate: {
                acmCertificateArn: config.require("certificateArn"),
                sslSupportMethod: "sni-only"
            }
        };

        // Define the CloudFront distribution.
        this.resource = new aws.cloudfront.Distribution("cdn", distributionArgs);
    }
}
