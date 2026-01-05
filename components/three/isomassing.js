import React from "react";
import { View, Text } from "react-native";

export default function IsoMassing({ rooms = [], costs = {}, qs = {}, storeys = 1 }) {
  const PX_PER_M = 28;
  const WALL_H_M = 2.7;
  const isoScale = 0.75;
  const heightPx = WALL_H_M * 10; // visual height
  const originX = 40;
  const originY = 120;

  function money(n) {
    return `AUD $${Math.round(n || 0).toLocaleString("en-AU")}`;
  }
  function m2(x) {
    return `${(x || 0).toFixed(1)} m²`;
  }

  function isoPoint(x, y) {
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
      width: Math.max(1, w),
      height: Math.max(1, d),
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
      width: Math.max(1, w * 0.75),
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
      width: Math.max(1, d * 0.55),
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
    <View style={{ padding: 14 }}>
      <View
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "#E5E7EB",
          backgroundColor: "#F9FAFB",
          overflow: "hidden",
        }}
      >
        <View style={{ height: 320, position: "relative" }}>{blocks}</View>

        <View style={{ position: "absolute", left: 12, bottom: 12 }}>
          <View style={{ backgroundColor: "white", padding: 10, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB" }}>
            <Text style={{ fontWeight: "900", color: "#111827" }}>Total: {money(costs.styledTotal)}</Text>
            <Text style={{ color: "#6B7280", fontSize: 12 }}>
              Floor: {m2(qs.totalFloorArea_m2)} • Storeys: {storeys} • Height: {WALL_H_M}m
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
