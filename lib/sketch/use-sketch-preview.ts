import { useEffect, useRef, useState } from "react";

export type SketchPreviewStatus = "idle" | "loading" | "ready" | "error";

export type SketchPreviewState = {
  status: SketchPreviewStatus;
  blobUrl: string | null;
  error: string | null;
};

export function useSketchPreview(url: string, enabled: boolean, debounceMs = 400): SketchPreviewState {
  const [state, setState] = useState<SketchPreviewState>({
    status: "idle",
    blobUrl: null,
    error: null,
  });
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      setState({ status: "idle", blobUrl: null, error: null });
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setState((current) => ({
        status: "loading",
        blobUrl: current.blobUrl,
        error: null,
      }));

      try {
        const res = await fetch(url);
        if (!res.ok) {
          const message = (await res.text()).trim() || "Failed to render sketch";
          if (!cancelled) {
            setState({ status: "error", blobUrl: null, error: message });
          }
          return;
        }

        const blob = await res.blob();
        if (!blob.type.includes("svg") && !blob.type.includes("image")) {
          if (!cancelled) {
            setState({
              status: "error",
              blobUrl: null,
              error: "Render API returned an unexpected response.",
            });
          }
          return;
        }

        const nextBlobUrl = URL.createObjectURL(blob);
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
        }
        blobUrlRef.current = nextBlobUrl;

        if (!cancelled) {
          setState({ status: "ready", blobUrl: nextBlobUrl, error: null });
        } else {
          URL.revokeObjectURL(nextBlobUrl);
        }
      } catch {
        if (!cancelled) {
          setState({
            status: "error",
            blobUrl: null,
            error: "Could not reach the render API.",
          });
        }
      }
    }, debounceMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [url, enabled, debounceMs]);

  useEffect(
    () => () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    },
    [],
  );

  return state;
}
