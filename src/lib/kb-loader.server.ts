import fs from "node:fs";
import path from "node:path";

export type KbDocument = { source: string; title: string; content: string };

const DATA_DIR = path.resolve(process.cwd(), "data");

function titleFromFilename(filename: string): string {
  return filename
    .replace(/\.(md|txt|pdf)$/i, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function loadKnowledgeBaseDocumentsAsync(): Promise<KbDocument[]> {
  if (!fs.existsSync(DATA_DIR)) {
    throw new Error(`Knowledge base directory not found: ${DATA_DIR}`);
  }

  const files = fs
    .readdirSync(DATA_DIR)
    .filter((f) => /\.(md|txt|pdf)$/i.test(f))
    .sort();

  const docs: KbDocument[] = [];
  for (const filename of files) {
    const filePath = path.join(DATA_DIR, filename);
    let content: string;
    if (filename.toLowerCase().endsWith(".pdf")) {
      const { PDFParse } = await import("pdf-parse");
      const buffer = fs.readFileSync(filePath);
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      content = result.text;
    } else {
      content = fs.readFileSync(filePath, "utf-8");
    }
    docs.push({
      source: filename,
      title: titleFromFilename(filename),
      content: content.trim(),
    });
  }
  return docs;
}

/** Recursive character splitter (LangChain-style separators). */
export function chunkText(text: string, chunkSize = 500, overlap = 50): string[] {
  const separators = ["\n\n", "\n", " ", ""];

  function splitRecursive(input: string, sepIndex: number): string[] {
    if (input.length <= chunkSize) {
      return input.trim() ? [input.trim()] : [];
    }

    let separator = separators[sepIndex] ?? "";
    let nextSepIndex = sepIndex + 1;

    if (separator !== "") {
      let found = false;
      for (let i = sepIndex; i < separators.length; i++) {
        const s = separators[i];
        if (s === "" || input.includes(s)) {
          separator = s;
          nextSepIndex = i + 1;
          found = true;
          break;
        }
      }
      if (!found) separator = "";
      nextSepIndex = separators.length;
    }

    const splits =
      separator === ""
        ? [...input]
        : input.split(separator).filter((s, i, arr) => i < arr.length - 1 || s);

    const merged: string[] = [];
    let current = "";

    for (let i = 0; i < splits.length; i++) {
      const piece =
        separator === "" ? splits[i] : splits[i] + (i < splits.length - 1 ? separator : "");
      if (!piece) continue;
      if ((current + piece).length <= chunkSize) {
        current += piece;
      } else {
        if (current.trim()) merged.push(current.trim());
        current = piece;
      }
    }
    if (current.trim()) merged.push(current.trim());

    const final: string[] = [];
    for (const part of merged) {
      if (part.length <= chunkSize) {
        final.push(part);
      } else if (nextSepIndex < separators.length) {
        final.push(...splitRecursive(part, nextSepIndex));
      } else {
        let j = 0;
        while (j < part.length) {
          final.push(part.slice(j, j + chunkSize).trim());
          j += chunkSize - overlap;
        }
      }
    }

    return final.filter((c) => c.length > 0);
  }

  const raw = splitRecursive(text, 0);
  if (overlap <= 0 || raw.length <= 1) return raw;

  const withOverlap: string[] = [raw[0]];
  for (let i = 1; i < raw.length; i++) {
    const tail = withOverlap[i - 1].slice(-overlap);
    withOverlap.push((tail + raw[i]).slice(0, chunkSize + overlap));
  }
  return withOverlap;
}

export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
