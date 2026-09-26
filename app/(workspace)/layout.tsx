import { AppShell } from "@/components/app-shell";
import { persistenceMode } from "@/lib/incidents/repository";

// Every workspace screen reflects the current incident and its durable evidence
// state. Rendering it at request time avoids an unnecessary Xano read during
// `next build` and prevents a stale dashboard from being shipped as HTML.
export const dynamic = "force-dynamic";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell persistence={persistenceMode()}>
      {children}
    </AppShell>
  );
}
