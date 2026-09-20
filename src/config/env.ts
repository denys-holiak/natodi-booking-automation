function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. See README.md "Prerequisites" and "Configuring the target booking page" - this suite needs its own Natodi booking account to run against, not a value baked into the repo.`,
    );
  }
  return value;
}

export const BOOKING_URL = requireEnv('BOOKING_URL');
export const BOOKING_SERVICE_NAME = requireEnv('BOOKING_SERVICE_NAME');
export const BOOKING_MASTER_NAME = requireEnv('BOOKING_MASTER_NAME');
