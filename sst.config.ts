// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "website",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
      providers: { aws: { region: "us-east-1" } },
    };
  },
  async run() {
    // This AWS account caps Lambda memory at 512 MB (new-account quota), below SST's
    // defaults. The site is fully prerendered, so 512 MB is plenty.
    const memory = "512 MB";
    $transform(sst.aws.Function, (args) => {
      args.memory ??= memory;
    });

    // Large media (STL parts, splats, NeRF scenes). Not in git: upload with
    //   aws s3 sync media s3://<mediaBucket>/media
    const media = new sst.aws.Bucket("Media", { access: "cloudfront" });

    // One CloudFront distribution: /media/* from the bucket, everything else from the site.
    const router = new sst.aws.Router("Router");
    router.routeBucket("/media", media);

    new sst.aws.Nextjs("Web", {
      router: { instance: router },
      server: { memory },
      imageOptimization: { memory },
    });

    return { url: router.url, mediaBucket: media.name };
  },
});
