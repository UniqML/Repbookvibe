import { useState } from "react";
import { BookCard } from "@/components/BookCard";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ChatInterface } from "@/components/ChatInterface";
import { BookSearch } from "@/components/BookSearch";

type Tab = "chats" | "shelves" | "add" | "trackers" | "profile";
type DemoView = "cards" | "chat" | "search";

const DEMO_BOOKS = [
  {
    id: "1",
    title: "The Midnight Library",
    author: "Matt Haig",
    cover: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=200&q=60",
    rating: 4.5,
    reviewPreview: "A beautiful story about second chances and the infinite possibilities of life.",
    genres: ["Fiction", "Fantasy", "Philosophy"],
    isFavorite: true,
  },
  {
    id: "2",
    title: "Atomic Habits",
    author: "James Clear",
    cover: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=200&q=60",
    rating: 4.8,
    reviewPreview: "Practical strategies for forming good habits and breaking bad ones.",
    genres: ["Self-Help", "Psychology"],
    isFavorite: false,
  },
  {
    id: "3",
    title: "Where the Crawdads Sing",
    author: "Delia Owens",
    cover: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=200&q=60",
    rating: 4.6,
    reviewPreview: "A hauntingly beautiful tale of isolation, nature, and mystery in the marshlands.",
    genres: ["Fiction", "Mystery", "Romance"],
    isFavorite: false,
  },
];

const DEMO_MESSAGES = [
  {
    id: "1",
    text: "Has anyone read The Midnight Library? I just started it!",
    author: "Emma",
    authorAvatarSeed: "emma123",
    timestamp: new Date(Date.now() - 3600000),
    isMe: false,
  },
  {
    id: "2",
    text: "Yes! It's one of my favorites. The concept of exploring different lives is so fascinating.",
    author: "You",
    timestamp: new Date(Date.now() - 3000000),
    isMe: true,
  },
  {
    id: "3",
    text: "I'm reading it too! Check out this recommendation:",
    author: "Alex",
    authorAvatarSeed: "alex456",
    timestamp: new Date(Date.now() - 2400000),
    isMe: false,
    bookReference: {
      title: "The Invisible Life of Addie LaRue",
      author: "V.E. Schwab",
      cover: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=100&q=60",
    },
  },
  {
    id: "4",
    text: "Oh that looks great! Adding it to my list.",
    author: "Emma",
    authorAvatarSeed: "emma123",
    timestamp: new Date(Date.now() - 1800000),
    isMe: false,
  },
];

export function ComponentDemo() {
  const [activeTab, setActiveTab] = useState<Tab>("shelves");
  const [demoView, setDemoView] = useState<DemoView>("cards");
  const [favorites, setFavorites] = useState<Set<string>>(new Set(["1"]));
  const [chatMessages, setChatMessages] = useState(DEMO_MESSAGES);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSendMessage = (text: string) => {
    const newMessage = {
      id: String(Date.now()),
      text,
      author: "You",
      timestamp: new Date(),
      isMe: true,
    };
    setChatMessages((prev) => [...prev, newMessage]);
  };

  return (
    <div className="theme-academia app">
      <div className="phone-shell">
        {/* Demo Switcher Header */}
        <header className="px-4 py-3 bg-[var(--paper)] border-b border-[var(--line)]">
          <h1 className="text-lg font-bold text-[var(--ink)] mb-3">BookVibe Components</h1>
          <div className="flex gap-2">
            {(["cards", "chat", "search"] as DemoView[]).map((view) => (
              <button
                key={view}
                onClick={() => setDemoView(view)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  demoView === view
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--paper-soft)] text-[var(--muted)] hover:bg-[var(--line)]"
                }`}
              >
                {view === "cards" ? "Book Cards" : view === "chat" ? "Chat" : "Search"}
              </button>
            ))}
          </div>
        </header>

        {/* Content Area */}
        <div className="phone-shell-content">
          {demoView === "cards" && (
            <div className="p-4 space-y-4">
              <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wide">
                Currently Reading
              </h2>
              {DEMO_BOOKS.map((book) => (
                <BookCard
                  key={book.id}
                  {...book}
                  isFavorite={favorites.has(book.id)}
                  onFavoriteToggle={() => toggleFavorite(book.id)}
                  onClick={() => console.log("Clicked:", book.title)}
                />
              ))}
            </div>
          )}

          {demoView === "chat" && (
            <ChatInterface
              roomName="Fiction Lovers"
              roomDescription="Discuss your favorite fiction books"
              roomImage="https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=800&q=80"
              messages={chatMessages}
              currentUser={{ name: "You", avatarSeed: "currentuser" }}
              onSendMessage={handleSendMessage}
              onBack={() => setDemoView("cards")}
            />
          )}

          {demoView === "search" && (
            <BookSearch
              onAddBook={(book, status) => {
                console.log("Added book:", book.title, "with status:", status);
              }}
            />
          )}
        </div>

        {/* Bottom Navigation */}
        <BottomNavigation
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            if (tab === "chats") setDemoView("chat");
            else if (tab === "add") setDemoView("search");
            else setDemoView("cards");
          }}
        />
      </div>
    </div>
  );
}

export default ComponentDemo;
