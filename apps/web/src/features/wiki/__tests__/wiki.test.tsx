import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '../../../shared/test/server';
import { renderWithStore } from '../../../shared/test/renderWithStore';
import { normalizeSelection, lruInsert, toWikiSummary, wikiLanguageOrder, cacheKey, type WikiCacheEntry } from '../utils';
import { wikiApi } from '../wikiApi';

const SUMMARY = {
  type: 'standard',
  title: 'Змінна',
  extract: 'Змінна — іменована область памʼяті.',
  thumbnail: { source: 'https://upload.wikimedia.org/x.png' },
  content_urls: { desktop: { page: 'https://uk.wikipedia.org/wiki/Змінна' } },
};

describe('wiki utils', () => {
  it('normalizes a selection to 2–80 characters and at most 5 words', () => {
    expect(normalizeSelection('  «змінна», ')).toBe('змінна');
    expect(normalizeSelection('a')).toBeNull();
    expect(normalizeSelection('one two three four five')).toBe('one two three four five');
    expect(normalizeSelection('one two three four five six')).toBeNull();
    expect(normalizeSelection('x'.repeat(81))).toBeNull();
    expect(normalizeSelection('multiple   spaces')).toBe('multiple spaces');
  });

  it('orders languages by the interface locale', () => {
    expect(wikiLanguageOrder('uk')).toEqual(['uk', 'en']);
    expect(wikiLanguageOrder('en')).toEqual(['en', 'uk']);
  });

  it('normalizes a summary, cuts long extracts and flags disambiguation', () => {
    expect(toWikiSummary(SUMMARY, 'uk', 'змінна')).toEqual({
      lang: 'uk',
      title: 'Змінна',
      extract: SUMMARY.extract,
      thumbnailUrl: 'https://upload.wikimedia.org/x.png',
      pageUrl: 'https://uk.wikipedia.org/wiki/Змінна',
      ambiguous: false,
    });
    const minimal = toWikiSummary({ type: 'disambiguation', extract: 'x'.repeat(700) }, 'en', 'Java');
    expect(minimal).toMatchObject({ title: 'Java', thumbnailUrl: null, pageUrl: 'https://en.wikipedia.org/wiki/Java', ambiguous: true });
    expect(minimal.extract).toHaveLength(600);
    expect(toWikiSummary({}, 'en', 'x').extract).toBe('');
  });

  it('keeps at most 20 cache entries, newest first, without duplicates', () => {
    const entry = (index: number): WikiCacheEntry => ({ key: cacheKey('en', `t${index}`), savedAt: '', summary: toWikiSummary({}, 'en', `t${index}`) });
    let entries: WikiCacheEntry[] = [];
    for (let index = 0; index < 25; index += 1) entries = lruInsert(entries, entry(index));
    expect(entries).toHaveLength(20);
    expect(entries[0]?.key).toBe('en:t24');
    entries = lruInsert(entries, entry(10));
    expect(entries[0]?.key).toBe('en:t10');
    expect(entries.filter((item) => item.key === 'en:t10')).toHaveLength(1);
    expect(cacheKey('uk', 'Змінна')).toBe('uk:змінна');
  });
});

function lookup(term: string, locale: 'uk' | 'en') {
  const { store } = renderWithStore(<></>);
  return store.dispatch(wikiApi.endpoints.getWikiSummary.initiate({ term, locale }));
}

const UK = 'https://uk.wikipedia.org/api/rest_v1/page/summary/:title';
const EN = 'https://en.wikipedia.org/api/rest_v1/page/summary/:title';

describe('wikiApi', () => {
  it('answers from the interface language and caches the result', async () => {
    let calls = 0;
    server.use(
      http.get(UK, () => {
        calls += 1;
        return HttpResponse.json(SUMMARY);
      }),
    );
    expect((await lookup('змінна', 'uk')).data?.lang).toBe('uk');
    expect((await lookup('змінна', 'uk')).data?.title).toBe('Змінна');
    expect(calls).toBe(1);
    expect(window.localStorage.getItem('learnly:v1:wiki-cache')).toContain('uk:змінна');
  });

  it('falls back to the other language on 404, in the right order', async () => {
    const order: string[] = [];
    server.use(
      http.get(UK, () => {
        order.push('uk');
        return new HttpResponse(null, { status: 404 });
      }),
      http.get(EN, () => {
        order.push('en');
        return HttpResponse.json({ ...SUMMARY, title: 'Variable' });
      }),
    );
    expect((await lookup('variable', 'uk')).data).toMatchObject({ lang: 'en', title: 'Variable' });
    expect(order).toEqual(['uk', 'en']);
    order.length = 0;
    expect((await lookup('loop', 'en')).data?.lang).toBe('en');
    expect(order).toEqual(['en']);
  });

  it('reports not_found when neither language has the article, unavailable on network errors', async () => {
    server.use(http.get(UK, () => new HttpResponse(null, { status: 404 })), http.get(EN, () => new HttpResponse(null, { status: 404 })));
    expect((await lookup('qwertyuiop', 'en')).error).toEqual({ kind: 'not_found' });
    server.use(http.get(EN, () => HttpResponse.error()));
    expect((await lookup('offline', 'en')).error).toEqual({ kind: 'unavailable' });
  });

  it('works without storage', async () => {
    const denied = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    server.use(http.get(EN, () => HttpResponse.json(SUMMARY)));
    try {
      expect((await lookup('private', 'en')).data?.title).toBe('Змінна');
      expect(denied).toHaveBeenCalled();
    } finally {
      denied.mockRestore();
    }
  });
});
