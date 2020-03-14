import * as pulumi from "@pulumi/pulumi";

import { WebsiteBucket } from "./website-bucket";
import { WebsiteDistribution } from "./website-distribution";

export class Website {
    bucket: WebsiteBucket;
    distribution: WebsiteDistribution;

    constructor(config: pulumi.Config) {
        this.bucket = new WebsiteBucket(config);
        this.distribution = new WebsiteDistribution(config, this.bucket.resource);
    }
}
