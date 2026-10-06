import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProfileAvatar } from './ProfileAvatar.tsx';

describe('ProfileAvatar', () => {
  it('renders the uploaded photo with alt text', () => {
    render(
      <ProfileAvatar
        src="https://photos.example.test/photos/ada.png"
        name="Ada"
        size="lg"
      />,
    );

    expect(screen.getByAltText("Ada's profile photo")).toHaveAttribute(
      'src',
      'https://photos.example.test/photos/ada.png',
    );
    expect(screen.queryByTestId('default-avatar')).not.toBeInTheDocument();
  });

  it('renders the default sprout avatar when there is no photo', () => {
    render(<ProfileAvatar src="" name="Ada" size="sm" />);

    const avatar = screen.getByTestId('default-avatar');
    expect(avatar).toHaveAttribute('aria-hidden', 'true');
    expect(avatar.querySelector('svg')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
