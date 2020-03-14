import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";
import * as aws from "@pulumi/aws";

export class WebsiteUploadHandler {

    public resource: aws.s3.Bucket;

    constructor(config: pulumi.Config) {
        this.resource = new aws.s3.Bucket(config.require("source_bucket"));

        const cluster = awsx.ecs.Cluster.getDefault();
        const bucketName = this.resource.id;

        const task = new awsx.ecs.FargateTaskDefinition("processorTask", {
            container: {
                image: config.require("process_image_tag"),
                memory: 4096,
                cpu: 4,
                environment: [
                    {
                        name: "AWS_ACCESS_KEY_ID",
                        value: config.require("aws_access_key_id"),
                    },
                    {
                        name: "AWS_SECRET_ACCESS_KEY",
                        value: config.require("aws_secret_access_key"),
                    },
                    {
                        name: "GITHUB_PERSONAL_ACCESS_TOKEN",
                        value: config.require("github_personal_access_token"),
                    }
                ]
            },
        });

        this.resource.onObjectCreated("onUploadEvent", new aws.lambda.CallbackFunction<aws.s3.BucketEvent, void>("onUploadHandler", {
            policies: [
                aws.iam.AWSLambdaFullAccess,
                aws.iam.AmazonEC2ContainerServiceFullAccess,
            ],
            callback: async bucketArgs => {
                console.log("Callback invoked with ", JSON.stringify(bucketArgs.Records));

                if (!bucketArgs.Records) {
                    return;
                }

                for (const record of bucketArgs.Records) {

                    // Pass an s3 URL to the processor, which will download new file file and process it.
                    const command = ["npm", "start", `s3://${bucketName.get()}/${record.s3.object.key}`];
                    console.log(command.join(" "));

                    await task.run({
                        cluster,
                        overrides: {
                            containerOverrides: [
                                {
                                    name: "container",
                                    command,
                                }
                            ]
                        }
                    });
                }
            }
        }));
    }
}
