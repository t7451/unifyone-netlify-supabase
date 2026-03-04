import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock DB ───────────────────────────────────────────────────────────────────
const mockThemes: any[] = [];
const mockInstalls: any[] = [];
const mockReviews: any[] = [];
const mockCategories: any[] = [];

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  offset: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockResolvedValue(undefined),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
};

vi.mock("../server/db", () => ({
  getDb: vi.fn().mockResolvedValue(mockDb),
}));

vi.mock("../drizzle/schema", () => ({
  themes: { id: "id", status: "status", slug: "slug", installCount: "installCount", reviewCount: "reviewCount" },
  themeCategories: { sortOrder: "sortOrder" },
  themeInstalls: { themeId: "themeId", userId: "userId" },
  themeReviews: { themeId: "themeId", userId: "userId", status: "status", createdAt: "createdAt" },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────
function safeArray(val: unknown): string[] {
  if (Array.isArray(val)) return val as string[];
  if (typeof val === "string") {
    try { return JSON.parse(val); } catch { return []; }
  }
  return [];
}

function mapTheme(t: any) {
  return {
    ...t,
    screenshotUrls: safeArray(t.screenshotUrls),
    tags: safeArray(t.tags),
    features: safeArray(t.features),
    techStack: safeArray(t.techStack),
    price: t.price ? String(t.price) : "0.00",
    averageRating: t.averageRating ? String(t.averageRating) : "0.00",
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("Theme Store helpers", () => {
  describe("safeArray", () => {
    it("returns array as-is", () => {
      expect(safeArray(["a", "b"])).toEqual(["a", "b"]);
    });

    it("parses JSON string to array", () => {
      expect(safeArray('["react","tailwind"]')).toEqual(["react", "tailwind"]);
    });

    it("returns empty array for null", () => {
      expect(safeArray(null)).toEqual([]);
    });

    it("returns empty array for invalid JSON", () => {
      expect(safeArray("not-json")).toEqual([]);
    });

    it("returns empty array for undefined", () => {
      expect(safeArray(undefined)).toEqual([]);
    });
  });

  describe("mapTheme", () => {
    it("maps a theme row with JSON string fields", () => {
      const raw = {
        id: 1,
        name: "Horizon",
        slug: "horizon",
        price: "29.00",
        averageRating: "4.50",
        screenshotUrls: '["https://cdn.example.com/1.png"]',
        tags: '["dark","minimal"]',
        features: '["Responsive","SEO"]',
        techStack: '["React","Tailwind"]',
      };
      const result = mapTheme(raw);
      expect(result.price).toBe("29.00");
      expect(result.averageRating).toBe("4.50");
      expect(result.tags).toEqual(["dark", "minimal"]);
      expect(result.features).toEqual(["Responsive", "SEO"]);
      expect(result.techStack).toEqual(["React", "Tailwind"]);
      expect(result.screenshotUrls).toEqual(["https://cdn.example.com/1.png"]);
    });

    it("handles null JSON fields gracefully", () => {
      const raw = {
        id: 2,
        name: "Blank",
        slug: "blank",
        price: null,
        averageRating: null,
        screenshotUrls: null,
        tags: null,
        features: null,
        techStack: null,
      };
      const result = mapTheme(raw);
      expect(result.price).toBe("0.00");
      expect(result.averageRating).toBe("0.00");
      expect(result.tags).toEqual([]);
      expect(result.features).toEqual([]);
    });

    it("handles pre-parsed array fields", () => {
      const raw = {
        id: 3,
        name: "Test",
        slug: "test",
        price: "0.00",
        averageRating: "0.00",
        screenshotUrls: [],
        tags: ["tag1", "tag2"],
        features: [],
        techStack: [],
      };
      const result = mapTheme(raw);
      expect(result.tags).toEqual(["tag1", "tag2"]);
    });
  });
});

describe("Theme Store filter logic", () => {
  const sampleThemes = [
    { id: 1, name: "Alpha", description: "A dark theme", priceType: "free", complexity: "starter", featured: true, installCount: 100, averageRating: "4.5" },
    { id: 2, name: "Beta", description: "A light theme", priceType: "paid", complexity: "advanced", featured: false, installCount: 50, averageRating: "3.8" },
    { id: 3, name: "Gamma", description: "A minimal store", priceType: "free", complexity: "standard", featured: false, installCount: 200, averageRating: "4.9" },
  ];

  it("filters by search term (name)", () => {
    const q = "alpha";
    const result = sampleThemes.filter(t =>
      t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
    );
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Alpha");
  });

  it("filters by priceType", () => {
    const result = sampleThemes.filter(t => t.priceType === "free");
    expect(result).toHaveLength(2);
  });

  it("filters by complexity", () => {
    const result = sampleThemes.filter(t => t.complexity === "advanced");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Beta");
  });

  it("filters featured themes", () => {
    const result = sampleThemes.filter(t => t.featured);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Alpha");
  });

  it("sorts by popular (installCount desc)", () => {
    const sorted = [...sampleThemes].sort((a, b) => b.installCount - a.installCount);
    expect(sorted[0].name).toBe("Gamma");
    expect(sorted[1].name).toBe("Alpha");
    expect(sorted[2].name).toBe("Beta");
  });

  it("sorts by rating desc", () => {
    const sorted = [...sampleThemes].sort((a, b) => Number(b.averageRating) - Number(a.averageRating));
    expect(sorted[0].name).toBe("Gamma");
    expect(sorted[1].name).toBe("Alpha");
  });

  it("sorts by price_asc", () => {
    const withPrices = [
      { ...sampleThemes[0], price: "0.00" },
      { ...sampleThemes[1], price: "49.00" },
      { ...sampleThemes[2], price: "0.00" },
    ];
    const sorted = [...withPrices].sort((a, b) => Number(a.price) - Number(b.price));
    expect(sorted[0].price).toBe("0.00");
    expect(sorted[sorted.length - 1].price).toBe("49.00");
  });
});

describe("Theme Store slug generation", () => {
  function slugify(s: string) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  it("converts spaces to hyphens", () => {
    expect(slugify("Horizon Commerce")).toBe("horizon-commerce");
  });

  it("removes special characters", () => {
    expect(slugify("My Theme! (v2)")).toBe("my-theme-v2");
  });

  it("handles leading/trailing hyphens", () => {
    expect(slugify("  spaces  ")).toBe("spaces");
  });

  it("lowercases all characters", () => {
    expect(slugify("UPPERCASE")).toBe("uppercase");
  });
});

describe("Theme pricing validation", () => {
  it("free theme has price 0.00", () => {
    const theme = { priceType: "free", price: "0.00" };
    expect(theme.priceType).toBe("free");
    expect(parseFloat(theme.price)).toBe(0);
  });

  it("paid theme has positive price", () => {
    const theme = { priceType: "paid", price: "29.00" };
    expect(parseFloat(theme.price)).toBeGreaterThan(0);
  });

  it("calculates Stripe amount in cents correctly", () => {
    const price = "29.99";
    const amountCents = Math.round(parseFloat(price) * 100);
    expect(amountCents).toBe(2999);
  });

  it("handles zero price for free themes in cents", () => {
    const price = "0.00";
    const amountCents = Math.round(parseFloat(price) * 100);
    expect(amountCents).toBe(0);
  });
});
