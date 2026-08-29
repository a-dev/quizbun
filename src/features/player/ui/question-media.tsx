import type { Image, MediaPlacement, Video } from "@/shared/lib/quiz";
import { renderMarkdownField, renderMarkdownFieldText } from "@/shared/lib/render";
import { resolveImageSrc } from "@/shared/lib/routing";
import { MediaFigure } from "@/shared/ui/media-figure";
import { YouTubeEmbed } from "@/shared/ui/youtube-embed";

import { cx } from "#styles";
import styles from "./question-media.module.css";

interface QuestionMediaProps {
  quizId: string;
  questionTitle: string;
  images: Image[] | undefined;
  videos: Video[] | undefined;
  surface: MediaPlacement;
  /** Marks this surface's first Image as the page's likely LCP candidate. */
  priority?: boolean;
}

const SURFACE_CLASS = {
  question: styles.surfaceQuestion,
  explanation: styles.surfaceExplanation,
} satisfies Record<MediaPlacement, string>;

function belongsOnSurface(placement: MediaPlacement | undefined, surface: MediaPlacement): boolean {
  return (placement ?? "question") === surface;
}

/** Media for one Question surface, in authored order with Images before Videos. */
export function QuestionMedia({
  quizId,
  questionTitle,
  images,
  videos,
  surface,
  priority = false,
}: QuestionMediaProps) {
  const surfaceImages = images?.filter((image) => belongsOnSurface(image.placement, surface)) ?? [];
  const surfaceVideos = videos?.filter((video) => belongsOnSurface(video.placement, surface)) ?? [];

  if (surfaceImages.length === 0 && surfaceVideos.length === 0) return null;

  const plainQuestionTitle = renderMarkdownFieldText("questionTitle", questionTitle);

  return (
    <div
      role="group"
      aria-label={surface === "question" ? "Question media" : "Explanation media"}
      className={cx(styles.root, SURFACE_CLASS[surface])}
    >
      {surfaceImages.map((image, index) => (
        <MediaFigure
          key={`${image.src}-${index}`}
          src={resolveImageSrc(quizId, image.src)}
          alt={image.alt}
          width={image.width}
          height={image.height}
          priority={priority && index === 0}
          captionHtml={
            image.caption === undefined
              ? undefined
              : renderMarkdownField("imageCaption", image.caption)
          }
          className={styles.figure}
        />
      ))}
      {surfaceVideos.map((video, index) => {
        const prefix = surfaceVideos.length === 1 ? "Video" : `Video ${index + 1}`;

        return (
          <YouTubeEmbed
            key={`${video.id}-${index}`}
            videoId={video.id}
            start={video.start}
            title={`${prefix} for ${plainQuestionTitle}`}
            className={styles.video}
          />
        );
      })}
    </div>
  );
}
