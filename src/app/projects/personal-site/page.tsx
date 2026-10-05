import type { Metadata } from "next";
import { asset } from "@/lib/assets";
import ProjectShell, { Card, Section } from "@/components/projects/ProjectShell";
import { Figure, YouTube } from "@/components/projects/Media";

export const metadata: Metadata = { title: "Personal website" };

// NOTE: this write-up describes the previous version of the site.
export default function PersonalWebsitePage() {
  return (
    <ProjectShell
      title="Personal website"
      lede={
        <>
          A full-stack <strong className="text-ink">Next.js</strong> site deployed on{" "}
          <strong className="text-ink">AWS</strong>, featuring an interactive <em>3D garage</em> built with{" "}
          <strong className="text-ink">Three.js</strong>, a custom blog CMS and secure JWT-based admin authentication.
        </>
      }
    >
      <Figure src={asset("data/personal/landing_page.jpg")} alt="Personal website homepage screenshot" />

      <Section title="Highlights">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Immersive 3D garage",
              body: (
                <>
                  Explore <strong>SolidWorks</strong> models of past projects in an interactive Three.js scene, with
                  orbit, zoom and exploded views for a closer look at the mechanics.
                </>
              ),
            },
            {
              title: "Serverless stack",
              body: (
                <>
                  Built with <strong>Next.js</strong> and deployed with <strong>SST</strong> to AWS CloudFront and
                  Lambda@Edge. Assets live in S3, and <strong>DynamoDB</strong> provides very low latency worldwide.
                </>
              ),
            },
            {
              title: "Custom blog CMS",
              body: (
                <>
                  An admin-only, Markdown-friendly WYSIWYG editor lets me publish new posts on the fly. Authentication
                  uses <strong>JWTs</strong> stored in cookies.
                </>
              ),
            },
          ].map((h) => (
            <Card key={h.title} title={h.title}>
              <p>{h.body}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Video demos">
        <div className="space-y-8">
          <YouTube id="bXy2Gf0HGqI" title="Blog editor and JWT authentication demo" />
          <YouTube id="cWZLOO-3l6M" title="3D garage demo" />
        </div>
      </Section>
    </ProjectShell>
  );
}
