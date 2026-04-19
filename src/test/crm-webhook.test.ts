import { describe, it, expect } from "vitest";

// Replica a normalização de telefone usada pelo crm-webhook
function normalizePhone(input?: string | null): string | null {
  if (!input) return null;
  const digits = input.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.startsWith("55") ? digits : `55${digits}`;
}

describe("CRM Webhook lead validation", () => {
  it("strips formatting and adds 55 prefix", () => {
    expect(normalizePhone("(11) 99999-8888")).toBe("5511999998888");
  });

  it("keeps prefix when already present", () => {
    expect(normalizePhone("+5511999998888")).toBe("5511999998888");
  });

  it("rejects too short numbers", () => {
    expect(normalizePhone("1234")).toBeNull();
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone(null)).toBeNull();
  });
});
