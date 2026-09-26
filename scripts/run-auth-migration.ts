/**
 * This one-off migration script used to create an incompatible auth schema.
 * All schema changes belong in ordered files under db/migrations/.
 */
console.error(
  "Deprecated: use `npm run db:migrate` to apply the reviewed, ordered database migrations.",
);
process.exitCode = 1;
