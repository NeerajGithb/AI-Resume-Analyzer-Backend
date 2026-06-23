import puppeteer from 'puppeteer';
import { logger } from './logger';

export async function htmlToPdf(html: string): Promise<Buffer> {
  let browser;
  
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    
    // Set content
    await page.setContent(html, {
      waitUntil: 'domcontentloaded',
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0.6in',
        right: '0.6in',
        bottom: '0.6in',
        left: '0.6in',
      },
    });

    logger.info('PDF generated successfully');
    
    return pdfBuffer as Buffer;
  } catch (error: any) {
    logger.error('PDF generation failed', { error: error.message });
    throw new Error('Failed to generate PDF');
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
