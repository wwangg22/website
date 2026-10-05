import type { Metadata } from "next";
import Link from "next/link";
import Morph from "@/components/Morph";
import PageHeader from "@/components/PageHeader";
import { asset } from "@/lib/assets";
import { formatDate, listPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog",
  description: "Notes on robotics, control, reinforcement learning and GPU programming.",
};

export default async function BlogPage() {
  const posts = await listPosts();
  return (
    <main className="page-wide flex-1">
      <PageHeader title="Blog" />
      <ul className="grid-cards mt-section gap-card">
        {posts.map((p) => (
          <li key={p.id} className="reveal">
            <Link href={`/blog/${p.id}`} className="clay-sm clay-lift flex h-full flex-col gap-4 p-tile">
              {/* Contained, not cropped: many covers are charts, equations or handwriting. */}
              <div className="clay-inset aspect-[16/10] overflow-hidden p-frame">
                <Morph id={`post-${p.id}-cover`} media>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={asset(p.cover)} alt="" loading="lazy" className="h-full w-full object-contain" />
                </Morph>
              </div>
              <div className="flex flex-col gap-1.5">
                <Morph id={`post-${p.id}-title`}>
                  <h2 className="text-xl font-semibold tracking-tight">{p.title}</h2>
                </Morph>
                <time dateTime={p.date} className="text-sm text-ink-soft">
                  {formatDate(p.date)}
                </time>
                <p className="mt-1 line-clamp-3 text-ink-soft">{p.excerpt}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
