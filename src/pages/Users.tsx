// src/pages/Users.tsx
import UserManagementTable from "@/components/UsersTable.tsx";

export function Users() {

    return (
        <UserManagementTable listUrl="/api/users" mutateBaseUrl="/api/users" className="" />
    )
}