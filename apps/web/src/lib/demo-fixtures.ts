/**
 * Demo Mode fixtures. Returned by perfect.ts wrappers when `demoMode` is on.
 * Used as the fallback for live judging so a flaky network can never break
 * the demo. Image URLs point to the bundled placeholder assets.
 */

import type {
  SkinAnalysisResult,
  SkinToneResult,
  AgingResult,
  SkinSimulationResult,
  MakeupResult,
  HairResult,
  ClothesResult,
  AccessoryResult,
} from "./perfect";

const PH = "/demo/";

const FIXTURES: Record<string, unknown> = {
  skinAnalysis: {
    concerns: [
      { key: "wrinkle", label: "Fine lines & wrinkles", score: 62 },
      { key: "pore", label: "Pores", score: 48 },
      { key: "age_spot", label: "Age spots", score: 71 },
      { key: "redness", label: "Redness", score: 55 },
      { key: "radiance", label: "Radiance", score: 64 },
      { key: "texture", label: "Texture", score: 59 },
      { key: "dark_circle", label: "Dark circles", score: 41 },
    ],
    top3: ["dark_circle", "pore", "redness"],
  } satisfies SkinAnalysisResult,

  skinTone: {
    undertone: "warm",
    skinHex: "#e3b89a",
    lipHex: "#b8625b",
    eyeHex: "#5a3b29",
    hairHex: "#2a1a14",
  } satisfies SkinToneResult,

  aging: {
    age5Url: PH + "future-5.svg",
    age10Url: PH + "future-10.svg",
  } satisfies AgingResult,

  skinSimulation: { improvedUrl: PH + "care.svg" } satisfies SkinSimulationResult,
  makeup: { previewUrl: PH + "makeup.svg", lookName: "Ember Glow" } satisfies MakeupResult,
  hair: { previewUrl: PH + "hair.svg", styleName: "Loose Waves" } satisfies HairResult,
  clothes: { previewUrl: PH + "outfit.svg", garmentName: "Slip Dress" } satisfies ClothesResult,
  accessory: {
    previewUrl: PH + "accessory.svg",
    itemName: "Gold Hoops",
    category: "jewelry",
  } satisfies AccessoryResult,
};

export function demoFixture(cacheKey: string): unknown {
  if (cacheKey.startsWith("skin-analysis:")) return FIXTURES.skinAnalysis;
  if (cacheKey.startsWith("skin-tone:"))     return FIXTURES.skinTone;
  if (cacheKey.startsWith("aging:"))         return FIXTURES.aging;
  if (cacheKey.startsWith("skin-sim:"))      return FIXTURES.skinSimulation;
  if (cacheKey.startsWith("makeup:"))        return FIXTURES.makeup;
  if (cacheKey.startsWith("hair:"))          return FIXTURES.hair;
  if (cacheKey.startsWith("clothes:"))       return FIXTURES.clothes;
  if (cacheKey.startsWith("acc:"))           return FIXTURES.accessory;
  return null;
}
