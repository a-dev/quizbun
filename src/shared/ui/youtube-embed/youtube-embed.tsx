import { useState } from "react";

import { Play } from "lucide-react";

import { cx } from "#styles";
import styles from "./youtube-embed.module.css";

interface YouTubeEmbedProps {
  videoId: string;
  title: string;
  start?: number;
  className?: string;
}

function embedUrl(videoId: string, start: number | undefined): string {
  const startParam = start === undefined ? "" : `start=${start}&`;
  return `https://www.youtube-nocookie.com/embed/${videoId}?${startParam}autoplay=1`;
}

/** A privacy-preserving YouTube facade that creates its iframe only on click. */
export function YouTubeEmbed({ videoId, title, start, className }: YouTubeEmbedProps) {
  const [loadedVideoId, setLoadedVideoId] = useState<string>();
  const loaded = loadedVideoId === videoId;

  return (
    <div className={cx(styles.root, className)}>
      {loaded ? (
        <iframe
          src={embedUrl(videoId, start)}
          title={title}
          className={styles.iframe}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <div className={styles.facade}>
          <p className={styles.title}>{title}</p>
          <button
            type="button"
            className={styles.playButton}
            aria-label={`Play ${title}`}
            onClick={() => setLoadedVideoId(videoId)}
          >
            <Play aria-hidden="true" className={styles.playIcon} />
            <span className={styles.playLabel}>Play video</span>
          </button>
        </div>
      )}
    </div>
  );
}
