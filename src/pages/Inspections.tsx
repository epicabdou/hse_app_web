// src/pages/Inspections.tsx
import { AdminInspectionsPanel } from "@/components/AdminInspectionsPanel";
import { useAuth } from "@clerk/react-router";

export function Inspections() {
    const { getToken } = useAuth();
    return (
        <AdminInspectionsPanel
            baseUrl=""                 // or your API base
            getToken={async () => await getToken()}
            pageSize={20}
        />
    );
}
