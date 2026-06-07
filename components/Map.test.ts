import { describe, it, expect } from "vitest";
import {
  getPinState,
  PIN_SPECS,
  teardropPinHtml,
  clusterIconSpec,
  buildClusterIndex,
  getClusterItems,
  type PinState,
  type Restaurant,
  type MapClusterItem,
} from "./Map";

// ---------------------------------------------------------------------------
// getPinState
// ---------------------------------------------------------------------------

describe("getPinState", () => {
  describe("desktop", () => {
    it("is 'default' when nothing is selected or hovered", () => {
      expect(getPinState("r1", null, null, false)).toBe("default");
    });

    it("is 'selected' for the selected pin", () => {
      expect(getPinState("r1", "r1", null, false)).toBe("selected");
    });

    it("dims every other pin once one is selected", () => {
      expect(getPinState("r2", "r1", null, false)).toBe("dimmed");
    });

    it("is 'hovered' for the hovered pin when nothing is selected", () => {
      expect(getPinState("r1", null, "r1", false)).toBe("hovered");
    });

    it("dims every other pin while one is hovered", () => {
      expect(getPinState("r2", null, "r1", false)).toBe("dimmed");
    });

    it("prefers selection over hover when both are set", () => {
      // r1 is hovered but r2 is selected → r1 must be dimmed, not hovered
      expect(getPinState("r1", "r2", "r1", false)).toBe("dimmed");
      expect(getPinState("r2", "r2", "r1", false)).toBe("selected");
    });
  });

  describe("mobile", () => {
    it("is 'selected' for the selected pin", () => {
      expect(getPinState("r1", "r1", null, true)).toBe("selected");
    });

    it("is always 'default' for non-selected pins, ignoring hover", () => {
      expect(getPinState("r2", "r1", null, true)).toBe("default");
      expect(getPinState("r2", null, "r2", true)).toBe("default");
    });

    it("never returns 'hovered' or 'dimmed'", () => {
      const states: PinState[] = ["r1", "r2"].map((id) => getPinState(id, "r1", "r2", true));
      expect(states).not.toContain("hovered");
      expect(states).not.toContain("dimmed");
    });
  });
});

// ---------------------------------------------------------------------------
// Pin appearance — every state renders the same teardrop shape; only size,
// opacity and the "highlighted" extras (white dot + shadow) vary.
// ---------------------------------------------------------------------------

describe("PIN_SPECS", () => {
  it("only highlights the selected state (white dot + drop shadow)", () => {
    expect(PIN_SPECS.selected.highlighted).toBe(true);
    expect(PIN_SPECS.hovered.highlighted).toBe(false);
    expect(PIN_SPECS.default.highlighted).toBe(false);
    expect(PIN_SPECS.dimmed.highlighted).toBe(false);
  });

  it("ranks pin sizes selected > hovered > default > dimmed", () => {
    const { selected, hovered, default: def, dimmed } = PIN_SPECS;
    expect(selected.width).toBeGreaterThan(hovered.width);
    expect(hovered.width).toBeGreaterThan(def.width);
    expect(def.width).toBeGreaterThan(dimmed.width);
  });

  it("ranks opacity selected/hovered (full) > default > dimmed", () => {
    const { selected, hovered, default: def, dimmed } = PIN_SPECS;
    expect(selected.opacity).toBe(1);
    expect(hovered.opacity).toBe(1);
    expect(def.opacity).toBeGreaterThan(dimmed.opacity);
    expect(dimmed.opacity).toBeGreaterThan(0);
  });
});

describe("teardropPinHtml", () => {
  it("renders the teardrop SVG at the requested size and opacity", () => {
    const html = teardropPinHtml(16, 22, 0.78, false);
    expect(html).toContain('width="16"');
    expect(html).toContain('height="22"');
    expect(html).toContain('fill-opacity="0.78"');
    expect(html).toContain("<path");
  });

  it("adds a white centre dot and drop shadow only when highlighted", () => {
    const highlighted = teardropPinHtml(20, 28, 1, true);
    expect(highlighted).toContain('<circle cx="10" cy="10" r="4" fill="white"');
    expect(highlighted).toContain("drop-shadow");

    const plain = teardropPinHtml(16, 22, 0.78, false);
    expect(plain).not.toContain("<circle");
    expect(plain).not.toContain("drop-shadow");
  });
});

// ---------------------------------------------------------------------------
// Cluster badge sizing
// ---------------------------------------------------------------------------

describe("clusterIconSpec", () => {
  it("uses the smallest badge for single-digit counts", () => {
    expect(clusterIconSpec(2)).toEqual({ size: 32, fontSize: 13 });
    expect(clusterIconSpec(9)).toEqual({ size: 32, fontSize: 13 });
  });

  it("steps up at 10", () => {
    expect(clusterIconSpec(10)).toEqual({ size: 40, fontSize: 14 });
    expect(clusterIconSpec(99)).toEqual({ size: 40, fontSize: 14 });
  });

  it("uses the largest badge for triple-digit counts", () => {
    expect(clusterIconSpec(100)).toEqual({ size: 48, fontSize: 15 });
    expect(clusterIconSpec(500)).toEqual({ size: 48, fontSize: 15 });
  });
});

