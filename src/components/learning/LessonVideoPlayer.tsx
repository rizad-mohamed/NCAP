import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Gauge, RotateCcw } from "lucide-react";
import type { LessonVideo } from "@/data/types";
import { lessonVideoPlayback } from "@/lib/lesson-video";
import { useNcap } from "@/state/ncap-store";
import { useMediaUrl } from "@/components/common/MediaField";

const speeds = [0.75, 1, 1.25, 1.5, 1.75, 2];

export function LessonVideoPlayer({
  lessonId,
  learnerKey,
  title,
  video,
  onComplete,
  preview = false,
}: {
  lessonId: string;
  learnerKey: string;
  title: string;
  video: LessonVideo;
  onComplete?: () => void;
  preview?: boolean;
}) {
  const element = useRef<HTMLVideoElement>(null);
  const lastStoredSecond = useRef(-1);
  const [speed, setSpeed] = useState(1);
  const [resumedAt, setResumedAt] = useState(0);
  const [failed, setFailed] = useState(false);
  const external = useMemo(
    () => (video.kind === "external" ? lessonVideoPlayback(video.url) : null),
    [video],
  );
  const directUrl = external?.kind === "direct" ? external.url : undefined;
  const sourceUrl = useMediaUrl(video.kind === "upload" ? video.asset : undefined, directUrl);
  const sourceKey = video.kind === "upload" ? video.asset.storageKey : external?.url;
  const { resume, saveResume, session } = useNcap();
  const authenticated = session.role !== "guest" && !preview;
  const saver = useRef(saveResume);
  saver.current = saveResume;
  const loadedSource = useRef("");
  useEffect(() => {
    loadedSource.current = "";
    lastStoredSecond.current = -1;
    const player = element.current;
    const saveOnExit = saver.current;
    return () => {
      if (authenticated && player && !player.ended && Number.isFinite(player.currentTime)) {
        void saveOnExit(lessonId, sourceKey ?? "", player.currentTime).catch(() => undefined);
      }
    };
  }, [lessonId, learnerKey, sourceKey, sourceUrl, authenticated]);
  const loadProgress = () => {
    const player = element.current;
    if (!player) return;
    player.playbackRate = speed;
    const key = lessonId + sourceKey;
    if (loadedSource.current === key) return;
    loadedSource.current = key;
    const saved = resume[lessonId];
    if (
      saved &&
      saved.source === sourceKey &&
      saved.seconds > 0 &&
      saved.seconds < player.duration - 0.5
    ) {
      player.currentTime = saved.seconds;
      setResumedAt(saved.seconds);
    }
  };
  const rememberProgress = (force = false) => {
    const player = element.current;
    if (!authenticated || !player || player.ended || !Number.isFinite(player.currentTime)) return;
    const second = Math.floor(player.currentTime);
    if (!force && Math.abs(second - lastStoredSecond.current) < 5) return;
    lastStoredSecond.current = second;
    void saver.current(lessonId, sourceKey ?? "", player.currentTime).catch(() => undefined);
  };
  const complete = () => {
    if (authenticated) void saver.current(lessonId, sourceKey ?? "", 0).catch(() => undefined);
    onComplete?.();
  };

  const embedded = external && external.kind !== "direct";
  return (
    <section className="bg-slate-950 text-white" aria-label="Lesson video">
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        {embedded ? (
          <iframe
            src={external.url}
            title={`${title} video`}
            className="absolute inset-0 size-full border-0"
            loading="lazy"
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-presentation"
            allowFullScreen
          />
        ) : sourceUrl ? (
          <video
            ref={element}
            src={sourceUrl}
            controls
            controlsList="nodownload"
            disablePictureInPicture={false}
            playsInline
            preload="metadata"
            className="size-full bg-black object-contain"
            aria-label={`${title} video`}
            onLoadedMetadata={loadProgress}
            onTimeUpdate={() => rememberProgress()}
            onPause={() => rememberProgress(true)}
            onError={() => setFailed(true)}
            onEnded={complete}
          />
        ) : (
          <div className="grid size-full place-items-center p-6 text-center text-sm text-white/75">
            {video.kind === "upload"
              ? "This video is currently unavailable."
              : "This video link is not supported."}{" "}
            You can still read the lesson and transcript below.
          </div>
        )}
      </div>
      {failed && (
        <p role="alert" className="px-4 py-3 text-sm">
          The video could not be loaded. Check your connection or ask the administrator to replace
          the file or link. The lesson and transcript remain available below.
        </p>
      )}

      {!embedded && sourceUrl && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-white/70">
            {resumedAt > 0 ? (
              <>
                <RotateCcw className="size-4" aria-hidden="true" /> Resumed at{" "}
                {Math.floor(resumedAt / 60)}:{String(Math.floor(resumedAt % 60)).padStart(2, "0")}
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4" aria-hidden="true" /> Progress is saved every five
                seconds
              </>
            )}
          </div>
          <label className="flex min-h-10 items-center gap-2 text-sm font-semibold">
            <Gauge className="size-4" aria-hidden="true" /> Speed
            <select
              aria-label="Playback speed"
              value={speed}
              onChange={(event) => {
                const next = Number(event.target.value);
                setSpeed(next);
                if (element.current) element.current.playbackRate = next;
              }}
              className="min-h-10 rounded-lg border-white/20 bg-slate-900 px-2 text-white"
            >
              {speeds.map((value) => (
                <option key={value} value={value}>
                  {value}×
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {video.transcript && (
        <details className="border-t border-white/10 bg-white text-foreground">
          <summary className="min-h-11 cursor-pointer px-5 py-3 text-sm font-semibold text-primary">
            Read video transcript
          </summary>
          <div className="max-h-72 overflow-y-auto whitespace-pre-wrap border-t bg-muted/40 px-5 py-4 text-sm leading-7">
            {video.transcript}
          </div>
        </details>
      )}
    </section>
  );
}
