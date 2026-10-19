export function assertSeedAllowed(options: { destructive?: boolean } = {}) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seed scripts are disabled in production environments.');
  }
  if (options.destructive && process.env.ALLOW_DESTRUCTIVE_SEED !== 'true') {
    throw new Error('This seed deletes existing data. Set ALLOW_DESTRUCTIVE_SEED=true only for a disposable development database.');
  }
}
