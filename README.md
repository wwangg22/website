# wwang22.com

Personal site: home, 3D garage, projects (with Gaussian-splat and MobileNeRF viewers) and blog.
Next.js (App Router) + Tailwind, deployed to AWS with [SST](https://sst.dev).

## Develop

```bash
npm install
npm run dev
```

Images and other small files are in `public/assets`. Large media (STL parts, splats, NeRF
scenes) is not in git: it lives in the `Media` S3 bucket and is served at `/media`. In dev,
set `MEDIA_ORIGIN=<deployed site url>` in `.env.development.local` to proxy `/media` to the
deployed site.

## Deploy

```bash
AWS_PROFILE=personal npx sst deploy --stage production
```

The deploy prints the site `url` and the `mediaBucket` name. To add or change large media, put
it under `./media` (gitignored) and sync it:

```bash
aws s3 sync media s3://<mediaBucket>/media --cache-control "public,max-age=31536000,immutable"
```

## Content

- Blog posts: `content/blog/*.json`, read through `src/lib/blog.ts`. They were converted from the
  old site with `scripts/convert-blog.mjs`; text fixes belong in that script's tables.
- Garage: `node scripts/garage-manifest.mjs` regenerates `src/data/garage.json` from
  `media/garage/stl` and `public/assets/garage`.
