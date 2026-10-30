import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 8,
          background: "#111315",
          color: "#ffffff",
          fontSize: 19,
          fontWeight: 900,
        }}
      >
        R
      </div>
    ),
    size,
  );
}
