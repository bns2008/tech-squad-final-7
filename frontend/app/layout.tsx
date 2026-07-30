import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "ER AI Studio – Convert ER Diagrams to Database Code",
  description:
    "Upload your ER Diagram and generate SQL, PostgreSQL, MySQL, SQLite, MongoDB, Prisma and more in seconds using AI.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: "var(--card)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                fontSize: "14px",
                fontFamily: "Inter, sans-serif",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              },
              success: {
                iconTheme: { primary: "#059669", secondary: "#ECFDF5" },
              },
              error: {
                iconTheme: { primary: "#DC2626", secondary: "#FEF2F2" },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
