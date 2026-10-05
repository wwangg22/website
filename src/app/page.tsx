import Hero from "@/components/home/Hero";

export default function Home() {
  return (
    <main className="page-wide flex flex-1 flex-col gap-section">
      <section className="pt-gutter text-center">
        <h1 className="text-display font-medium tracking-tight">William Wang</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-ink-soft">
          Engineer working across robotics, chip design and 3D graphics. Explore the projects, take
          apart CAD models in the garage, or read the blog.
        </p>
      </section>
      <Hero />
    </main>
  );
}
