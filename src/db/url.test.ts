import { describe, expect, it } from "vitest";
import { databaseUrl } from "./url";

const TRANSACTION = "postgresql://postgres.ref:secret@aws-1-eu-central-1.pooler.supabase.com:6543/postgres";

describe("databaseUrl", () => {
  it("uses Supavisor session mode in development", () => {
    expect(databaseUrl(TRANSACTION, "development")).toBe(
      "postgresql://postgres.ref:secret@aws-1-eu-central-1.pooler.supabase.com:5432/postgres",
    );
  });

  it("keeps transaction mode in production and tests", () => {
    expect(databaseUrl(TRANSACTION, "production")).toBe(TRANSACTION);
    expect(databaseUrl(TRANSACTION, "test")).toBe(TRANSACTION);
  });

  it("leaves other databases alone", () => {
    const local = "postgresql://postgres:postgres@127.0.0.1:55322/postgres";
    expect(databaseUrl(local, "development")).toBe(local);
    const session = TRANSACTION.replace(":6543", ":5432");
    expect(databaseUrl(session, "development")).toBe(session);
  });
});
