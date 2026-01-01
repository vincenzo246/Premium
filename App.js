import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  PanResponder,
  Dimensions,
  Alert,
} from "react-native";

const SCREEN = Dimensions.get("window");

// =====================
// UNITS / GRID
// =====================
const PX_PER_M = 28;        // zoom (pixels per meter)
const GRID_M = 0.5;         // grid line spacing in meters
const SNAP_M = 0.1;         // snap increment
const WALL_H_M = 2.7;       // default wall height

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const roundTo = (v, step) => Math.round(v / step) * step;

const m = (x) => `${x.toFixed(2)} m`;
const m2 = (x) => `${x.toFixed(1)} m²`;

// =====================
// ROOM CATALOG
// (w_m, d_m in METERS)
// =====================
const ROOM_CATALOG = [
  { id: "bed", name: "Bedroom", w_m: 3.6, d_m: 3.6, icon: "🛏️" },
  { id: "master", name: "Master Bed", w_m: 4.2, d_m: 4.0, icon: "🛌" },
  { id: "ensuite", name: "Ensuite", w_m: 2.4, d_m: 2.0, icon: "🚿" },
  { id: "bath", name: "Bathroom", w_m: 2.4, d_m: 1.8, icon: "🛁" },
  { id: "living", name: "Living", w_m: 5.4, d_m: 4.2, icon: "🛋️" },
  { id: "kitchen", name: "Kitchen", w_m: 4.2, d_m: 3.6, icon: "🍳" },
  { id: "dining", name: "Dining", w_m: 3.6, d_m: 3.0, icon: "🍽️" },
  { id: "laundry", name: "Laundry", w_m: 2.4, d_m: 1.8, icon: "🧺" },
  { id: "pantry", name: "Pantry", w_m: 1.8, d_m: 1.6, icon: "🥫" },
  { id: "office", name: "Office", w_m: 3.0, d_m: 2.8, icon: "💻" },
  { id: "garage", name: "Garage", w_m: 6.0, d_m: 6.0, icon: "🚗" },
  { id: "corridor", name: "Corridor", w_m: 4.0, d_m: 1.2, icon: "🚪" },
  { id: "alfresco", name: "Alfresco", w_m: 4.5, d_m: 3.0, icon: "🌿" },
  { id: "balcony", name: "Balcony", w_m: 3.5, d_m: 2.0, icon: "🧱" },
  { id: "pool", name: "Pool (site)", w_m: 6.0, d_m: 3.0, icon: "🏊" },
  { id: "shed", name: "Shed (site)", w_m: 3.0, d_m: 2.4, icon: "🧰" },
];

// =====================
// TEMPLATES (simple)
// Rooms have x,y,w,d in meters
// =====================
const TEMPLATES = {
  starter: {
    name: "Starter",
    rooms: [
      { type: "living", x: 1.0, y: 1.0, w: 5.4, d: 4.2 },
      { type: "kitchen", x: 6.6, y: 1.0, w: 4.2, d: 3.6 },
      { type: "dining", x: 6.6, y: 4.7, w: 3.6, d: 3.0 },
      { type: "bed", x: 1.0, y: 5.5, w: 3.6, d: 3.6 },
      { type: "bath", x: 4.8, y: 5.7, w: 2.4, d: 1.8 },
      { type: "laundry", x: 4.8, y: 7.7, w: 2.4, d: 1.8 },
    ],
    building: { w_m: 12, d_m: 10 },
    storeys: 1,
  },
  family: {
    name: "Family",
    rooms: [
      { type: "living", x: 1.0, y: 1.0, w: 6.0, d: 4.8 },
      { type: "kitchen", x: 7.2, y: 1.0, w: 4.8, d: 3.6 },
      { type: "dining", x: 7.2, y: 4.8, w: 4.0, d: 3.0 },
      { type: "master", x: 1.0, y: 6.2, w: 4.2, d: 4.0 },
      { type: "ensuite", x: 5.4, y: 6.2, w: 2.4, d: 2.0 },
      { type: "bed", x: 8.2, y: 6.2, w: 3.6, d: 3.6 },
      { type: "bath", x: 8.2, y: 9.9, w: 2.4, d: 1.8 },
      { type: "laundry", x: 1.0, y: 10.4, w: 2.4, d: 1.8 },
      { type: "garage", x: 12.2, y: 1.0, w: 6.0, d: 6.0 },
    ],
    building: { w_m: 20, d_m: 14 },
    storeys: 1,
  },
  doubley: {
    name: "Double Storey",
    rooms: [
      { type: "living", x: 1.0, y: 1.0, w: 6.0, d: 5.0 },
      { type: "kitchen", x: 7.2, y: 1.0, w: 5.0, d: 3.6 },
      { type: "dining", x: 7.2, y: 4.8, w: 4.0, d: 3.0 },
      { type: "corridor", x: 1.0, y: 6.3, w: 6.0, d: 1.2 },
      { type: "garage", x: 12.5, y: 1.0, w: 6.0, d: 6.0 },
      { type: "alfresco", x: 1.0, y: 8.0, w: 5.0, d: 3.0 },
    ],
    building: { w_m: 22, d_m: 16 },
    storeys: 2,
  },
};

