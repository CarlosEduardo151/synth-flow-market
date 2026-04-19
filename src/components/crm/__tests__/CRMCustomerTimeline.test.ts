import { describe, it, expect } from "vitest";

// Replica da lógica de agregação/ordenação de timeline do CRMCustomerTimeline
type Item = { id: string; kind: string; date: string; title: string };

function buildTimeline(sources: { interactions: any[]; opportunities: any[]; messages: any[]; memories: any[] }): Item[] {
  const out: Item[] = [];
  for (const i of sources.interactions) {
    out.push({ id: `int-${i.id}`, kind: "interaction", date: i.created_at, title: i.subject || i.type });
  }
  for (const o of sources.opportunities) {
    out.push({ id: `opp-${o.id}`, kind: "opportunity", date: o.updated_at || o.created_at, title: o.title });
  }
  for (const m of sources.messages) {
    out.push({ id: `msg-${m.id}`, kind: "message", date: m.created_at, title: m.direction === "in" ? "Cliente" : "Bot" });
  }
  for (const mem of sources.memories) {
    out.push({ id: `mem-${mem.id}`, kind: "memory", date: mem.interaction_date, title: "Resumo" });
  }
  out.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return out;
}

describe("CRM Customer Timeline aggregation", () => {
  it("merges and sorts events from all sources DESC", () => {
    const items = buildTimeline({
      interactions: [{ id: "i1", subject: "Ligação", created_at: "2026-04-10T10:00:00Z" }],
      opportunities: [{ id: "o1", title: "Proposta", created_at: "2026-04-15T10:00:00Z" }],
      messages: [
        { id: "m1", direction: "in", created_at: "2026-04-18T10:00:00Z" },
        { id: "m2", direction: "out", created_at: "2026-04-05T10:00:00Z" },
      ],
      memories: [{ id: "mem1", interaction_date: "2026-04-12T10:00:00Z" }],
    });
    expect(items.map((i) => i.id)).toEqual(["msg-m1", "opp-o1", "mem-mem1", "int-i1", "msg-m2"]);
  });

  it("returns empty array when no sources have data", () => {
    expect(buildTimeline({ interactions: [], opportunities: [], messages: [], memories: [] })).toEqual([]);
  });

  it("classifies inbound vs outbound messages correctly", () => {
    const items = buildTimeline({
      interactions: [], opportunities: [], memories: [],
      messages: [
        { id: "a", direction: "in", created_at: "2026-04-19T10:00:00Z" },
        { id: "b", direction: "out", created_at: "2026-04-19T11:00:00Z" },
      ],
    });
    expect(items[0].title).toBe("Bot");
    expect(items[1].title).toBe("Cliente");
  });
});
