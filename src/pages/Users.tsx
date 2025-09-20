// src/pages/Users.tsx
import { useNavigate } from 'react-router'
import { Button } from "@/components/ui/button"

export function Users() {

    const navigateTo = useNavigate();

    return (
        <>
            <h1>Users</h1>

            <Button onClick={
                () => (
                    navigateTo('1')
                )
            }>
                User: 1
            </Button>
        </>
    )
}