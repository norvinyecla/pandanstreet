/** `UsersService#create` input for service-level tests (no real password). */
export function newUser(name: string) {
  return { username: name.toLowerCase(), name, passwordHash: '' };
}
