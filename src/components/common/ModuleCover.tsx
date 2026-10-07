import { BookOpen } from "lucide-react";
import type { LearningModule } from "@/data/types";
import { useMediaUrl } from "./MediaField";
import { CatalogueCover } from "./catalogue";

const covers: Record<string, string> = {
  "m-fundamentals": "/images/home/course-family-safety.webp",
  "m-phishing": "/images/home/course-phishing.webp",
  "m-passwords": "/images/home/course-passwords.webp",
  "m-devices": "/images/home/course-mfa.webp",
  "m-privacy": "/images/home/course-online-banking.webp",
};

export function ModuleCover({ module }: { module: LearningModule }) {
  const src = useMediaUrl(module.image, covers[module.id]);
  return src ? (
    <img
      src={src}
      alt={module.image?.altText ?? ""}
      loading="lazy"
      decoding="async"
      width={640}
      height={360}
      className="catalogue-cover"
    />
  ) : (
    <CatalogueCover>
      <span className="grid size-14 place-items-center rounded-2xl bg-white shadow-sm">
        <BookOpen className="size-7" aria-hidden="true" />
      </span>
      <span className="meta">{module.topic}</span>
    </CatalogueCover>
  );
}
