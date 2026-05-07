import { useHubStore } from "./hubStore";
import type { Hub } from "../types";

const makeHub = (overrides: Partial<Hub> = {}): Hub => ({
  hash: "AABBCCDDEEFF",
  name: "Hub Demo",
  ip: "10.130.64.243",
  status: "conectado",
  addedAt: "2026-05-07T12:00:00.000Z",
  ...overrides,
});

describe("hubStore", () => {
  beforeEach(() => {
    useHubStore.setState({
      hubs: [],
      connectionMode: "directo",
      selectedHubHash: null,
    });
  });

  it("addHub appends a new hub", () => {
    useHubStore.getState().addHub(makeHub());

    expect(useHubStore.getState().hubs).toHaveLength(1);
    expect(useHubStore.getState().hubs[0].hash).toBe("AABBCCDDEEFF");
  });

  it("addHub deduplicates by hash", () => {
    const hub = makeHub();
    useHubStore.getState().addHub(hub);
    useHubStore.getState().addHub(makeHub({ name: "Distinto pero mismo hash" }));

    expect(useHubStore.getState().hubs).toHaveLength(1);
    expect(useHubStore.getState().hubs[0].name).toBe("Hub Demo");
  });

  it("removeHub removes the matching hub and clears selection if it pointed to it", () => {
    const hub = makeHub();
    useHubStore.setState({
      hubs: [hub],
      selectedHubHash: hub.hash,
    });

    useHubStore.getState().removeHub(hub.hash);

    expect(useHubStore.getState().hubs).toHaveLength(0);
    expect(useHubStore.getState().selectedHubHash).toBeNull();
  });

  it("removeHub leaves selection alone when removing a different hub", () => {
    const a = makeHub({ hash: "AAAAAAAAAAAA" });
    const b = makeHub({ hash: "BBBBBBBBBBBB" });
    useHubStore.setState({
      hubs: [a, b],
      selectedHubHash: a.hash,
    });

    useHubStore.getState().removeHub(b.hash);

    expect(useHubStore.getState().hubs).toEqual([a]);
    expect(useHubStore.getState().selectedHubHash).toBe(a.hash);
  });

  it("updateHubStatus updates only the targeted hub", () => {
    const a = makeHub({ hash: "AAAAAAAAAAAA", status: "conectado" });
    const b = makeHub({ hash: "BBBBBBBBBBBB", status: "conectado" });
    useHubStore.setState({ hubs: [a, b] });

    useHubStore.getState().updateHubStatus("AAAAAAAAAAAA", "desconectado");

    expect(useHubStore.getState().hubs[0].status).toBe("desconectado");
    expect(useHubStore.getState().hubs[1].status).toBe("conectado");
  });

  it("setConnectionMode flips the mode", () => {
    useHubStore.getState().setConnectionMode("online");
    expect(useHubStore.getState().connectionMode).toBe("online");
    useHubStore.getState().setConnectionMode("directo");
    expect(useHubStore.getState().connectionMode).toBe("directo");
  });

  it("selectHub sets selectedHubHash", () => {
    useHubStore.getState().selectHub("AABBCCDDEEFF");
    expect(useHubStore.getState().selectedHubHash).toBe("AABBCCDDEEFF");
  });
});
