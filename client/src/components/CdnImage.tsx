/**
 * <CdnImage> — drop-in replacement for <img> that routes through the
 * Netlify Image CDN for automatic resizing, format negotiation (AVIF/WebP),
 * and edge caching.
 *
 *   <CdnImage src="/blobs/products/123.jpg" alt="..." width={800} />
 *   <CdnImage src="https://example.com/foo.jpg" alt="..." width={400} fit="cover" />
 *
 * External `src` URLs must be allow-listed in netlify.toml under
 * `[images] remote_images`. Local paths (anything starting with `/`) work
 * out of the box.
 *
 * Falls back to a plain <img> when the src is a data URL or already points
 * at /.netlify/images (so existing transformed URLs aren't double-wrapped).
 */

import { cdnImage, type ImageTransform } from "@/lib/blobImage";

type ImgProps = Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  "width" | "height"
>;

export type CdnImageProps = ImgProps &
  ImageTransform & {
    src: string;
    alt: string;
    /** Render width in px. Also used as the CDN transform width. */
    width?: number;
    /** Render height in px. Also used as the CDN transform height. */
    height?: number;
  };

function shouldBypass(src: string): boolean {
  return (
    src.startsWith("data:") ||
    src.startsWith("/.netlify/images") ||
    src.startsWith("blob:")
  );
}

export function CdnImage({
  src,
  width,
  height,
  fit,
  fm,
  q,
  loading = "lazy",
  decoding = "async",
  ...rest
}: CdnImageProps) {
  const transformed = shouldBypass(src)
    ? src
    : cdnImage(src, {
        w: width,
        h: height,
        fit,
        fm,
        q,
      });

  return (
    <img
      {...rest}
      src={transformed}
      width={width}
      height={height}
      loading={loading}
      decoding={decoding}
    />
  );
}
