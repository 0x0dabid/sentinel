import DashboardShell from "@/components/DashboardShell";
import PerpsClient from "./PerpsClient";

export default function Page() {
  return (
    <DashboardShell>
      <PerpsClient />
    </DashboardShell>
  );
}
