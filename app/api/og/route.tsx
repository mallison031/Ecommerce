import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const title = searchParams.get("title") || "Aura Store";
    const price = searchParams.get("price") || "";
    const sector = searchParams.get("sector") || "Curated Lifestyle";
    const badge = searchParams.get("badge") || "Official Collection";

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "space-between",
            backgroundColor: "#090d16",
            padding: "60px 80px",
            color: "white",
            fontFamily: "system-ui, sans-serif",
            position: "relative",
          }}
        >
          {/* Radial ambient lighting */}
          <div
            style={{
              position: "absolute",
              top: "-10%",
              right: "-5%",
              width: "550px",
              height: "550px",
              background: "radial-gradient(circle, rgba(236, 72, 153, 0.3) 0%, rgba(0,0,0,0) 70%)",
              borderRadius: "50%",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "-10%",
              left: "15%",
              width: "500px",
              height: "500px",
              background: "radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, rgba(0,0,0,0) 70%)",
              borderRadius: "50%",
            }}
          />

          {/* Brand Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              zIndex: 10,
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "26px",
                fontWeight: 900,
                color: "#ffffff",
              }}
            >
              A
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: "28px",
                  fontWeight: 900,
                  letterSpacing: "-0.5px",
                  color: "#ffffff",
                }}
              >
                AURA STORE
              </span>
              <span
                style={{
                  fontSize: "12px",
                  color: "#94a3b8",
                  letterSpacing: "1.5px",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                Nigeria&apos;s Multi-Sector Marketplace
              </span>
            </div>
          </div>

          {/* Main Content */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "18px",
              zIndex: 10,
              maxWidth: "920px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "1.5px",
                  padding: "6px 16px",
                  borderRadius: "9999px",
                  background: "rgba(236, 72, 153, 0.18)",
                  color: "#f472b6",
                  border: "1px solid rgba(236, 72, 153, 0.35)",
                }}
              >
                {sector}
              </span>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  padding: "6px 14px",
                  borderRadius: "9999px",
                  background: "rgba(255, 255, 255, 0.08)",
                  color: "#cbd5e1",
                }}
              >
                {badge}
              </span>
            </div>

            <h1
              style={{
                fontSize: title.length > 35 ? "44px" : "56px",
                fontWeight: 900,
                lineHeight: 1.15,
                color: "#f8fafc",
                margin: 0,
                letterSpacing: "-1px",
              }}
            >
              {title}
            </h1>

            {price && (
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "14px",
                  marginTop: "6px",
                }}
              >
                <span
                  style={{
                    fontSize: "44px",
                    fontWeight: 900,
                    color: "#34d399",
                    letterSpacing: "-1px",
                  }}
                >
                  {price}
                </span>
                <span style={{ fontSize: "16px", color: "#94a3b8", fontWeight: 500 }}>
                  Same-Day Lagos &bull; Nationwide Courier &bull; Paystack Verified
                </span>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
              zIndex: 10,
              borderTop: "1px solid rgba(255, 255, 255, 0.12)",
              paddingTop: "24px",
            }}
          >
            <span style={{ fontSize: "15px", color: "#94a3b8" }}>
              Shop safely at <strong style={{ color: "#f1f5f9" }}>aurastore.ng</strong> &bull; 100% Authentic Guaranteed
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "14px",
                fontWeight: 700,
                color: "#ffffff",
                background: "rgba(255, 255, 255, 0.1)",
                padding: "8px 20px",
                borderRadius: "10px",
              }}
            >
              Explore Collection &rarr;
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch {
    return new Response("Failed to generate dynamic image", { status: 500 });
  }
}
