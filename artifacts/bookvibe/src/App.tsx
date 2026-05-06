import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { PhoneShell } from "@/components/PhoneShell";
import { Hero } from "@/components/Hero";
import { BottomNav } from "@/components/BottomNav";
import { SettingsModal } from "@/components/SettingsModal";
import { ChatsTab } from "@/tabs/ChatsTab";
import { ShelvesTab } from "@/tabs/ShelvesTab";
import { BookTab } from "@/tabs/BookTab";
import { TrackersTab } from "@/tabs/TrackersTab";
import { ProfileTab } from "@/tabs/ProfileTab";
import { AdminPanel } from "@/pages/AdminPanel";
import { ComponentDemo } from "@/pages/ComponentDemo";

const isAdminRoute = window.location.pathname.endsWith("/admin-panel-secret-777");
const isDemoRoute = window.location.pathname.endsWith("/demo");

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

type Tab = "chats" | "shelves" | "book" | "trackers" | "profile";
type Theme = "academia" | "romance" | "forest" | "contrast";

const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1476275466078-4007374efbbe?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=80",
];

function BookVibeApp() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>(() => {
    return (localStorage.getItem("bookvibe_tab") as Tab) || "book";
  });
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("bookvibe_theme") as Theme) || "academia";
  });
  const [heroImage] = useState(() => {
    return HERO_IMAGES[0];
  });
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("bookvibe_tab", tab);
  }, [tab]);

  const themeClass = theme === "contrast" ? "high-contrast" : `theme-${theme}`;

  const handleSetTheme = (th: Theme) => {
    setTheme(th);
    localStorage.setItem("bookvibe_theme", th);
  };

  const TAB_TITLES: Record<Tab, string> = {
    chats: t("chats"),
    shelves: t("shelves"),
    book: t("book"),
    trackers: t("trackers"),
    profile: t("profile"),
  };

  return (
    <div className={`app ${themeClass}`}>
      <PhoneShell>
        <Hero
          title={TAB_TITLES[tab]}
          onSettingsClick={() => setSettingsOpen(true)}
        />
        <div className="phone-shell-content">
          {tab === "chats" && <ChatsTab user={user} />}
          {tab === "shelves" && <ShelvesTab onSelectBook={() => setTab("book")} />}
          {tab === "book" && <BookTab />}
          {tab === "trackers" && <TrackersTab />}
          {tab === "profile" && <ProfileTab />}
        </div>
        <BottomNav activeTab={tab} onTabChange={setTab} />

        {settingsOpen && (
          <div style={{ position: "absolute", inset: 0, zIndex: 40, pointerEvents: "auto" }}>
            <SettingsModal
              open={settingsOpen}
              onClose={() => setSettingsOpen(false)}
              theme={theme}
              onThemeChange={handleSetTheme}
            />
          </div>
        )}
      </PhoneShell>
    </div>
  );
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const authState = useAuthState();
  return <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>;
}

export default function App() {
  // Configure API client to automatically attach JWT tokens
  setAuthTokenGetter(() => {
    try {
      const token = localStorage.getItem('bookvibe_token');
      return token || null;
    } catch {
      return null;
    }
  });

  if (isAdminRoute) {
    return <AdminPanel />;
  }

  if (isDemoRoute) {
    return <ComponentDemo />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LangProvider>
          <BookVibeApp />
          <Toaster />
        </LangProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
