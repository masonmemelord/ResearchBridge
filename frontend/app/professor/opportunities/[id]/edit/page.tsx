import { ProfessorPageShell } from "../../../../../components/professor/ProfessorPageShell";
import { EditOpportunityWorkspace } from "../../../../../components/professor/EditOpportunityWorkspace";

export default async function EditOpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <ProfessorPageShell>
      <EditOpportunityWorkspace opportunityId={id} />
    </ProfessorPageShell>
  );
}
