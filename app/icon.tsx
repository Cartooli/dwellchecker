import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #e8b059, #c98a35)",
          color: "#1a1208",
          fontSize: 42,
          fontWeight: 900,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 14,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        D
      </div>
    ),
    { ...size }
  );
}
