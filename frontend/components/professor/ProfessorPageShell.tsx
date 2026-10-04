import type { ReactNode } from "react";
import { WorkspaceShell } from "../layout/WorkspaceShell";

export function ProfessorPageShell({ children }: { children: ReactNode }) {
  return (
    <WorkspaceShell role="professor" portalLabel="Professor portal">
      {children}
    </WorkspaceShell>
  );
}
