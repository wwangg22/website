import { asset } from "@/lib/assets";
import type { Block } from "@/lib/blog";

// Pressed-in well that hugs its image, so portrait and square media don't float in empty margins.
export function Frame({ children }: { children: React.ReactNode }) {
  return <figure className="clay-inset reveal mx-auto w-fit max-w-full p-frame">{children}</figure>;
}

export default function PostBody({ blocks, title }: { blocks: Block[]; title: string }) {
  return (
    <div className="flex flex-col gap-5 text-[1.075rem] leading-8">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "paragraph":
            return (
              <p
                key={i}
                className="max-w-[68ch] [&_a]:font-semibold [&_a]:underline [&_a]:decoration-coral [&_a]:decoration-2 [&_a]:underline-offset-2 [&_a]:[overflow-wrap:anywhere]"
                // Sanitised to an inline-tag allow-list by getPost().
                dangerouslySetInnerHTML={{ __html: b.html }}
              />
            );
          case "image":
            return (
              <Frame key={i}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={asset(b.src)} alt="" loading="lazy" className="max-h-[70vh] w-auto max-w-full rounded-xl" />
              </Frame>
            );
          case "code":
            return (
              <pre key={i} className="clay-inset overflow-x-auto px-5 py-4 font-mono text-sm leading-6 [font-variant-ligatures:none]">
                <code>{b.text}</code>
              </pre>
            );
          case "embed":
            return (
              <div key={i} className="clay-inset reveal p-frame">
                <iframe
                  src={b.src}
                  title={`Embedded video from ${title}`}
                  allowFullScreen
                  loading="lazy"
                  className="aspect-video w-full rounded-xl"
                />
              </div>
            );
        }
      })}
    </div>
  );
}
