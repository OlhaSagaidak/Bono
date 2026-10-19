"use client"; // Replaces the root layout when it fails, so it brings its own <html> and styles.

export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, padding: 16, textAlign: "center" }}>
        <main>
          <h1 style={{ fontSize: 24 }}>Bono is having trouble</h1>
          <p>Something went wrong on our side. Please try again in a moment.</p>
          <button type="button" onClick={retry} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#047857", color: "white", fontWeight: 600, cursor: "pointer" }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
