import { BookText, ExternalLink } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { Alert } from '../../shared/components/Alert';
import { Button } from '../../shared/components/Button';
import { Popover } from '../../shared/components/Popover';
import { Spinner } from '../../shared/components/Spinner';
import { selectLocale } from '../locale/localeSlice';
import { useT } from '../locale/useT';
import { useGetWikiSummaryQuery, type WikiError } from './wikiApi';
import { lookupClosed, lookupStarted, selectWikiLookup, selectWikiSelection } from './wikiSlice';

function isWikiError(error: unknown): error is WikiError {
  return typeof error === 'object' && error !== null && 'kind' in error;
}

/**
 * FR-LEARN-7: a "What is this?" button next to a selected word in the lesson and a popover with the
 * Wikipedia summary. Lookup failures never break the lesson page (FR-EXT-3).
 */
export function WikiLookup() {
  const { t } = useT();
  const dispatch = useDispatch();
  const locale = useSelector(selectLocale);
  const selection = useSelector(selectWikiSelection);
  const lookup = useSelector(selectWikiLookup);
  const { data, error, isFetching } = useGetWikiSummaryQuery(lookup ? { term: lookup.term, locale } : { term: '', locale }, { skip: !lookup });
  const point = lookup?.at ?? selection?.at;
  const anchorStyle = point ? { position: 'fixed' as const, left: point.x, top: point.y } : undefined;

  return (
    <>
      {selection && !lookup && (
        <Button
          size="sm"
          variant="primary"
          className="fixed z-40 -translate-x-1/2 shadow-lg"
          style={{ left: selection.at.x, top: selection.at.y + 4 }}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => dispatch(lookupStarted())}
        >
          <BookText aria-hidden size={14} />
          {t('app.wiki.lookup')}
        </Button>
      )}
      {lookup && (
        <Popover open onOpenChange={(open) => !open && dispatch(lookupClosed())} anchor={<span aria-hidden style={anchorStyle} />}>
          <div className="flex flex-col gap-3" role="region" aria-label={t('app.wiki.title')}>
            {isFetching && (
              <p className="flex items-center gap-2 text-sm text-text-muted" role="status">
                <Spinner size={14} />
                {t('app.wiki.loading')}
              </p>
            )}
            {!isFetching && isWikiError(error) && (
              <Alert kind={error.kind === 'not_found' ? 'info' : 'error'}>
                {error.kind === 'not_found' ? t('app.wiki.notFound', { term: lookup.term }) : t('app.wiki.unavailable')}
              </Alert>
            )}
            {!isFetching && data && (
              <article className="flex flex-col gap-2" lang={data.lang}>
                <div className="flex gap-3">
                  {data.thumbnailUrl && <img src={data.thumbnailUrl} alt="" className="size-16 shrink-0 rounded-md object-cover" width="64" height="64" />}
                  <h2 className="font-semibold">{data.title}</h2>
                </div>
                {data.ambiguous ? <p className="text-sm">{t('app.wiki.ambiguous', { term: lookup.term })}</p> : <p className="text-sm">{data.extract}</p>}
                <a className="link inline-flex items-center gap-1 text-sm" href={data.pageUrl} target="_blank" rel="noopener noreferrer">
                  {t('app.wiki.readMore')}
                  <ExternalLink aria-hidden size={12} />
                </a>
                <p className="text-xs text-text-muted" lang={locale}>
                  {t('app.wiki.source', { lang: data.lang.toUpperCase() })}
                </p>
              </article>
            )}
          </div>
        </Popover>
      )}
    </>
  );
}
