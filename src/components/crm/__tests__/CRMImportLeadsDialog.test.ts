import { describe, it, expect } from "vitest";

// Reimplementação isolada para teste (mesma lógica do dialog)
function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const sep = lines[0].includes(";") && !lines[0].includes(",") ? ";" : ",";
  const parseLine = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === sep && !inQuotes) { out.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    out.push(cur.trim());
    return out;
  };
  return { headers: parseLine(lines[0]), rows: lines.slice(1).map(parseLine) };
}

function autoMap(header: string): string | null {
  const h = header.toLowerCase().trim();
  if (/(nome|name)/.test(h)) return "name";
  if (/(email|e-mail)/.test(h)) return "email";
  if (/(telefone|phone|celular|whatsapp)/.test(h)) return "phone";
  if (/(empresa|company|organiza)/.test(h)) return "company";
  if (/(segment|tipo|categoria|business)/.test(h)) return "business_type";
  if (/(status|situa)/.test(h)) return "status";
  if (/(origem|source|canal)/.test(h)) return "source";
  if (/(observ|notes|nota|coment)/.test(h)) return "notes";
  return null;
}

describe("CRM CSV Import", () => {
  it("parses comma-separated CSV", () => {
    const { headers, rows } = parseCSV("nome,email\nJoão,j@x.com\nMaria,m@x.com");
    expect(headers).toEqual(["nome", "email"]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual(["João", "j@x.com"]);
  });

  it("auto-detects semicolon separator (Excel BR)", () => {
    const { headers, rows } = parseCSV("nome;telefone\nAna;11999");
    expect(headers).toEqual(["nome", "telefone"]);
    expect(rows[0]).toEqual(["Ana", "11999"]);
  });

  it("respects quoted fields with commas", () => {
    const { rows } = parseCSV(`nome,obs\n"Silva, João","linha 1, com vírgula"`);
    expect(rows[0]).toEqual(["Silva, João", "linha 1, com vírgula"]);
  });

  it("handles escaped double quotes", () => {
    const { rows } = parseCSV(`nome\n"João ""JJ"" Silva"`);
    expect(rows[0]).toEqual(['João "JJ" Silva']);
  });

  it("ignores empty lines", () => {
    const { rows } = parseCSV("a,b\n\n1,2\n\n");
    expect(rows).toEqual([["1", "2"]]);
  });

  it("autoMap recognizes Portuguese variants", () => {
    expect(autoMap("Nome Completo")).toBe("name");
    expect(autoMap("E-mail")).toBe("email");
    expect(autoMap("Celular")).toBe("phone");
    expect(autoMap("WhatsApp")).toBe("phone");
    expect(autoMap("Empresa / Organização")).toBe("company");
    expect(autoMap("Origem do Lead")).toBe("source");
    expect(autoMap("Observações")).toBe("notes");
    expect(autoMap("xpto")).toBeNull();
  });
});