// =====================
// STYLES
// =====================
const STYLES = [
  { id: "modern", name: "Modern", multiplier: 1.05 },
  { id: "contemporary", name: "Contemporary", multiplier: 1.08 },
  { id: "traditional", name: "Traditional", multiplier: 1.12 },
  { id: "luxury", name: "Luxury", multiplier: 1.25 },
];

// =====================
// MATERIAL OPTIONS (simple)
// =====================
const MATERIALS = {
  wallSystem: [
    { id: "brick", name: "Brick veneer", priceKey: "brick_m2" },
    { id: "hebel", name: "Hebel/AAC", priceKey: "hebel_m2" },
    { id: "frame", name: "Frame + cladding", priceKey: "frame_m2" },
  ],
  floorFinish: [
    { id: "tile", name: "Tiles", priceKey: "floor_m2" },
    { id: "timber", name: "Timber", priceKey: "floor_m2" },
    { id: "vinyl", name: "Vinyl", priceKey: "floor_m2" },
  ],
  roofType: [
    { id: "flat", name: "Flat", priceKey: "roof_m2" },
    { id: "gable", name: "Gable", priceKey: "roof_m2" },
    { id: "skillion", name: "Skillion", priceKey: "roof_m2" },
  ],
};

// =====================
// DEFAULT PRICE TABLE (AUD)
// Users can override any of these.
// =====================
const DEFAULT_PRICES = {
  floor_m2: 65,     // supply+install allowance per m²
  wall_internal_m2: 18,
  roof_m2: 75,
  slab_m2: 95,
  windows_each: 650,
  doors_each: 420,
  brick_m2: 85,
  hebel_m2: 92,
  frame_m2: 55,
};

function calcQS(rooms, building, storeys) {
  // areas from placed rooms
  let totalFloorArea_m2 = 0;
  let totalWallLength_m = 0;

  const roomBreakdown = rooms.map((r) => {
    const area_m2 = r.w_m * r.d_m;
    const perimeter_m = 2 * (r.w_m + r.d_m);
    totalFloorArea_m2 += area_m2;
    totalWallLength_m += perimeter_m;
    return { type: r.type, area_m2, perimeter_m };
  });

  // use footprint as "site slab" (building W x D)
  const footprint_m2 = building.w_m * building.d_m;

  // wall area approx (internal partitions + some external allowance)
  // Very simple: wall area ~ wall length * height
  const wallArea_m2 = totalWallLength_m * WALL_H_M;

  // roof area approx: footprint * allowance
  const roofArea_m2 = footprint_m2 * 1.10;

  // slab area = footprint per storey (usually slab is ground only)
  const slabArea_m2 = footprint_m2;

  // storeys affect internal floor finish (more floors)
  const floorFinishArea_m2 = totalFloorArea_m2 * storeys;

  // simple openings estimate (upgrade later)
  const doors = Math.max(4, Math.round(rooms.length * 0.8));
  const windows = Math.max(6, Math.round(rooms.length * 1.2));

  return {
    roomBreakdown,
    footprint_m2,
    totalFloorArea_m2,
    floorFinishArea_m2,
    slabArea_m2,
    totalWallLength_m,
    wallArea_m2,
    roofArea_m2,
    doors,
    windows,
  };
}

// =====================
// SIMPLE COST ENGINE
// =====================
function calcCosts(qs, selections, prices, styleMultiplier) {
  const p = { ...DEFAULT_PRICES, ...prices };

  const wallSystem = selections.wallSystem; // brick/hebel/frame
  const wallKey =
    wallSystem === "brick"
      ? "brick_m2"
      : wallSystem === "hebel"
      ? "hebel_m2"
      : "frame_m2";

  const materials = [
    { name: "Slab (concrete)", qty: qs.slabArea_m2, unit: "m²", rate: p.slab_m2, cost: qs.slabArea_m2 * p.slab_m2 },
    { name: "Roof allowance", qty: qs.roofArea_m2, unit: "m²", rate: p.roof_m2, cost: qs.roofArea_m2 * p.roof_m2 },
    { name: "Floor finish", qty: qs.floorFinishArea_m2, unit: "m²", rate: p.floor_m2, cost: qs.floorFinishArea_m2 * p.floor_m2 },
    { name: `Walls (${wallSystem})`, qty: qs.wallArea_m2, unit: "m²", rate: p[wallKey], cost: qs.wallArea_m2 * p[wallKey] },
    { name: "Internal wall finish", qty: qs.wallArea_m2, unit: "m²", rate: p.wall_internal_m2, cost: qs.wallArea_m2 * p.wall_internal_m2 },
    { name: "Windows", qty: qs.windows, unit: "each", rate: p.windows_each, cost: qs.windows * p.windows_each },
    { name: "Doors", qty: qs.doors, unit: "each", rate: p.doors_each, cost: qs.doors * p.doors_each },
  ];

  const materialsSubtotal = materials.reduce((s, x) => s + x.cost, 0);

  const labour = materialsSubtotal * 0.40;
  const permits = materialsSubtotal * 0.02;
  const contingency = (materialsSubtotal + labour) * 0.10;

  const baseTotal = materialsSubtotal + labour + permits + contingency;
  const styledTotal = baseTotal * styleMultiplier;

  return {
    lineItems: materials,
    materialsSubtotal,
    labour,
    permits,
    contingency,
    baseTotal,
    styledTotal,
  };
}

