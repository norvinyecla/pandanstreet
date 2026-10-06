import { useEffect, useId, useRef } from 'react';
import { resolveAssetUrl } from '../api/client.ts';
import type { BulletinItem } from '../api/types.ts';
import { FeedAuthorLink } from './FeedAuthorLink.tsx';
import { TileAge } from '../tiles/TileAge.tsx';
import { BadgeLozenge } from './TileGrid.tsx';

/** Full-screen view of a Bulletin Board item tile, shown over the grid. */
export function ItemTileOverlay({
  item,
  onClose,
}: {
  item: BulletinItem;
  onClose: () => void;
}) {
  const captionId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Remember the tile that opened the overlay so focus can go back to it.
    const trigger =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    closeButtonRef.current?.focus();
    return () => trigger?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-center">
      {/* Mouse/touch-only backdrop; the labelled Close button covers keyboard and screen reader users. */}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        data-testid="item-overlay-backdrop"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/90"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={captionId}
        className="pointer-events-none relative flex h-full w-full max-w-md flex-col"
      >
        <div className="flex justify-end p-2">
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="pointer-events-auto flex min-h-11 min-w-11 items-center justify-center rounded-full text-2xl leading-none text-white"
          >
            ×
          </button>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center px-2">
          <img
            src={resolveAssetUrl(item.photoUrl)}
            alt={item.caption}
            className="pointer-events-auto max-h-full max-w-full object-contain"
          />
        </div>
        <div className="pointer-events-auto flex flex-col gap-2 rounded-t-box bg-base-100 px-4 pt-4 pb-6">
          <div className="self-start">
            <BadgeLozenge color={item.badgeColor} />
          </div>
          <h2 id={captionId} className="text-base text-base-content">
            {item.caption}
          </h2>
          <TileAge createdAt={item.createdAt} />
          <FeedAuthorLink author={item.author} />
        </div>
      </div>
    </div>
  );
}
