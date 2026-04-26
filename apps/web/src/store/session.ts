import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  SkinAnalysisResult,
  SkinToneResult,
  AgingResult,
  SkinSimulationResult,
  MakeupResult,
  HairResult,
  ClothesResult,
  AccessoryResult,
} from "@/lib/perfect";
import type { EventKey } from "@/lib/event-templates";

/** "full" = both acts; "future" = Act 1 only; "today" = Act 2 only. */
export type JourneyMode = "full" | "future" | "today";

export type Selfie = {
  /** Object URL for preview (recreated per session — not persisted). */
  previewUrl: string;
  /** SHA-256 hex of the original bytes — used as cache key. */
  hash: string;
  /** Raw bytes as base64 so we can rebuild a Blob if the page reloads. */
  base64: string;
  contentType: string;
  width: number;
  height: number;
};

export type SessionState = {
  selfie: Selfie | null;
  voiceEnabled: boolean;
  demoMode: boolean;
  mode: JourneyMode;

  // Act 1 results
  skinAnalysis: SkinAnalysisResult | null;
  skinTone: SkinToneResult | null;
  aging: AgingResult | null;
  skinSimulation: SkinSimulationResult | null;

  // Act 2
  event: EventKey | null;
  makeup: MakeupResult | null;
  hair: HairResult | null;
  clothes: ClothesResult | null;
  accessory: AccessoryResult | null;

  setSelfie: (s: Selfie | null) => void;
  setVoice: (v: boolean) => void;
  setDemo: (v: boolean) => void;
  setMode: (m: JourneyMode) => void;
  setEvent: (e: EventKey | null) => void;

  setSkinAnalysis: (r: SkinAnalysisResult | null) => void;
  setSkinTone: (r: SkinToneResult | null) => void;
  setAging: (r: AgingResult | null) => void;
  setSkinSimulation: (r: SkinSimulationResult | null) => void;
  setMakeup: (r: MakeupResult | null) => void;
  setHair: (r: HairResult | null) => void;
  setClothes: (r: ClothesResult | null) => void;
  setAccessory: (r: AccessoryResult | null) => void;

  reset: () => void;
};

const initial = {
  selfie: null,
  skinAnalysis: null,
  skinTone: null,
  aging: null,
  skinSimulation: null,
  event: null,
  makeup: null,
  hair: null,
  clothes: null,
  accessory: null,
};

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      ...initial,
      voiceEnabled: false,
      demoMode: import.meta.env.VITE_DEMO_MODE === "1",
      mode: "full",
      setSelfie: (selfie) => set({ selfie }),
      setVoice: (voiceEnabled) => set({ voiceEnabled }),
      setDemo: (demoMode) => set({ demoMode }),
      setMode: (mode) => set({ mode }),
      setEvent: (event) => set({ event }),
      setSkinAnalysis: (skinAnalysis) => set({ skinAnalysis }),
      setSkinTone: (skinTone) => set({ skinTone }),
      setAging: (aging) => set({ aging }),
      setSkinSimulation: (skinSimulation) => set({ skinSimulation }),
      setMakeup: (makeup) => set({ makeup }),
      setHair: (hair) => set({ hair }),
      setClothes: (clothes) => set({ clothes }),
      setAccessory: (accessory) => set({ accessory }),
      reset: () => set({ ...initial }),
    }),
    {
      name: "glow-forecast-session",
      partialize: (s) => ({
        voiceEnabled: s.voiceEnabled,
        demoMode: s.demoMode,
        mode: s.mode,
        // Don't persist results — they live in the idb cache keyed by selfie hash.
      }),
    },
  ),
);
