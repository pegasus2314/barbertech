import { ImageResponse } from "next/og";

// The card shown when a BarberTech link is shared on WhatsApp, Instagram, etc.
export const alt = "BarberTech — el sistema para tu barbería";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#171717",
          backgroundImage: "radial-gradient(circle at 85% 15%, rgba(199,161,90,0.28), transparent 45%)",
          padding: "72px 80px",
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "#c7a15a",
              color: "#171717",
              fontSize: 38,
              fontWeight: 900,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            B
          </div>
          <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: -1 }}>BarberTech</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 104, fontWeight: 900, lineHeight: 1, letterSpacing: -4, display: "flex", flexDirection: "column" }}>
            <span>Menos mensajes.</span>
            <span style={{ color: "#e2c17f" }}>Más citas.</span>
          </div>
          <div style={{ marginTop: 32, fontSize: 32, color: "rgba(255,255,255,0.62)", display: "flex" }}>
            Reservas online, agenda, clientes y finanzas para tu barbería.
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 26, color: "#c7a15a", fontWeight: 600 }}>
          6 días de prueba gratis · barbertech.site
        </div>
      </div>
    ),
    { ...size },
  );
}
