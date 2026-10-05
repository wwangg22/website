// Images and other small files are in the repo under public/assets.
const assetBase = process.env.NEXT_PUBLIC_ASSET_BASE ?? "/assets";

// Large media (STL parts, splats, NeRF scenes) lives in the Media bucket, which the
// router serves at /media. The local copy in ./media is gitignored; in dev,
// next.config.ts proxies /media to the deployed site (see MEDIA_ORIGIN).
const mediaBase = process.env.NEXT_PUBLIC_MEDIA_BASE ?? "/media";

const join = (base: string, path: string) => `${base}/${path.split("/").map(encodeURIComponent).join("/")}`;

export const asset = (path: string) => join(assetBase, path);
export const media = (path: string) => join(mediaBase, path);
