import { createCrop, useCropStore } from "./cropStore";

describe("cropStore", () => {
  beforeEach(() => {
    useCropStore.setState({ crops: [] });
  });

  describe("createCrop helper", () => {
    it("computes harvestDate as startDate + period (days)", () => {
      const crop = createCrop({
        name: "Tomate",
        startDate: "2026-05-01T00:00:00.000Z",
        period: 90,
        zones: ["Zona A"],
      });

      expect(crop.harvestDate).toBe("2026-07-30T00:00:00.000Z");
      expect(crop.id).toMatch(/^crop-\d+$/);
    });

    it("preserves startDate and zones", () => {
      const crop = createCrop({
        name: "Lechuga",
        startDate: "2026-04-01T00:00:00.000Z",
        period: 45,
        zones: ["Zona B", "Zona C"],
      });

      expect(crop.name).toBe("Lechuga");
      expect(crop.zones).toEqual(["Zona B", "Zona C"]);
      expect(crop.startDate).toBe("2026-04-01T00:00:00.000Z");
    });
  });

  describe("store actions", () => {
    it("addCrop appends crops", () => {
      const a = createCrop({
        name: "A",
        startDate: "2026-05-01T00:00:00.000Z",
        period: 30,
        zones: [],
      });
      useCropStore.getState().addCrop(a);

      expect(useCropStore.getState().crops).toHaveLength(1);
      expect(useCropStore.getState().crops[0].name).toBe("A");
    });

    it("updateCrop changes simple fields without recomputing harvestDate", () => {
      const crop = createCrop({
        name: "Tomate",
        startDate: "2026-05-01T00:00:00.000Z",
        period: 60,
        zones: [],
      });
      useCropStore.setState({ crops: [crop] });

      useCropStore.getState().updateCrop(crop.id, { name: "Tomate Cherry" });

      const updated = useCropStore.getState().crops[0];
      expect(updated.name).toBe("Tomate Cherry");
      expect(updated.harvestDate).toBe(crop.harvestDate);
    });

    it("updateCrop recalculates harvestDate when startDate changes", () => {
      const crop = createCrop({
        name: "Tomate",
        startDate: "2026-05-01T00:00:00.000Z",
        period: 30,
        zones: [],
      });
      useCropStore.setState({ crops: [crop] });

      useCropStore.getState().updateCrop(crop.id, {
        startDate: "2026-06-01T00:00:00.000Z",
      });

      expect(useCropStore.getState().crops[0].harvestDate).toBe(
        "2026-07-01T00:00:00.000Z"
      );
    });

    it("updateCrop recalculates harvestDate when period changes", () => {
      const crop = createCrop({
        name: "Tomate",
        startDate: "2026-05-01T00:00:00.000Z",
        period: 30,
        zones: [],
      });
      useCropStore.setState({ crops: [crop] });

      useCropStore.getState().updateCrop(crop.id, { period: 90 });

      expect(useCropStore.getState().crops[0].harvestDate).toBe(
        "2026-07-30T00:00:00.000Z"
      );
    });

    it("updateCrop is a no-op when the id does not match", () => {
      const crop = createCrop({
        name: "Tomate",
        startDate: "2026-05-01T00:00:00.000Z",
        period: 30,
        zones: [],
      });
      useCropStore.setState({ crops: [crop] });

      useCropStore.getState().updateCrop("crop-nonexistent", { name: "Other" });

      expect(useCropStore.getState().crops[0].name).toBe("Tomate");
    });

    it("deleteCrop removes the matching crop", () => {
      const nowSpy = jest
        .spyOn(Date, "now")
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(2000);

      const a = createCrop({
        name: "A",
        startDate: "2026-05-01T00:00:00.000Z",
        period: 30,
        zones: [],
      });
      const b = createCrop({
        name: "B",
        startDate: "2026-05-01T00:00:00.000Z",
        period: 30,
        zones: [],
      });
      useCropStore.setState({ crops: [a, b] });

      useCropStore.getState().deleteCrop(a.id);

      expect(useCropStore.getState().crops).toEqual([b]);
      nowSpy.mockRestore();
    });
  });
});
