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
              ? 'font-semibold text-primary'
              : 'font-medium text-base-content/70'
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
      className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-md border-t border-base-300 bg-base-100"
    >
      <ul className="grid grid-cols-5">
        {LEFT_ITEMS.map((item) => (
          <NavItemLink key={item.to} item={item} />
        ))}
        <li className="flex min-h-14 items-center justify-center">
          <button
            type="button"
            aria-label="Add tile"
            onClick={onAddTile}
            className="btn btn-circle btn-primary h-11 w-11 text-3xl leading-none font-light"
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
