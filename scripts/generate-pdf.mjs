import { PDFDocument, StandardFonts } from "pdf-lib";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "..", "data", "password_reset_guide.pdf");

const content = `Password Reset Guide

If you can't sign in, you can reset your password in under two minutes.

Steps:
1. Go to the sign-in page and click Forgot password.
2. Enter the email associated with your account.
3. Check your inbox for a message from no-reply@support.example within 1-2 minutes. Check Spam if needed.
4. Click the secure reset link. The link expires after 30 minutes.
5. Enter a new password of at least 12 characters with one number and one symbol.
6. You will be signed in automatically after a successful reset.

Troubleshooting:
- Link expired: request a new reset email; only the most recent link is valid.
- Email never arrives: verify the address on file, check spam, whitelist support.example.
- Password too weak: use a longer passphrase with mixed case and a symbol.
- Two-factor enabled: after resetting you will still be prompted for 2FA on next sign-in.

If repeated attempts fail, contact support with the timestamp of your last reset attempt.`;

const doc = await PDFDocument.create();
const font = await doc.embedFont(StandardFonts.Helvetica);
const fontSize = 11;
const margin = 50;
const lineHeight = fontSize * 1.4;
const pageWidth = 612;
const maxWidth = pageWidth - margin * 2;

let page = doc.addPage([612, 792]);
let y = 792 - margin;

for (const paragraph of content.split("\n\n")) {
  const lines = wrapText(paragraph, font, fontSize, maxWidth);
  for (const line of lines) {
    if (y < margin + lineHeight) {
      page = doc.addPage([612, 792]);
      y = 792 - margin;
    }
    page.drawText(line, { x: margin, y, size: fontSize, font });
    y -= lineHeight;
  }
  y -= lineHeight * 0.5;
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, await doc.save());
console.log(`Wrote ${outPath}`);

function wrapText(text, font, size, maxWidth) {
  const words = text.replace(/\n/g, " ").split(/\s+/);
  const lines = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}
