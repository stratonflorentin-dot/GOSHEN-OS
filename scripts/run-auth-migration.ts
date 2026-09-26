import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL!, {
  max: 1,
});

async function runAuthMigration() {
  console.log("Running auth schema migration...");

  try {
    // Create auth schema
    await sql`create schema if not exists auth`;
    console.log("✓ Created auth schema");

    // Create user table
    await sql`
      create table if not exists auth."user" (
        id uuid primary key default gen_random_uuid(),
        email text not null unique,
        email_verified timestamptz,
        name text,
        image text,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    `;
    console.log("✓ Created auth.user table");

    // Create session table
    await sql`
      create table if not exists auth.session (
        id uuid primary key default gen_random_uuid(),
        user_id uuid not null references auth."user"(id) on delete cascade,
        token text not null unique,
        expires_at timestamptz not null,
        ip text,
        user_agent text,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    `;
    console.log("✓ Created auth.session table");

    // Create account table
    await sql`
      create table if not exists auth.account (
        id uuid primary key default gen_random_uuid(),
        user_id uuid not null references auth."user"(id) on delete cascade,
        account_id text not null,
        provider text not null,
        access_token text,
        refresh_token text,
        id_token text,
        expires_at timestamptz,
        token_type text,
        scope text,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        unique (provider, account_id)
      )
    `;
    console.log("✓ Created auth.account table");

    // Create verification table
    await sql`
      create table if not exists auth.verification (
        id uuid primary key default gen_random_uuid(),
        identifier text not null,
        value text not null,
        expires_at timestamptz not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    `;
    console.log("✓ Created auth.verification table");

    // Create indexes
    await sql`create index if not exists auth_session_user_id_idx on auth.session (user_id)`;
    await sql`create index if not exists auth_session_token_idx on auth.session (token)`;
    await sql`create index if not exists auth_session_expires_at_idx on auth.session (expires_at)`;
    await sql`create index if not exists auth_account_user_id_idx on auth.account (user_id)`;
    await sql`create index if not exists auth_verification_identifier_idx on auth.verification (identifier)`;
    await sql`create index if not exists auth_verification_expires_at_idx on auth.verification (expires_at)`;
    console.log("✓ Created indexes");

    console.log("\n✅ Auth schema migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

runAuthMigration().catch(console.error);
