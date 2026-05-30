import { ImageResponse } from "next/og";

// 180×180 — Apple touch icon for iOS home screen
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FAF8F3",
          // iOS clips to its own squircle shape, so no need for explicit radius
        }}
      >
        {/* ── Journal book ──────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            width: "62%",
            height: "68%",
            borderRadius: "10px",
            overflow: "hidden",
            boxShadow: "0 6px 20px rgba(200,169,110,0.28)",
          }}
        >
          {/* Spine */}
          <div
            style={{
              width: "18%",
              background: "#C8A96E",
              flexShrink: 0,
            }}
          />

          {/* Pages */}
          <div
            style={{
              flex: 1,
              background: "#FFFDF7",
              borderTop: "1px solid #EDD9A3",
              borderRight: "1px solid #EDD9A3",
              borderBottom: "1px solid #EDD9A3",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              justifyContent: "center",
              paddingLeft: "12%",
              paddingRight: "10%",
            }}
          >
            {/* Ruled lines */}
            <div style={{ width: "88%", height: "5px", background: "#E8D5B0", borderRadius: "3px", marginBottom: "7px" }} />
            <div style={{ width: "70%", height: "5px", background: "#E8D5B0", borderRadius: "3px", marginBottom: "7px" }} />
            <div style={{ width: "80%", height: "5px", background: "#E8D5B0", borderRadius: "3px", marginBottom: "12px" }} />

            {/* Sun circle */}
            <div
              style={{
                width: "26px",
                height: "26px",
                borderRadius: "50%",
                background: "#D4927A",
              }}
            />
          </div>
        </div>
      </div>
    ),
    { width: 180, height: 180 }
  );
}