// ---------------------------------------------------------------------------
// Clustering — buildClusterIndex / getClusterItems
// ---------------------------------------------------------------------------

function makeRestaurant(id: string, latitude: number | null, longitude: number | null): Restaurant {
  return {
    id,
    name: `Restaurant ${id}`,
    neighborhood: "Test",
    address: "Test address",
    telephone: "000",
    website: null,
    latitude: latitude as number,
    longitude: longitude as number,
    menus: [],
  };
}

const WORLD_BBOX: [number, number, number, number] = [-180, -85, 180, 85];

// Two physically separate "tight" clusters (~50m spread each, ~2.5km apart)
// plus one lone restaurant far from both. Empirically:
//   zoom 10 → the two groups merge into a single cluster of 9 + the lone pin
//   zoom 12 → the groups resolve into cluster(5) + cluster(4) + the lone pin
//   zoom 17 → every restaurant renders individually (above the configured maxZoom of 16)
const groupA = [
  makeRestaurant("a1", 41.3879, 2.159),
  makeRestaurant("a2", 41.388, 2.1592),
  makeRestaurant("a3", 41.3881, 2.1588),
  makeRestaurant("a4", 41.3878, 2.1593),
  makeRestaurant("a5", 41.3882, 2.1591),
];
const groupC = [
  makeRestaurant("c1", 41.409, 2.185),
  makeRestaurant("c2", 41.4091, 2.1852),
  makeRestaurant("c3", 41.4089, 2.1849),
  makeRestaurant("c4", 41.4092, 2.1851),
];
const loneRestaurant = makeRestaurant("b1", 41.43, 2.3);

const allRestaurants = [...groupA, ...groupC, loneRestaurant];

function ids(items: MapClusterItem[]): string[] {
  return items
    .filter((f) => !("cluster" in f.properties && f.properties.cluster))
    .map((f) => (f.properties as { restaurantId: string }).restaurantId)
    .sort();
}

function clusterCounts(items: MapClusterItem[]): number[] {
  return items
    .filter((f) => "cluster" in f.properties && f.properties.cluster)
    .map((f) => (f.properties as { point_count: number }).point_count)
    .sort((a, b) => a - b);
}

describe("buildClusterIndex", () => {
  it("excludes restaurants without coordinates", () => {
    const withMissingCoords = [...allRestaurants, makeRestaurant("no-coords", null, null)];
    const index = buildClusterIndex(withMissingCoords);
    const items = getClusterItems(index, WORLD_BBOX, 17, null);
    expect(ids(items)).not.toContain("no-coords");
    expect(ids(items)).toHaveLength(allRestaurants.length);
  });
});

describe("getClusterItems", () => {
  const index = buildClusterIndex(allRestaurants);

  it("groups nearby restaurants into a single cluster when zoomed out", () => {
    const items = getClusterItems(index, WORLD_BBOX, 10, null);
    expect(clusterCounts(items)).toEqual([9]);
    expect(ids(items)).toEqual(["b1"]);
  });

  it("splits into separate clusters as the user zooms in", () => {
    const items = getClusterItems(index, WORLD_BBOX, 12, null);
    expect(clusterCounts(items)).toEqual([4, 5]);
    expect(ids(items)).toEqual(["b1"]);
  });

  it("renders every restaurant individually above the clustering max zoom", () => {
    const items = getClusterItems(index, WORLD_BBOX, 17, null);
    expect(clusterCounts(items)).toEqual([]);
    expect(ids(items)).toEqual(allRestaurants.map((r) => r.id).sort());
  });

  it("leaves clusters intact when nothing is selected", () => {
    const items = getClusterItems(index, WORLD_BBOX, 12, null);
    expect(clusterCounts(items)).toEqual([4, 5]);
  });

  it("breaks open only the cluster containing the selected restaurant", () => {
    // a3 belongs to the 5-restaurant cluster; the 4-restaurant cluster (group C)
    // and the lone pin must stay untouched.
    const items = getClusterItems(index, WORLD_BBOX, 12, "a3");
    expect(clusterCounts(items)).toEqual([4]);
    expect(ids(items)).toEqual(["a1", "a2", "a3", "a4", "a5", "b1"]);
  });

  it("does nothing extra when the selected restaurant is not clustered", () => {
    // b1 is already rendered individually at zoom 12 — selecting it must not
    // change which clusters are shown.
    const items = getClusterItems(index, WORLD_BBOX, 12, "b1");
    expect(clusterCounts(items)).toEqual([4, 5]);
    expect(ids(items)).toEqual(["b1"]);
  });

  it("never returns a cluster that contains the selected restaurant", () => {
    for (const selected of allRestaurants) {
      for (const zoom of [9, 10, 11, 12, 13, 14]) {
        const items = getClusterItems(index, WORLD_BBOX, zoom, selected.id);
        for (const feature of items) {
          const props = feature.properties as { cluster?: true; cluster_id?: number };
          if (props.cluster) {
            const leaves = index.getLeaves(props.cluster_id!, Infinity);
            expect(leaves.some((leaf) => leaf.properties.restaurantId === selected.id)).toBe(false);
          }
        }
        // ...and the selected restaurant is always present as its own point.
        expect(ids(items)).toContain(selected.id);
      }
    }
  });
});