// =====================
// UI HELPERS
// =====================
function money(n) {
  return `AUD $${Math.round(n).toLocaleString("en-AU")}`;
}

function TabButton({ active, label, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 14,
        backgroundColor: active ? "#111827" : "#F3F4F6",
      }}
    >
      <Text style={{ color: active ? "white" : "#111827", fontWeight: "700" }}>
        {label}
      </Text>
    </Pressable>
  );
}

function Card({ children }) {
  return (
    <View
      style={{
        backgroundColor: "white",
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        marginBottom: 12,
      }}
    >
      {children}
    </View>
  );
}

// =====================
// MAIN APP
// =====================
export default function App() {
  const [page, setPage] = useState("Plan"); // Plan, Materials, Style, QS+Cost, 3D
  const [building, setBuilding] = useState({ w_m: 18, d_m: 12 });
  const [storeys, setStoreys] = useState(1);
  
const [isDragging, setIsDragging] = useState(false);
  const [styleId, setStyleId] = useState("modern");

  const [selections, setSelections] = useState({
    wallSystem: "brick",
    floorFinish: "tile",
    roofType: "flat",
  });

  // user overrides
  const [priceOverrides, setPriceOverrides] = useState({});
const [selectedId, setSelectedId] = useState(null);

  // placed rooms
  const [rooms, setRooms] = useState([]);

  const styleMultiplier = useMemo(() => {
    const s = STYLES.find((x) => x.id === styleId);
    return s ? s.multiplier : 1.0;
  }, [styleId]);

  const qs = useMemo(() => calcQS(rooms, building, storeys), [rooms, building, storeys]);

  const costs = useMemo(
    () => calcCosts(qs, selections, priceOverrides, styleMultiplier),
    [qs, selections, priceOverrides, styleMultiplier]
  );

  const canvasRef = useRef(null);

  const canvas = useMemo(() => {
    // canvas size based on building, but clamp so it fits phone
    const w = clamp(building.w_m * PX_PER_M, 280, SCREEN.width - 24);
    const h = clamp(building.d_m * PX_PER_M, 240, 460);
    return { w, h };
  }, [building]);

  function addRoom(typeId) {
    const tpl = ROOM_CATALOG.find((r) => r.id === typeId);
    if (!tpl) return;

    setRooms((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        type: tpl.id,
        name: tpl.name,
        icon: tpl.icon,
        x_m: sround(0.5),
          
        y_m: 0.5,
        w_m: tpl.w_m,
        d_m: tpl.d_m,
        level: storeys >= 2 ? 1 : 1, // simple default to level 1 (ground)
      },
    ]);
  }

  // fix for typos: keep x,y snapped
  function sround(v) {
    return roundTo(v, SNAP_M);
  }

  function clearRooms() {
    Alert.alert("Clear rooms?", "This will remove all placed rooms.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: () => setRooms([]) },
    ]);
  }

  function loadTemplate(key) {
    const t = TEMPLATES[key];
    if (!t) return;

    setBuilding({ ...t.building });
    setStoreys(t.storeys);
    setRooms(
      t.rooms.map((r, i) => {
        const meta = ROOM_CATALOG.find((x) => x.id === r.type);
        return {
          id: Date.now() + i,
          type: r.type,
          name: meta?.name ?? r.type,
          icon: meta?.icon ?? "⬛",
          x_m: sround(r.x),
          y_m: sround(r.y),
          w_m: sround(r.w),
          d_m: sround(r.d),
          level: 1,
        };
      })
    );
  }

  // =====================
  // DRAG + RESIZE ROOMS
  // =====================
  function RoomBox({ room }) {
    const px = room.x_m * PX_PER_M;
    const py = room.y_m * PX_PER_M;
    const pw = room.w_m * PX_PER_M;
    const ph = room.d_m * PX_PER_M;

    const startRef = useRef({ x: 0, y: 0, w: 0, d: 0 });

    const dragPan = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          startRef.current = { x: room.x_m, y: room.y_m, w: room.w_m, d: room.d_m };
        },
        onPanResponderMove: (_, g) => {
          const dx_m = g.dx / PX_PER_M;
          const dy_m = g.dy / PX_PER_M;
          const nx = sround(startRef.current.x + dx_m);
          const ny = sround(startRef.current.y + dy_m);

          // clamp in building
          const maxX = building.w_m - room.w_m;
          const maxY = building.d_m - room.d_m;

          setRooms((prev) =>
            prev.map((r) =>
              r.id === room.id
                ? { ...r, x_m: clamp(nx, 0, maxX), y_m: clamp(ny, 0, maxY) }
                : r
            )
          );
        },
      })
    ).current;

    const resizePan = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          startRef.current = { x: room.x_m, y: room.y_m, w: room.w_m, d: room.d_m };
        },
        onPanResponderMove: (_, g) => {
          const dw_m = g.dx / PX_PER_M;
          const dd_m = g.dy / PX_PER_M;

          const nw = clamp(sround(startRef.current.w + dw_m), 1.0, building.w_m);
          const nd = clamp(sround(startRef.current.d + dd_m), 1.0, building.d_m);

          // clamp position + size inside building
          const maxW = building.w_m - room.x_m;
          const maxD = building.d_m - room.y_m;

          setRooms((prev) =>
            prev.map((r) =>
              r.id === room.id
                ? { ...r, w_m: clamp(nw, 1.0, maxW), d_m: clamp(nd, 1.0, maxD) }
                : r
            )
          );
        },
      })
    ).current;

    return (
      <View
        {...dragPan.panHandlers}
        style={{
          position: "absolute",
          left: px,
          top: py,
          width: pw,
          height: ph,
          backgroundColor: "rgba(17,24,39,0.08)",
          borderColor: "#111827",
          borderWidth: 1,
          borderRadius: 10,
          padding: 6,
          justifyContent: "space-between",
        }}
      >
        <View>
          <Text style={{ fontWeight: "800", color: "#111827" }}>
            {room.icon} {room.name}
          </Text>
          <Text style={{ color: "#374151", fontSize: 12 }}>
            {m(room.w_m)} × {m(room.d_m)}  •  {m2(room.w_m * room.d_m)}
          </Text>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
          <Pressable
            onPress={() => setRooms((prev) => prev.filter((r) => r.id !== room.id))}
            style={{
              backgroundColor: "rgba(239,68,68,0.12)",
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: "rgba(239,68,68,0.35)",
            }}
          >
            <Text style={{ color: "#B91C1C", fontWeight: "800" }}>Delete</Text>
          </Pressable>

          <View
            {...resizePan.panHandlers}
            style={{
              width: 18,
              height: 18,
              borderRadius: 6,
              backgroundColor: "#111827",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "white", fontWeight: "900", fontSize: 12 }}>↘</Text>
          </View>
        </View>
      </View>
    );
  }

  // =====================
  // GRID BACKGROUND
  // =====================
  function GridBackground() {
    const stepPx = GRID_M * PX_PER_M;
    const cols = Math.floor(canvas.w / stepPx);
    const rows = Math.floor(canvas.h / stepPx);

    const lines = [];
    for (let c = 0; c <= cols; c++) {
      lines.push(
        <View
          key={`v${c}`}
          style={{
            position: "absolute",
            left: c * stepPx,
            top: 0,
            width: 1,
            height: canvas.h,
            backgroundColor: "rgba(17,24,39,0.08)",
          }}
        />
      );
    }
    for (let r = 0; r <= rows; r++) {
      lines.push(
        <View
          key={`h${r}`}
          style={{
            position: "absolute",
            left: 0,
            top: r * stepPx,
            width: canvas.w,
            height: 1,
            backgroundColor: "rgba(17,24,39,0.08)",
          }}
        />
      );
    }
    return <View style={{ position: "absolute", left: 0, top: 0, width: canvas.w, height: canvas.h }}>{lines}</View>;
  }

  // =====================
  // 3D MASSING (NO 3D LIBS)
  // Isometric projection using transforms.
  // =====================
  function IsoMassing() {
    // A simple “architectural massing” view:
    // Each room becomes a block (top + two sides) in isometric.
    // Not photoreal – but looks legit and proves the concept.

    const isoScale = 0.75;
    const heightPx = WALL_H_M * 10; // visual height (not 1:1)
    const originX = 40;
    const originY = 120;

    function isoPoint(x, y) {
      // basic isometric mapping
      const ix = (x - y) * 0.7;
      const iy = (x + y) * 0.35;
      return { ix, iy };
    }

    const blocks = rooms.map((r) => {
      const x = r.x_m * PX_PER_M;
      const y = r.y_m * PX_PER_M;
      const w = r.w_m * PX_PER_M;
      const d = r.d_m * PX_PER_M;

      const p = isoPoint(x, y);
      const topLeft = { x: originX + p.ix, y: originY + p.iy };

      const topStyle = {
        position: "absolute",
        left: topLeft.x,
        top: topLeft.y,
        width: w,
        height: d,
        backgroundColor: "rgba(17,24,39,0.10)",
        borderWidth: 1,
        borderColor: "rgba(17,24,39,0.35)",
        transform: [
          { scaleX: isoScale },
          { scaleY: isoScale },
          { skewX: "-25deg" },
          { rotateZ: "45deg" },
        ],
        borderRadius: 6,
      };

      const sideA = {
        position: "absolute",
        left: topLeft.x + (w * isoScale) * 0.35,
        top: topLeft.y + (d * isoScale) * 0.55,
        width: w * 0.75,
        height: heightPx,
        backgroundColor: "rgba(17,24,39,0.16)",
        borderWidth: 1,
        borderColor: "rgba(17,24,39,0.25)",
        transform: [{ skewY: "20deg" }],
        borderRadius: 6,
      };

      const sideB = {
        position: "absolute",
        left: topLeft.x - (d * isoScale) * 0.15,
        top: topLeft.y + (d * isoScale) * 0.55,
        width: d * 0.55,
        height: heightPx,
        backgroundColor: "rgba(17,24,39,0.12)",
        borderWidth: 1,
        borderColor: "rgba(17,24,39,0.22)",
        transform: [{ skewY: "-18deg" }],
        borderRadius: 6,
      };

      return (
        <View key={r.id} style={{ position: "absolute", left: 0, top: 0 }}>
          <View style={sideB} />
          <View style={sideA} />
          <View style={topStyle} />
        </View>
      );
    });

    return (
      <Card>
        <Text style={{ fontWeight: "900", fontSize: 16, marginBottom: 6, color: "#111827" }}>
          3D Preview (Architectural massing)
        </Text>
        <Text style={{ color: "#6B7280", marginBottom: 10 }}>
          This is a clean massing model driven by your plan (no heavy 3D libraries in Snack). Expo will upgrade this to true 3D.
        </Text>

        <View
          style={{
            height: 320,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#E5E7EB",
            backgroundColor: "#F9FAFB",
            overflow: "hidden",
          }}
        >
          {blocks}

          <View style={{ position: "absolute", left: 12, bottom: 12, backgroundColor: "white", padding: 10, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB" }}>
            <Text style={{ fontWeight: "900", color: "#111827" }}>
              Total: {money(costs.styledTotal)}
            </Text>
            <Text style={{ color: "#6B7280", fontSize: 12 }}>
              Floor: {m2(qs.totalFloorArea_m2)} • Storeys: {storeys} • Height: {WALL_H_M}m
            </Text>
          </View>
        </View>
      </Card>
    );
  }

  // =====================
  // PRICE EDITOR
  // =====================
  function PriceRow({ label, k, unit }) {
    const val = (priceOverrides[k] ?? DEFAULT_PRICES[k])?.toString?.() ?? "";
    return (
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "800", color: "#111827" }}>{label}</Text>
          <Text style={{ color: "#6B7280", fontSize: 12 }}>{unit}</Text>
        </View>
        <View style={{ width: 120 }}>
          <TextInput
            value={val}
            onChangeText={(t) => {
              const n = Number(String(t).replace(/[^0-9.]/g, ""));
              if (Number.isFinite(n)) setPriceOverrides((p) => ({ ...p, [k]: n }));
              else if (t === "") setPriceOverrides((p) => ({ ...p, [k]: "" }));
            }}
            keyboardType="numeric"
            style={{
              borderWidth: 1,
              borderColor: "#E5E7EB",
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              backgroundColor: "white",
              textAlign: "right",
              fontWeight: "800",
              color: "#111827",
            }}
          />
        </View>
      </View>
    );
  }

  // =====================
  // PAGE CONTENTS
  // =====================
  function PlanPage() {
    return (
      <View style={{ padding: 12 }}>

  <Card>
    <Text style={{ fontWeight: "900", fontSize: 22, color: "#111827" }}>
      Builder Planner Prototype
    </Text>

    <Text style={{ color: "#6B7280", marginTop: 6 }}>
      Drag/resize rooms in metres → QS + totals update live.
    </Text>
  </Card>

</View>


      
      
        
          
            Drag/resize rooms in metres → QS + totals update live. (Prices editable + user overrides supported.)
          </Text>
        </Card>

        <Card>
          <Text style={{ fontWeight: "900", fontSize: 16, color: "#111827" }}>Building</Text>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#6B7280", marginBottom: 6 }}>Width (m)</Text>
              <TextInput
                value={String(building.w_m)}
                onChangeText={(t) => setBuilding((b) => ({ ...b, w_m: clamp(Number(t || 0), 6, 60) }))}
                keyboardType="numeric"
                style={styles.input}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ color: "#6B7280", marginBottom: 6 }}>Depth (m)</Text>
              <TextInput
                value={String(building.d_m)}
                onChangeText={(t) => setBuilding((b) => ({ ...b, d_m: clamp(Number(t || 0), 6, 60) }))}
                keyboardType="numeric"
                style={styles.input}
              />
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            <Pressable
              onPress={() => setStoreys(1)}
              style={[styles.pill, storeys === 1 && styles.pillActive]}
            >
              <Text style={[styles.pillText, storeys === 1 && styles.pillTextActive]}>1 Storey</Text>
            </Pressable>
            <Pressable
              onPress={() => setStoreys(2)}
              style={[styles.pill, storeys === 2 && styles.pillActive]}
            >
              <Text style={[styles.pillText, storeys === 2 && styles.pillTextActive]}>2 Storey</Text>
            </Pressable>
          </View>

          <View style={{ marginTop: 12, flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: "#6B7280" }}>Grid {SNAP_M}m snap</Text>
            <Text style={{ fontWeight: "900", color: "#111827" }}>
              Footprint: {m2(building.w_m * building.d_m)}
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            <Pressable onPress={clearRooms} style={[styles.btn, { backgroundColor: "#F3F4F6" }]}>
              <Text style={{ fontWeight: "900", color: "#111827" }}>Clear rooms</Text>
            </Pressable>
          </View>
        </Card>

        <Card>
          <Text style={{ fontWeight: "900", fontSize: 16, color: "#111827", marginBottom: 10 }}>
            Templates (tap to load)
          </Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {Object.keys(TEMPLATES).map((k) => (
              <Pressable
                key={k}
                onPress={() => loadTemplate(k)}
                style={[styles.btn, { backgroundColor: "#111827" }]}
              >
                <Text style={{ fontWeight: "900", color: "white" }}>{TEMPLATES[k].name}</Text>
              </Pressable>
            ))}
          </View>
        </Card>

        <Card>
          <Text style={{ fontWeight: "900", fontSize: 16, color: "#111827" }}>Floor Plan</Text>
          <Text style={{ color: "#6B7280", marginTop: 6 }}>
            Drag rooms. Use ↘ handle to resize. Everything is in metres.
          </Text>

          <View
            ref={canvasRef}
            style={{
              marginTop: 12,
              width: canvas.w,
              height: canvas.h,
              borderRadius: 16,
              overflow: "hidden",
              backgroundColor: "#F9FAFB",
              borderWidth: 1,
              borderColor: "#E5E7EB",
            }}
          >
            <GridBackground />

            {/* boundary */}
            <View
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: canvas.w,
                height: canvas.h,
                borderWidth: 2,
                borderColor: "rgba(17,24,39,0.25)",
                borderRadius: 16,
              }}
            />

            {rooms.map((r) => (
              <RoomBox key={r.id} room={r} />
            ))}
          </View>

          <View style={{ marginTop: 10, flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: "#6B7280" }}>Rooms: {rooms.length}</Text>
            <Text style={{ fontWeight: "900", color: "#111827" }}>Area: {m2(qs.totalFloorArea_m2)}</Text>
          </View>
        </Card>

        <Card>
          <Text style={{ fontWeight: "900", fontSize: 16, color: "#111827" }}>Add rooms</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
            {ROOM_CATALOG.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => {
                  // safe add in-bounds
                  setRooms((prev) => [
                    ...prev,
                    {
                      id: Date.now() + Math.random(),
                      type: r.id,
                      name: r.name,
                      icon: r.icon,
                      x_m: 0.5,
                      y_m: 0.5,
                      w_m: r.w_m,
                      d_m: r.d_m,
                      level: 1,
                    },
                  ]);
                }}
                style={[styles.roomChip]}
              >
                <Text style={{ fontWeight: "900", color: "#111827" }}>
                  {r.icon} {r.name}
                </Text>
                <Text style={{ color: "#6B7280", fontSize: 12 }}>
                  {m(r.w_m)} × {m(r.d_m)}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>
      </ScrollView>
    );
  }

  function MaterialsPage() {
    function pick(group, id) {
      setSelections((s) => ({ ...s, [group]: id }));
    }

    function Option({ active, title, subtitle, onPress }) {
      return (
        <Pressable
          onPress={onPress}
          style={{
            borderWidth: 2,
            borderColor: active ? "#111827" : "#E5E7EB",
            borderRadius: 16,
            padding: 12,
            backgroundColor: "white",
            flex: 1,
            minWidth: 150,
          }}
        >
          <Text style={{ fontWeight: "900", color: "#111827" }}>{title}</Text>
          <Text style={{ color: "#6B7280", marginTop: 4, fontSize: 12 }}>{subtitle}</Text>
        </Pressable>
      );
    }

    return (
      <ScrollView scrollEnabled={false}{{ padding: 12, paddingBottom: 40 }}>
        <Card>
          <Text style={{ fontWeight: "900", fontSize: 20, color: "#111827" }}>Select Materials</Text>
          <Text style={{ color: "#6B7280", marginTop: 6 }}>
            Defaults are realistic allowances. Users can override any price.
          </Text>
        </Card>

        <Card>
          <Text style={{ fontWeight: "900", fontSize: 16, color: "#111827", marginBottom: 10 }}>Wall System</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {MATERIALS.wallSystem.map((o) => (
              <Option
                key={o.id}
                active={selections.wallSystem === o.id}
                title={o.name}
                subtitle={`Rate uses ${o.priceKey}`}
                onPress={() => pick("wallSystem", o.id)}
              />
            ))}
          </View>
        </Card>

        <Card>
          <Text style={{ fontWeight: "900", fontSize: 16, color: "#111827", marginBottom: 10 }}>Floor Finish</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {MATERIALS.floorFinish.map((o) => (
              <Option
                key={o.id}
                active={selections.floorFinish === o.id}
                title={o.name}
                subtitle="Rate uses floor_m2"
                onPress={() => pick("floorFinish", o.id)}
              />
            ))}
          </View>
        </Card>

        <Card>
          <Text style={{ fontWeight: "900", fontSize: 16, color: "#111827", marginBottom: 10 }}>Roof Type</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {MATERIALS.roofType.map((o) => (
              <Option
                key={o.id}
                active={selections.roofType === o.id}
                title={o.name}
                subtitle="Rate uses roof_m2"
                onPress={() => pick("roofType", o.id)}
              />
            ))}
          </View>
        </Card>

        <Card>
          <Text style={{ fontWeight: "900", fontSize: 16, color: "#111827", marginBottom: 10 }}>
            Price Overrides (user can edit)
          </Text>

          <PriceRow label="Slab" k="slab_m2" unit="AUD / m²" />
          <PriceRow label="Roof" k="roof_m2" unit="AUD / m²" />
          <PriceRow label="Floor finish" k="floor_m2" unit="AUD / m²" />
          <PriceRow label="Internal wall finish" k="wall_internal_m2" unit="AUD / m²" />
          <PriceRow label="Brick wall system" k="brick_m2" unit="AUD / m²" />
          <PriceRow label="Hebel/AAC system" k="hebel_m2" unit="AUD / m²" />
          <PriceRow label="Frame+cladding system" k="frame_m2" unit="AUD / m²" />
          <PriceRow label="Windows" k="windows_each" unit="AUD / each" />
          <PriceRow label="Doors" k="doors_each" unit="AUD / each" />

          <Pressable
            onPress={() => setPriceOverrides({})}
            style={[styles.btn, { backgroundColor: "#F3F4F6" }]}
          >
            <Text style={{ fontWeight: "900", color: "#111827" }}>Reset to defaults</Text>
          </Pressable>
        </Card>
      </ScrollView>
    );
  }

  function StylePage() {
    return (
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }}>
        <Card>
          <Text style={{ fontWeight: "900", fontSize: 20, color: "#111827" }}>Design Style</Text>
          <Text style={{ color: "#6B7280", marginTop: 6 }}>
            Styles apply a multiplier to reflect finishing/spec level.
          </Text>
        </Card>

        <Card>
          <Text style={{ fontWeight: "900", fontSize: 16, color: "#111827", marginBottom: 10 }}>
            Architectural Style
          </Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {STYLES.map((s) => {
              const active = styleId === s.id;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => setStyleId(s.id)}
                  style={{
                    flex: 1,
                    minWidth: 160,
                    padding: 12,
                    borderRadius: 16,
                    borderWidth: 2,
                    borderColor: active ? "#111827" : "#E5E7EB",
                    backgroundColor: "white",
                  }}
                >
                  <Text style={{ fontWeight: "900", color: "#111827" }}>{s.name}</Text>
                  <Text style={{ color: "#6B7280", marginTop: 4 }}>
                    Multiplier: {s.multiplier.toFixed(2)}×
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Card>
          <Text style={{ fontWeight: "900", fontSize: 16, color: "#111827" }}>Quick summary</Text>
          <Text style={{ color: "#6B7280", marginTop: 8 }}>
            Style multiplier affects total cost: <Text style={{ fontWeight: "900", color: "#111827" }}>{styleMultiplier.toFixed(2)}×</Text>
          </Text>
          <Text style={{ color: "#6B7280", marginTop: 6 }}>
            Final total currently: <Text style={{ fontWeight: "900", color: "#111827" }}>{money(costs.styledTotal)}</Text>
          </Text>
        </Card>
      </ScrollView>
    );
  }

  function QSCostPage() {
    return (
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }}>
        <Card>
          <Text style={{ fontWeight: "900", fontSize: 20, color: "#111827" }}>QS + Cost Estimate</Text>
          <Text style={{ color: "#6B7280", marginTop: 6 }}>
            Quantities come from your plan (rooms + footprint). Edit prices in Materials tab.
          </Text>
        </Card>

        <Card>
          <Text style={{ fontWeight: "900", fontSize: 16, color: "#111827", marginBottom: 8 }}>
            Key quantities
          </Text>

          <Text style={styles.q}>Footprint: <Text style={styles.qb}>{m2(qs.footprint_m2)}</Text></Text>
          <Text style={styles.q}>Total room area: <Text style={styles.qb}>{m2(qs.totalFloorArea_m2)}</Text></Text>
          <Text style={styles.q}>Floor finish area (storeys): <Text style={styles.qb}>{m2(qs.floorFinishArea_m2)}</Text></Text>
          <Text style={styles.q}>Wall area (approx): <Text style={styles.qb}>{m2(qs.wallArea_m2)}</Text></Text>
          <Text style={styles.q}>Roof area (allowance): <Text style={styles.qb}>{m2(qs.roofArea_m2)}</Text></Text>
          <Text style={styles.q}>Windows: <Text style={styles.qb}>{qs.windows}</Text></Text>
          <Text style={styles.q}>Doors: <Text style={styles.qb}>{qs.doors}</Text></Text>
        </Card>

        <Card>
          <Text style={{ fontWeight: "900", fontSize: 16, color: "#111827", marginBottom: 10 }}>
            Material quantities & cost
          </Text>

          {costs.lineItems.map((li, idx) => (
            <View key={idx} style={{ paddingVertical: 10, borderBottomWidth: idx === costs.lineItems.length - 1 ? 0 : 1, borderColor: "#E5E7EB" }}>
              <Text style={{ fontWeight: "900", color: "#111827" }}>{li.name}</Text>
              <Text style={{ color: "#6B7280", marginTop: 4 }}>
                {li.qty.toFixed(1)} {li.unit} @ {money(li.rate)} / {li.unit}
              </Text>
              <Text style={{ marginTop: 4, fontWeight: "900", color: "#111827" }}>{money(li.cost)}</Text>
            </View>
          ))}
        </Card>

        <Card>
          <Text style={{ fontWeight: "900", fontSize: 16, color: "#111827", marginBottom: 10 }}>
            Summary
          </Text>

          <Row label="Materials subtotal" value={money(costs.materialsSubtotal)} />
          <Row label="Labour (40%)" value={money(costs.labour)} />
          <Row label="Permits & fees (2%)" value={money(costs.permits)} />
          <Row label="Contingency (10%)" value={money(costs.contingency)} />
          <View style={{ height: 1, backgroundColor: "#E5E7EB", marginVertical: 10 }} />
          <Row label="Base total" value={money(costs.baseTotal)} bold />
          <Row label={`Style (${styleMultiplier.toFixed(2)}×)`} value={money(costs.styledTotal)} bold big />

          <Text style={{ color: "#6B7280", marginTop: 10, fontSize: 12 }}>
            * Estimate only. Users can override prices. Final costs depend on location, engineering, council, and contractor quotes.
          </Text>
        </Card>
      </ScrollView>
    );
  }

  function ThreeDPage() {
    return (
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }}>
        <IsoMassing />

        <Card>
          <Text style={{ fontWeight: "900", fontSize: 16, color: "#111827" }}>Final Product</Text>
          <Text style={{ color: "#6B7280", marginTop: 8 }}>
            ✅ Plan + Rooms (drag/resize, metres){"\n"}
            ✅ Materials + user price overrides{"\n"}
            ✅ QS + cost engine (quantities → totals){"\n"}
            ✅ 3D massing preview (Snack-safe)
          </Text>

          <View style={{ marginTop: 14, padding: 14, borderRadius: 16, backgroundColor: "#111827" }}>
            <Text style={{ color: "white", fontWeight: "900", fontSize: 20 }}>
              TOTAL: {money(costs.styledTotal)}
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.8)", marginTop: 4 }}>
              This is V1 prototype complete in Snack. Next: true 3D/5D engine in Expo.
            </Text>
          </View>
        </Card>
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F3F4F6" }}>
      {/* top tabs */}
      <View style={{ paddingTop: 42, paddingHorizontal: 12, paddingBottom: 12, backgroundColor: "#F3F4F6" }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <TabButton active={page === "Plan"} label="Plan" onPress={() => setPage("Plan")} />
          <TabButton active={page === "Materials"} label="Materials" onPress={() => setPage("Materials")} />
          <TabButton active={page === "Style"} label="Style" onPress={() => setPage("Style")} />
          <TabButton active={page === "QS+Cost"} label="QS+Cost" onPress={() => setPage("QS+Cost")} />
          <TabButton active={page === "3D"} label="3D" onPress={() => setPage("3D")} />
        </View>
      </View>

      {/* pages */}
      <View style={{ flex: 1 }}>
        {page === "Plan" && <PlanPage />}
        {page === "Materials" && <MaterialsPage />}
        {page === "Style" && <StylePage />}
        {page === "QS+Cost" && <QSCostPage />}
        {page === "3D" && <ThreeDPage />}
      </View>
    </View>
  );
}

function Row({ label, value, bold, big }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
      <Text style={{ color: "#111827", fontWeight: bold ? "900" : "700", fontSize: big ? 16 : 14 }}>
        {label}
      </Text>
      <Text style={{ color: "#111827", fontWeight: bold ? "900" : "800", fontSize: big ? 16 : 14 }}>
        {value}
      </Text>
    </View>
  );
}

const styles = {
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "white",
    fontWeight: "900",
    color: "#111827",
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignSelf: "flex-start",
  },
  pill: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  pillActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  pillText: {
    fontWeight: "900",
    color: "#111827",
  },
  pillTextActive: {
    color: "white",
  },
  roomChip: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 12,
    minWidth: 150,
  },
  q: { color: "#6B7280", marginTop: 6, fontSize: 14 },
  qb: { color: "#111827", fontWeight: "900" },
};
