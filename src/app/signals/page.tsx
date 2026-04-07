import DashboardShell from "@/components/DashboardShell";
import SignalsClient from "./SignalsClient";

export default function Page() {
  return (
    <DashboardShell>
      <SignalsClient />
    </DashboardShell>
  );
}
