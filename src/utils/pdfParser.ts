import { PDFParse } from 'pdf-parse';
import { AppError } from '../middleware/errorHandler';

const MIN_TEXT_LENGTH = 50;

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  // Initialize parser with buffer data
  const parser = new PDFParse({ data: buffer });

  try {
    // Extract text using v2 API
    const result = await parser.getText();
    const text = result.text.trim();

    if (text.length < MIN_TEXT_LENGTH) {
      throw new AppError(
        422,
        'PDF appears empty or image-based (no extractable text). Upload a text-based PDF.'
      );
    }

    return text;
  } catch (error) {
    throw new AppError(
      422,
      'Failed to parse PDF. Ensure the file is a valid PDF document.'
    );
  } finally {
    // Always call destroy() to free memory
    await parser.destroy();
  }
}