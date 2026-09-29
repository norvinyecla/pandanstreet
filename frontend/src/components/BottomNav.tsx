import { NavLink } from 'react-router-dom';

type NavItem = { to: string; label: string };

const LEFT_ITEMS: NavItem[] = [
  { to: '/', label: 'Profile' },
  { to: '/shoutouts', label: 'Shout-outs' },
];

const RIGHT_ITEMS: NavItem[] = [
  { to: '/bulletin-board', label: 'Bulletin' },
  { to: '/plaza', label: 'Plaza' },
];

function NavItemLink({ item }: { item: NavItem }) {
  return (
    <li>
      <NavLink
        to={item.to}
        end
        className={({ isActive }) =>
          `flex min-h-14 items-center justify-center text-sm ${
            isActive
              ? 'font-semibold text-gray-900'
              : 'font-medium text-gray-500'
          }`
        }
      >
        {item.label}
      </NavLink>
    </li>
  );
}

export function BottomNav({ onAddTile }: { onAddTile: () => void }) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-md border-t border-gray-200 bg-white"
    >
      <ul className="grid grid-cols-5">
        {LEFT_ITEMS.map((item) => (
          <NavItemLink key={item.to} item={item} />
        ))}
        <li>
          <button
            type="button"
            aria-label="Add tile"
            onClick={onAddTile}
            className="flex min-h-14 w-full items-center justify-center text-3xl leading-none font-light text-gray-900"
          >
            +
          </button>
        </li>
        {RIGHT_ITEMS.map((item) => (
          <NavItemLink key={item.to} item={item} />
        ))}
      </ul>
    </nav>
  );
}
