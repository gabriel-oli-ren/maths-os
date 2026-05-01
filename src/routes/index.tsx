import { createFileRoute } from "@tanstack/react-router";
import "@/lib/maths-os/styles.css";
import { AuthProvider, useAuth } from "@/lib/maths-os/auth";
import { MathsOS } from "@/components/maths-os/MathsOS";
import { AuthScreen } from "@/components/maths-os/AuthScreen";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Maths OS" },
      { name: "description", content: "Maths OS — desktop, games, friends and live chat." },
      { property: "og:title", content: "Maths OS" },
      { property: "og:description", content: "Desktop environment with games, friends and live chat." },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400;500;600;700;800;900&family=JetBrains+Mono:wght@300;400;600&display=swap",
      },
    ],
  }),
  component: () => (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  ),
});

function Gate() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#080810", color: "white", fontFamily: "Outfit, sans-serif" }}>
        Loading…
      </div>
    );
  }
  if (!user) return <AuthScreen />;
  return <MathsOS />;
}
