import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "40px",
        }}
      >
        {/* Journal book */}
        <div
          style={{
            background: "white",
            width: "62%",
            height: "70%",
            borderRadius: "14px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {/* Spine */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: "18%",
              background: "#fde68a",
              borderRadius: "14px 0 0 14px",
            }}
          />
          {/* Lines */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "7px",
              width: "58%",
              marginBottom: "6px",
            }}
          >
            <div
              style={{ width: "100%", height: "6px", background: "#fde68a", borderRadius: "3px" }}
            />
            <div
              style={{ width: "82%", height: "6px", background: "#fde68a", borderRadius: "3px" }}
            />
            <div
              style={{ width: "92%", height: "6px", background: "#fde68a", borderRadius: "3px" }}
            />
          </div>
          {/* Heart */}
          <div style={{ fontSize: "30px", color: "#f59e0b", lineHeight: 1 }}>
            ♥
          </div>
        </div>
        {/* Sun */}
        <div
          style={{
            position: "absolute",
            top: "14%",
            right: "12%",
            width: "44px",
            height: "44px",
            background: "#fef3c7",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "22px",
          }}
        >
          ☀
        </div>
      </div>
    ),
    size
  );
}
