import { ImageResponse } from "next/og";

// 512×512 — Android uses this for home screen and splash screen
export const size = { width: 512, height: 512 };
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
          background: "#FAF8F3",
          // Rounded corners (iOS squircle-ish); Android Chrome clips to its own shape
          borderRadius: "23%",
        }}
      >
        {/* ── Journal book ────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            width: "58%",
            height: "66%",
            borderRadius: "18px",
            overflow: "hidden",
            boxShadow: "0 12px 40px rgba(200,169,110,0.30)",
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
              borderTop: "1.5px solid #EDD9A3",
              borderRight: "1.5px solid #EDD9A3",
              borderBottom: "1.5px solid #EDD9A3",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              justifyContent: "center",
              paddingLeft: "14%",
              paddingRight: "14%",
              gap: "0px",
            }}
          >
            {/* Ruled lines */}
            <div style={{ width: "88%", height: "11px", background: "#E8D5B0", borderRadius: "6px", marginBottom: "16px" }} />
            <div style={{ width: "72%", height: "11px", background: "#E8D5B0", borderRadius: "6px", marginBottom: "16px" }} />
            <div style={{ width: "82%", height: "11px", background: "#E8D5B0", borderRadius: "6px", marginBottom: "28px" }} />

            {/* Sun — two concentric circles in warm coral/gold */}
            <div
              style={{
                width: "62px",
                height: "62px",
                borderRadius: "50%",
                background: "#D4927A",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "#FAF8F3",
                  opacity: 0.4,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 512, height: 512 }
  );
}
