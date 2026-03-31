import { MatchCandidate } from '@/types/models';
import { OcrStructuredResult } from '@/types/recognition';

export type ReviewQueueItem = {
  id: string;
  ocr: OcrStructuredResult;
  candidates: MatchCandidate[];
  createdAt: string;
  status: 'pending' | 'skipped' | 'resolved';
};

export class ReviewQueue {
  private items: ReviewQueueItem[] = [];

  add(ocr: OcrStructuredResult, candidates: MatchCandidate[]) {
    const item: ReviewQueueItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ocr,
      candidates,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };
    this.items.unshift(item);
    this.items = this.items.slice(0, 100);
    return item;
  }

  list() {
    return this.items;
  }

  markResolved(id: string) {
    this.items = this.items.map((item) => (item.id === id ? { ...item, status: 'resolved' } : item));
  }

  skip(id: string) {
    this.items = this.items.map((item) => (item.id === id ? { ...item, status: 'skipped' } : item));
  }
}

export const reviewQueue = new ReviewQueue();
