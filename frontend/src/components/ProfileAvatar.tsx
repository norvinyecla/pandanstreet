const SIZE_CLASSES = {
  sm: 'h-8 w-8',
  lg: 'h-24 w-24',
} as const;

export function ProfileAvatar({
  src,
  name,
  size,
}: {
  src?: string;
  name: string;
  size: keyof typeof SIZE_CLASSES;
}) {
  const sizeClass = SIZE_CLASSES[size];

  if (src) {
    return (
      <img
        src={src}
        alt={`${name}'s profile photo`}
        className={`${sizeClass} shrink-0 rounded-full bg-gray-100 object-cover`}
      />
    );
  }

  // Default avatar for accounts without an uploaded photo: a sprout icon.
  return (
    <div
      data-testid="default-avatar"
      aria-hidden="true"
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500`}
    >
      <svg
        viewBox="0 0 64 64"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3/5 w-3/5"
      >
        <path d="M32 46V14" />
        <path d="M32 24c-4.5-4.5-4.5-12.5 0-18 4.5 5.5 4.5 13.5 0 18Z" />
        <path d="M32 38c-8 0-14.5-5.5-16-15 8.5 0 15 5.5 16 15Z" />
        <path d="M32 32c8 0 14.5-5.5 16-15-8.5 0-15 5.5-16 15Z" />
        <path d="M8 55c0-5 4.5-8.5 9.5-7 2-5 8-7.5 12.5-5 1.5-.5 2.5-.5 4 0 4.5-2.5 10.5 0 12.5 5 5-1.5 9.5 2 9.5 7Z" />
      </svg>
    </div>
  );
}
