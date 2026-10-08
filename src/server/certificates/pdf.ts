import "regenerator-runtime/runtime";
import {
  PDFDocument,
  PDFHexString,
  beginText,
  endText,
  setFontAndSize,
  setTextMatrix,
  showText,
  setFillingRgbColor,
  setTextRenderingMode,
  TextRenderingMode,
  pushGraphicsState,
  popGraphicsState,
  scale as scaleCoordinates,
  rgb,
  type PDFFont,
} from "pdf-lib";
import fontkit, { type Font } from "@pdf-lib/fontkit";
import regularFont from "@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-400-normal.woff?inline";
import boldFont from "@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-700-normal.woff?inline";
import extendedRegular from "@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-ext-400-normal.woff?inline";
import extendedBold from "@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-ext-700-normal.woff?inline";
import sinhalaRegular from "@fontsource/noto-sans-sinhala/files/noto-sans-sinhala-sinhala-400-normal.woff?inline";
import sinhalaBold from "@fontsource/noto-sans-sinhala/files/noto-sans-sinhala-sinhala-700-normal.woff?inline";
import tamilRegular from "@fontsource/noto-sans-tamil/files/noto-sans-tamil-tamil-400-normal.woff?inline";
import tamilBold from "@fontsource/noto-sans-tamil/files/noto-sans-tamil-tamil-700-normal.woff?inline";
import type { Certificate } from "@/domain/certificates";
import { RepositoryError } from "@/services";

function bytes(source: string) {
  return Uint8Array.from(atob(source.split(",")[1]!), (c) => c.charCodeAt(0));
}
const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
function lines(text: string, measure: (text: string) => number, width: number) {
  const output: string[] = [];
  let line = "";
  for (const word of text.replace(/[\r\n\t]/g, " ").split(/\s+/)) {
    // Split long tokens as well as wrapping ordinary words.
    for (const { segment: char } of segmenter.segment(word)) {
      if (measure(line + char) > width) {
        output.push(line.trim());
        line = "";
      }
      line += char;
    }
    if (measure(line + " ") > width) {
      output.push(line.trim());
      line = "";
    } else line += " ";
  }
  if (line.trim()) output.push(line.trim());
  return output;
}

