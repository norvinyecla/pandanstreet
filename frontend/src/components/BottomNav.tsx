import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: 'Profile' },
  { to: '/shoutouts', label: 'Shout-outs' },
  { to: '/bulletin-board', label: 'Bulletin' },
  { to: '/plaza', label: 'Plaza' },
];

export function BottomNav() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-md border-t border-gray-200 bg-white"
    >
      <ul className="grid grid-cols-4">
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
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
        ))}
      </ul>
    </nav>
  );
}
