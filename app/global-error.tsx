"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary for errors thrown by the root layout itself. It
 * replaces the whole document, so it must render its own <html>/<body> and
 * cannot rely on globals.css or UI components — inline styles only.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Uncaught root layout error:", error);
  }, [error]);

  return (
    <html lang="it">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          margin: 0,
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
            Qualcosa è andato storto
          </h1>
          <p style={{ color: "#666", marginBottom: "1.5rem" }}>
            Si è verificato un errore imprevisto. Riprova più tardi.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: "0.375rem",
              border: "1px solid #ccc",
              background: "#fff",
              cursor: "pointer",
              font: "inherit",
            }}
          >
            Riprova
          </button>
        </div>
      </body>
    </html>
  );
}