/** Pure Worker-compatible PDF rendering; facts must come from certificate_document. */
export async function renderCertificatePdf(record: Certificate, logo?: Uint8Array) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const regularBytes = bytes(regularFont);
  const regular = await pdf.embedFont(regularBytes, { subset: true });
  const bold = await pdf.embedFont(bytes(boldFont), { subset: true });
  const sinhalaRegularBytes = bytes(sinhalaRegular);
  const sinhalaBoldBytes = bytes(sinhalaBold);
  const tamilRegularBytes = bytes(tamilRegular);
  const tamilBoldBytes = bytes(tamilBold);
  const fallback = {
    latinExt: [
      await pdf.embedFont(bytes(extendedRegular), { subset: true }),
      await pdf.embedFont(bytes(extendedBold), { subset: true }),
    ],
    sinhala: [
      await pdf.embedFont(sinhalaRegularBytes, { subset: true }),
      await pdf.embedFont(sinhalaBoldBytes, { subset: true }),
    ],
    tamil: [
      await pdf.embedFont(tamilRegularBytes, { subset: true }),
      await pdf.embedFont(tamilBoldBytes, { subset: true }),
    ],
  };
  const shapers = new Map<PDFFont, Font>([
    [fallback.sinhala[0]!, fontkit.create(sinhalaRegularBytes)],
    [fallback.sinhala[1]!, fontkit.create(sinhalaBoldBytes)],
    [fallback.tamil[0]!, fontkit.create(tamilRegularBytes)],
    [fallback.tamil[1]!, fontkit.create(tamilBoldBytes)],
  ]);
  const widthOfRun = (text: string, font: PDFFont, size: number) => {
    const shaper = shapers.get(font);
    return shaper
      ? (shaper.layout(text).positions.reduce((width, position) => width + position.xAdvance, 0) *
          size) /
          shaper.unitsPerEm
      : font.widthOfTextAtSize(text, size);
  };
  const characterSets = new Map<PDFFont, Set<number>>();
  for (const font of [regular, bold, ...fallback.latinExt, ...fallback.sinhala, ...fallback.tamil])
    characterSets.set(font, new Set(font.getCharacterSet()));
  const runs = (text: string, base: PDFFont) => {
    const result: { text: string; font: PDFFont }[] = [];
    for (const { segment } of segmenter.segment(text)) {
      const weight = base === bold ? 1 : 0;
      let font = /\p{Script=Sinhala}/u.test(segment)
        ? fallback.sinhala[weight]!
        : /\p{Script=Tamil}/u.test(segment)
          ? fallback.tamil[weight]!
          : base;
      if (
        font === base &&
        [...segment].some((char) => !characterSets.get(font)!.has(char.codePointAt(0)!))
      )
        font = fallback.latinExt[weight]!;
      if (
        [...segment].some(
          (char) =>
            !/[\u200c\u200d]/u.test(char) && !characterSets.get(font)!.has(char.codePointAt(0)!),
        )
      )
        throw new RepositoryError(
          "validation",
          "The certificate font does not support some characters. Contact an administrator for an accessible copy.",
        );
      const previous = result.at(-1);
      if (previous?.font === font) previous.text += segment;
      else result.push({ text: segment, font });
    }
    return result;
  };
  const page = pdf.addPage([842, 595]);
  const color =
    record.template.theme === "teal"
      ? rgb(0.04, 0.4, 0.35)
      : record.template.theme === "blue"
        ? rgb(0.12, 0.4, 0.7)
        : rgb(0.08, 0.15, 0.28);
  for (const inset of [20, 27])
    page.drawRectangle({
      x: inset,
      y: inset,
      width: 842 - inset * 2,
      height: 595 - inset * 2,
      borderColor: color,
      borderWidth: inset === 20 ? 3 : 1,
    });
  let y = 520;
  if (logo) {
    const image =
      record.template.logo?.mimeType === "image/jpeg"
        ? await pdf.embedJpg(logo)
        : await pdf.embedPng(logo);
    const scale = Math.min(50 / image.width, 42 / image.height);
    page.drawImage(image, {
      x: (842 - image.width * scale) / 2,
      y: 523,
      width: image.width * scale,
      height: image.height * scale,
    });
    y = 502;
  }
  const centered = (text: string, size: number, font = regular, gap = 12) => {
    const measure = (value: string) =>
      runs(value, font).reduce((width, run) => width + widthOfRun(run.text, run.font, size), 0);
    for (const line of lines(text, measure, 700)) {
      let x = (842 - measure(line)) / 2;
      for (const run of runs(line, font)) {
        const shaper = shapers.get(run.font);
        if (!shaper) page.drawText(run.text, { x, y, size, font: run.font, color });
        else {
          // Preserve Indic glyph substitutions and mark offsets; drawText alone
          // uses nominal glyph widths and loses these positioning adjustments.
          const layout = shaper.layout(run.text);
          const positions = layout.positions;
          const encoded = run.font.encodeText(run.text).asString();
          const fontKey = page.node.newFontDictionary(run.font.name, run.font.ref);
          const scale = size / shaper.unitsPerEm;
          let advanceX = 0;
          let advanceY = 0;
          page.pushOperators(
            pushGraphicsState(),
            beginText(),
            setFontAndSize(fontKey, size),
            setFillingRgbColor(color.red, color.green, color.blue),
            setTextRenderingMode(TextRenderingMode.Invisible),
          );
          const placed: { x: number; y: number; index: number }[] = [];
          positions.forEach((position, index) => {
            const glyphX = x + (advanceX + position.xOffset) * scale;
            const glyphY = y + (advanceY + position.yOffset) * scale;
            page.pushOperators(
              setTextMatrix(1, 0, 0, 1, glyphX, glyphY),
              showText(PDFHexString.of(encoded.slice(index * 4, index * 4 + 4))),
            );
            placed.push({ x: glyphX, y: glyphY, index });
            advanceX += position.xAdvance;
            advanceY += position.yAdvance;
          });
          page.pushOperators(endText(), popGraphicsState());
          // Fontkit's Sinhala subset can omit composite outlines. Render the
          // shaped vector outlines, retaining the embedded text for selection.
          for (const glyph of placed) {
            page.pushOperators(pushGraphicsState(), scaleCoordinates(1, -1));
            page.drawSvgPath(layout.glyphs[glyph.index]!.path.toSVG(), {
              x: glyph.x,
              y: -glyph.y,
              scale,
              color,
            });
            page.pushOperators(popGraphicsState());
          }
        }
        x += widthOfRun(run.text, run.font, size);
      }
      y -= size + 3;
    }
    y -= gap;
  };
  centered(record.template.issuer, 12, bold, 9);
  centered(record.template.title, 28, bold, 7);
  centered(record.template.subtitle, 11, regular, 18);
  centered(record.template.body, 12, regular, 14);
  centered(record.evidence.learnerName, 24, bold, 12);
  centered("for completing the learning module", 11, regular, 5);
  centered(record.evidence.moduleTitle, 18, bold, 16);
  centered(record.template.signatoryName, 12, bold, 0);
  centered(record.template.signatoryTitle, 10, regular, 4);
  if (y < 70)
    throw new RepositoryError(
      "validation",
      "The certificate text is too long for this layout. Contact an administrator.",
    );
  page.drawText(`NCAP-${record.reference} | ${record.issued_at.slice(0, 10)}`, {
    x: 190,
    y: 53,
    size: 9,
    font: regular,
    color,
  });
  if (record.status === "Revoked")
    page.drawText("REVOKED", {
      x: 320,
      y: 285,
      size: 40,
      font: bold,
      color: rgb(0.8, 0.1, 0.1),
      opacity: 0.75,
    });
  pdf.setTitle(`${record.template.title} - NCAP-${record.reference}`);
  pdf.setAuthor(record.template.issuer);
  pdf.setCreationDate(new Date(record.issued_at));
  return pdf.save();
}
