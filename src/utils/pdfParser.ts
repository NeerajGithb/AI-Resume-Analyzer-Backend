import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { AppError } from '../middleware/errorHandler';

// No worker needed in Node/serverless — legacy build handles it
pdfjsLib.GlobalWorkerOptions.workerSrc = '';

const MIN_TEXT_LENGTH = 50;

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const uint8Array = new Uint8Array(buffer);

    const pdf = await pdfjsLib.getDocument({
      data: uint8Array,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    }).promise;

    const pages = await Promise.all(
      Array.from({ length: pdf.numPages }, (_, i) =>
        pdf.getPage(i + 1).then((p: any) => p.getTextContent())
      )
    );

    const text = pages
      .flatMap((p: any) => p.items)
      .map((item: any) => item.str)
      .join(' ')
      .trim();

    if (text.length < MIN_TEXT_LENGTH) {
      throw new AppError(
        422,
        'PDF appears empty or image-based (no extractable text). Upload a text-based PDF.',
      );
    }

    return text;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(422, 'Failed to parse PDF. Ensure the file is a valid PDF document.');
  }
}