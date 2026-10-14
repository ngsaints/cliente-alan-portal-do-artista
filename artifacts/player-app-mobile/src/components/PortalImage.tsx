import { useState, type ImgHTMLAttributes } from "react";
import { portalImageCrossOrigin } from "../services/portalMedia";
const placeholder = `${import.meta.env.BASE_URL}media-placeholder.svg`;
/** Failed media must not become another artist's photo or an unrelated stock image. */
export function PortalImage({
  src,
  alt,
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  const [failedSource, setFailedSource] = useState<string | undefined>();
  const source = !src || failedSource === src ? placeholder : src;
  return (
    <img
      {...props}
      src={source}
      alt={alt || ""}
      crossOrigin={portalImageCrossOrigin(source)}
      onError={() => {
        if (src && source !== placeholder) setFailedSource(src);
      }}
    />
  );
}
