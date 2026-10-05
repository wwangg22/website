import ZoomImage from "./ZoomImage";
import { link } from "./ProjectShell";

// Images sit on a pressed-in well that hugs them, so charts with baked-in white backgrounds
// read as mounted prints in dark mode rather than holes in the page.
export function Figure({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
  return (
    <figure className="clay-inset mx-auto h-fit w-fit max-w-full p-frame">
      <ZoomImage src={src} alt={alt} />
      {/* w-0 min-w-full: the caption wraps to the image's width instead of widening the frame. */}
      {caption && <figcaption className="w-0 min-w-full px-2 pt-2.5 pb-1 text-sm text-ink-soft">{caption}</figcaption>}
    </figure>
  );
}

export function YouTube({ id, title }: { id: string; title: string }) {
  return (
    <div className="clay-inset p-frame">
      <iframe
        src={`https://www.youtube.com/embed/${id}`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="aspect-video w-full rounded-xl"
      />
    </div>
  );
}

export function Pdf({ src, title }: { src: string; title: string }) {
  return (
    <>
      <div className="clay-inset p-frame">
        <iframe src={`${src}#toolbar=0&navpanes=0&scrollbar=0`} title={title} className="h-[80vh] w-full rounded-xl" />
      </div>
      <p className="text-base">
        Trouble viewing?{" "}
        <a href={src} target="_blank" rel="noopener noreferrer" className={link}>
          Download the PDF ↗
        </a>
      </p>
    </>
  );
}
