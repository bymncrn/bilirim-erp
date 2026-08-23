import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ModuleGuard } from "@/components/subscription/ModuleGuard";

export const Route = createFileRoute("/panel")({
  component: () => (
    <ModuleGuard module="panel">
      <Outlet />
    </ModuleGuard>
  ),
});
