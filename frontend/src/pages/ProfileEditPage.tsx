import { Link } from 'react-router-dom';

export function ProfileEditPage() {
  return (
    <div className="flex flex-col gap-4 pt-6 text-center">
      <h1 className="text-xl font-semibold text-gray-900">Edit profile</h1>
      <p className="text-sm text-gray-500">Coming soon.</p>
      <Link to="/" className="text-sm font-medium text-gray-700 underline">
        Back to profile
      </Link>
    </div>
  );
}
