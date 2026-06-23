import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { AppError } from '../middleware/errorHandler';

const MIN_TEXT_LENGTH = 50;

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const uint8Array = new Uint8Array(buffer);
  const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;

  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    fullText += pageText + '\n';
  }

  const text = fullText.trim();

  if (text.length < MIN_TEXT_LENGTH) {
    throw new AppError(
      422,
      'The PDF appears to be empty or image-based (no extractable text). Please upload a text-based PDF.',
    );
  }

  return text;
}