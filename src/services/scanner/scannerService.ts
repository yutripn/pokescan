import { MOCK_OCR_SAMPLES } from '@/constants/mockData';
import { OcrStructuredResult } from '@/types/recognition';
import { buildOcrStructuredResult } from '@/services/scanner/ocrPipeline';

export type ScannerProvider = {
  start: (onFrame: (result: OcrStructuredResult) => void) => Promise<void>;
  stop: () => Promise<void>;
};

class MockScannerProvider implements ScannerProvider {
  private interval: ReturnType<typeof setInterval> | null = null;

  async start(onFrame: (result: OcrStructuredResult) => void) {
    let index = 0;
    this.interval = setInterval(() => {
      const sample = MOCK_OCR_SAMPLES[index % MOCK_OCR_SAMPLES.length];
      onFrame(buildOcrStructuredResult(sample.rawText));
      index += 1;
    }, 1400);
  }

  async stop() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }
}

export const scannerService = {
  createProvider: (mode: 'live' | 'still' | 'mock' = 'mock'): ScannerProvider => {
    if (mode === 'live' || mode === 'still') {
      return new MockScannerProvider();
    }
    return new MockScannerProvider();
  }
};
