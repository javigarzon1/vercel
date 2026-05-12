import { Link } from "@tanstack/react-router";
import { Scale } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <Scale className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold tracking-tight">LexAgent</span>
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link to="/agents" className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
              Mis agentes
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
