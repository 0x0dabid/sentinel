import DashboardShell from "@/components/DashboardShell";
import RisksClient from "./RisksClient";

export default function Page() {
  return (
    <DashboardShell>
      <RisksClient />
    </DashboardShell>
  );
}
