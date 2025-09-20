// src/pages/User.tsx
import { useParams } from "react-router";

export function User() {
    const { id } = useParams(); // id: string | undefined
    if (!id) return <h1>No user selected</h1>;
    return <h1>Selected User: {id}</h1>;
}