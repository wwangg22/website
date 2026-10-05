import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PostBody, { Frame } from "@/components/blog/PostBody";
import Morph from "@/components/Morph";
import PageHeader, { BackLink } from "@/components/PageHeader";
import { asset } from "@/lib/assets";
import { formatDate, getPost, listPosts } from "@/lib/blog";

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await listPosts()).map((p) => ({ id: p.id }));
}

export async function generateMetadata(props: PageProps<"/blog/[id]">): Promise<Metadata> {
  const post = await getPost((await props.params).id);
  return post ? { title: post.title } : {};
}

export default async function PostPage(props: PageProps<"/blog/[id]">) {
  const post = await getPost((await props.params).id);
  if (!post) notFound();

  return (
    <main className="page-read flex flex-1 flex-col gap-section">
      <article className="flex flex-col gap-section">
        <PageHeader back={{ href: "/blog", label: "Blog" }} title={post.title} morphId={`post-${post.id}-title`}>
          <time dateTime={post.date} className="text-sm text-ink-soft">
            {formatDate(post.date)}
          </time>
        </PageHeader>
        <Frame>
          <Morph id={`post-${post.id}-cover`} media>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asset(post.cover)} alt="" className="max-h-[70vh] w-auto max-w-full rounded-xl" />
          </Morph>
        </Frame>
        <PostBody blocks={post.blocks} title={post.title} />
      </article>
      <BackLink href="/blog">Blog</BackLink>
    </main>
  );
}
