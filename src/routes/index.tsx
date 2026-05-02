import { createFileRoute } from "@tanstack/react-router";
import "@/lib/maths-os/styles.css";
import { AuthProvider, useAuth } from "@/lib/maths-os/auth";
import { WindowsProvider } from "@/lib/maths-os/windows";
import { MathsOS } from "@/components/maths-os/MathsOS";
import { AuthScreen } from "@/components/maths-os/AuthScreen";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Maths OS — Unblocked Games & Apps" },
      { name: "description", content: "Maths OS — desktop with games, browser, friends and live chat. Powered by Maths Browse proxy." },
      { property: "og:title", content: "Maths OS" },
      { property: "og:description", content: "Unblocked games OS with apps, browser, friends and chat." },
      { property: "og:image", content: "/maths.png" },
    ],
    links: [
      { rel: "icon", href: "/maths.png", type: "image/png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400;500;600;700;800;900&family=JetBrains+Mono:wght@300;400;600&display=swap",
      },
    ],
  }),
  component: () => (
    <AuthProvider>
      <WindowsProvider>
        <Gate />
      </WindowsProvider>
    </AuthProvider>
  ),
});

function Gate() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#080810", color: "white", fontFamily: "Outfit, sans-serif" }}>
        <img src="/maths.png" alt="Maths" style={{ width: 64, height: 64, opacity: 0.9 }} />
      </div>
    );
  }
  if (!user) return <AuthScreen />;
  return <MathsOS />;
}
