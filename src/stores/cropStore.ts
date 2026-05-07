import { create } from "zustand";
import type { Crop } from "../types";

interface CropState {
  readonly crops: readonly Crop[];
}

interface CropActions {
  readonly addCrop: (crop: Crop) => void;
  readonly updateCrop: (id: string, data: Partial<Omit<Crop, "id">>) => void;
  readonly deleteCrop: (id: string) => void;
}

function calculateHarvestDate(startDate: string, period: number): string {
  const d = new Date(startDate);
  d.setDate(d.getDate() + period);
  return d.toISOString();
}

export function createCrop(data: Omit<Crop, "id" | "harvestDate">): Crop {
  return {
    ...data,
    id: `crop-${Date.now()}`,
    harvestDate: calculateHarvestDate(data.startDate, data.period),
  };
}

export const useCropStore = create<CropState & CropActions>((set) => ({
  crops: [],

  addCrop: (crop) =>
    set((state) => ({ crops: [...state.crops, crop] })),

  updateCrop: (id, data) =>
    set((state) => ({
      crops: state.crops.map((c) => {
        if (c.id !== id) return c;
        const updated = { ...c, ...data };
        // Recalcular harvestDate si cambiaron startDate o period
        if (data.startDate || data.period) {
          return {
            ...updated,
            harvestDate: calculateHarvestDate(
              updated.startDate,
              updated.period
            ),
          };
        }
        return updated;
      }),
    })),

  deleteCrop: (id) =>
    set((state) => ({
      crops: state.crops.filter((c) => c.id !== id),
    })),
}));
