import { describe, it, expect } from 'vitest';
import { resolveImageUrl } from './resolveImageUrl';
import type { Listing } from '../types/listing';

const listing = (over: Partial<Listing> = {}): Listing => ({
  id: 81200001,
  title: 'Adana Merkez\'de Satılık Arsa',
  subTitle: 'Adana 2. İcra Dairesi',
  description: 'Açıklama',
  price: 4157000,
  category: 'Arsa',
  saleType: 'İcra',
  location: { lat: 36.962, lng: 35.3033 },
  thumbnailUrl: 'https://cdn.example.com/listings/81200001.jpg',
  detailUrl: '/ilan/1',
  ...over,
});

describe('resolveImageUrl', () => {
  it('returns the listing url untouched when no base is configured', () => {
    expect(resolveImageUrl(listing(), undefined))
      .toBe('https://cdn.example.com/listings/81200001.jpg');
  });

  it('keeps the filename and swaps in the configured host', () => {
    expect(resolveImageUrl(listing(), 'https://cdn.example.com/listings'))
      .toBe('https://cdn.example.com/listings/81200001.jpg');
  });

  it('does not double the separator when the base ends in a slash', () => {
    expect(resolveImageUrl(listing(), 'https://cdn.example.com/listings/'))
      .toBe('https://cdn.example.com/listings/81200001.jpg');
  });

  it('derives a filename from the id when the listing has no thumbnail', () => {
    expect(resolveImageUrl(listing({ thumbnailUrl: '' }), 'https://cdn.example.com/listings'))
      .toBe('https://cdn.example.com/listings/81200001.jpg');
  });

  it('treats a bare filename as a filename', () => {
    expect(resolveImageUrl(listing({ thumbnailUrl: 'photo.webp' }), 'https://x.test/a'))
      .toBe('https://x.test/a/photo.webp');
  });

  it('drops a query string rather than carrying it onto the new host', () => {
    const withQuery = listing({ thumbnailUrl: 'https://old.test/9.jpg?w=100' });
    expect(resolveImageUrl(withQuery, 'https://x.test/a')).toBe('https://x.test/a/9.jpg');
  });

  it('returns empty when there is neither a base nor a thumbnail', () => {
    expect(resolveImageUrl(listing({ thumbnailUrl: '' }), undefined)).toBe('');
  });

  it('ignores a blank base so whitespace config cannot break every image', () => {
    expect(resolveImageUrl(listing(), '   '))
      .toBe('https://cdn.example.com/listings/81200001.jpg');
  });
});
