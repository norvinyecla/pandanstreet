import type { ReactNode } from 'react';

/** Grey placeholder shapes shown while a page's data loads. */
function Skeleton({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="status" aria-label={label} className="animate-pulse">
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

function Block({
  className,
  circle = false,
}: {
  className: string;
  circle?: boolean;
}) {
  return (
    <div
      className={`bg-gray-200 ${circle ? 'rounded-full' : 'rounded-md'} ${className}`}
    />
  );
}

export function ProfileSkeleton() {
  return (
    <Skeleton label="Loading profile">
      <div className="flex flex-col items-center gap-4 pt-6">
        <Block className="h-24 w-24" circle />
        <Block className="h-6 w-32" />
        <Block className="h-4 w-48" />
        <div className="flex gap-6">
          <Block className="h-4 w-20" />
          <Block className="h-4 w-20" />
        </div>
        <Block className="h-11 w-28" />
        <div className="flex w-full flex-col gap-3 pt-2">
          <Block className="h-4 w-12" />
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3"
            >
              <Block className="h-4 w-full" />
              <Block className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </Skeleton>
  );
}

export function ShoutoutsSkeleton() {
  return (
    <Skeleton label="Loading shout-outs">
      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3"
          >
            <div className="flex min-h-11 items-center gap-2">
              <Block className="h-8 w-8" circle />
              <Block className="h-4 w-24" />
            </div>
            <Block className="h-4 w-full" />
            <Block className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </Skeleton>
  );
}

export function BulletinBoardSkeleton() {
  return (
    <Skeleton label="Loading bulletin board">
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className="flex flex-col gap-1">
            <Block className="aspect-square w-full" />
            <Block className="h-4 w-12" circle />
            <Block className="h-3 w-full" />
            <Block className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    </Skeleton>
  );
}

export function UserListSkeleton({
  rows = 3,
  withAction = true,
}: {
  rows?: number;
  withAction?: boolean;
}) {
  return (
    <Skeleton label="Loading people">
      <div className="flex flex-col gap-3">
        {Array.from({ length: rows }, (_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2"
          >
            <div className="flex min-h-11 items-center gap-2">
              <Block className="h-8 w-8" circle />
              <Block className="h-4 w-28" />
            </div>
            {withAction && <Block className="h-11 w-24" />}
          </div>
        ))}
      </div>
    </Skeleton>
  );
}

export function TileEditSkeleton() {
  return (
    <Skeleton label="Loading tile">
      <div className="flex flex-col gap-4 pt-6">
        <Block className="mx-auto h-7 w-24" />
        <Block className="h-4 w-10" />
        <Block className="h-28 w-full" />
        <Block className="h-11 w-full" />
      </div>
    </Skeleton>
  );
}
