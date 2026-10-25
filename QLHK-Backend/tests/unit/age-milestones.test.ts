import { describe, expect, it } from "vitest";
import { calculateExactAge, computeChucthoMilestones, computeHtxhMilestones, parseDobValue } from "../../src/utils/age";

describe("Age Calculation & Milestones Utility", () => {
  it("parses valid dates from string, date, and numbers", () => {
    expect(parseDobValue("15/08/1954")).toEqual({ dob: "15/08/1954", year: 1954 });
    expect(parseDobValue("05-1960")).toEqual({ dob: "01/05/1960", year: 1960 });
    expect(parseDobValue("1945")).toEqual({ dob: "01/01/1945", year: 1945 });
    expect(parseDobValue(1950)).toEqual({ dob: "01/01/1950", year: 1950 });
    expect(parseDobValue(new Date(1964, 4, 10))).toEqual({ dob: "10/05/1964", year: 1964 });
    expect(parseDobValue(null)).toBeNull();
    expect(parseDobValue("invalid")).toBeNull();
  });

  it("calculates exact age by day and month", () => {
    const ref = new Date(2026, 9, 25);
    expect(calculateExactAge("24/10/1966", ref)).toBe(60);
    expect(calculateExactAge("25/10/1966", ref)).toBe(60);
    expect(calculateExactAge("26/10/1966", ref)).toBe(59);
    expect(calculateExactAge("1966", ref)).toBe(60);
  });

  it("assigns milestones according to 5-year brackets", () => {
    const year = 2024;
    expect(computeChucthoMilestones(1964, year).age60).toBe("x");
    expect(computeChucthoMilestones(1963, year).age60).toBe("x");
    expect(computeChucthoMilestones(1965, year).age60).toBe("");
    expect(computeChucthoMilestones(1959, year).age65).toBe("x");
    expect(computeChucthoMilestones(1954, year).age70).toBe("x");
    expect(computeChucthoMilestones(1949, year).age75).toBe("x");
    expect(computeChucthoMilestones(1944, year).age80).toBe("x");
    expect(computeChucthoMilestones(1939, year).age85).toBe("x");
    expect(computeChucthoMilestones(1934, year).age90).toBe("x");
    expect(computeChucthoMilestones(1929, year).age95).toBe("x");
    expect(computeChucthoMilestones(1924, year).age100).toBe("x");
    expect(computeChucthoMilestones(1920, year).age_over_100).toBe("x");
  });

  it("correctly computes social assistance categories", () => {
    const year = 2024;
    expect(computeHtxhMilestones(1940, year).age75plus).toBe("x");
    expect(computeHtxhMilestones(1952, year, { age70to74poor: "x" }).age70to74poor).toBe("x");
    const m = computeHtxhMilestones(1960, year, { bao_tro: "x", huu_tri: "x", huu_tuat_bao_hiem: "x", nguoi_co_cong: "x" });
    expect([m.bao_tro, m.huu_tri, m.huu_tuat_bao_hiem, m.nguoi_co_cong]).toEqual(["x", "x", "x", "x"]);
  });
});
