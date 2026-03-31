import { storageService, StorageRecord } from "./storage.js";

export interface PaperNote extends StorageRecord {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  year?: number;
  venue?: string;
  url?: string;
  sections: { heading: string; content: string }[];
  keyFindings: string[];
  formulas: { latex: string; description: string }[];
  tags: string[];
  summary?: string;
}

export class PaperParserService {
  parse(id: string, text: string, meta: Partial<PaperNote> = {}): PaperNote {
    const note: PaperNote = {
      id,
      title: this.extractTitle(text) || meta.title || "Untitled",
      authors: meta.authors || this.extractAuthors(text),
      abstract: this.extractAbstract(text) || meta.abstract || "",
      sections: this.extractSections(text),
      keyFindings: this.extractKeyFindings(text),
      formulas: this.extractFormulas(text),
      tags: meta.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...meta,
    };
    storageService.put("papers", note);
    return note;
  }

  private extractTitle(text: string): string | null {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return null;
    // First non-empty line is usually the title
    return lines[0].length < 200 ? lines[0] : null;
  }

  private extractAuthors(text: string): string[] {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    // Second line often has authors
    const authorLine = lines[1];
    if (authorLine.includes("@") || authorLine.includes("et al") || authorLine.length < 200) {
      return authorLine.split(/[,;]/).map((a) => a.trim()).filter(Boolean);
    }
    return [];
  }

  private extractAbstract(text: string): string | null {
    const match = text.match(/abstract[:\s]*\n?(.+?)(?:\n\s*\n|1\s+\.?\s*introduction|keywords)/is);
    return match ? match[1].trim() : null;
  }

  private extractSections(text: string): { heading: string; content: string }[] {
    const sections: { heading: string; content: string }[] = [];
    const regex = /^(#{1,4}|\d+\.?\s+)([A-Z][^\n]{2,80})\s*\n([\s\S]*?)(?=^(#{1,4}|\d+\.?\s+)[A-Z]|\z)/gim;
    let match;
    while ((match = regex.exec(text)) !== null) {
      sections.push({ heading: match[2].trim(), content: match[3].trim() });
    }
    return sections;
  }

  private extractKeyFindings(text: string): string[] {
    const findings: string[] = [];
    const patterns = [
      /(?:we (?:find|show|demonstrate|propose|discover)[^\n.]*\.)/gi,
      /(?:key finding|main result|our (?:result|approach|method))[^\n.]*[.:]\s*([^\n]+)/gi,
      /(?:significant|notable|important)[^\n.]*[.:]\s*([^\n]+)/gi,
    ];
    for (const pat of patterns) {
      let m;
      while ((m = pat.exec(text)) !== null) {
        findings.push(m[0].trim());
      }
    }
    return [...new Set(findings)].slice(0, 10);
  }

  private extractFormulas(text: string): { latex: string; description: string }[] {
    const formulas: { latex: string; description: string }[] = [];
    const regex = /\$\$([^$]+)\$\$|\$([^$]+)\$/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const latex = (match[1] || match[2]).trim();
      if (latex.length > 3 && latex.length < 200) {
        formulas.push({ latex, description: "" });
      }
    }
    return formulas;
  }

  get(id: string): PaperNote | null {
    return storageService.get<PaperNote>("papers", id);
  }

  list(): string[] {
    return storageService.list("papers");
  }

  search(query: string): PaperNote[] {
    return storageService.search("papers", query) as PaperNote[];
  }
}

export const paperParser = new PaperParserService();
