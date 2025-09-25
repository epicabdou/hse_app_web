// src/SignUp.tsx
import {type FormEvent, useState } from "react";
import { useSignUp } from "@clerk/react-router";
import { useNavigate } from "react-router";

export function Register() {
    const { isLoaded, signUp, setActive } = useSignUp();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [code, setCode] = useState("");
    const [phase, setPhase] = useState<"form" | "verify">("form");
    const [error, setError] = useState<string | null>(null);
    const nav = useNavigate();

    if (!isLoaded) return null;

    async function handleCreate(e: FormEvent) {
        e.preventDefault();
        setError(null);
        try {
            await signUp.create({ emailAddress: email, password });
            await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
            setPhase("verify");
        } catch (err: any) {
            setError(err?.errors?.[0]?.message ?? "Sign-up failed");
        }
    }

    async function handleVerify(e: FormEvent) {
        e.preventDefault();
        setError(null);
        try {
            const res = await signUp.attemptEmailAddressVerification({ code });
            if (res.status === "complete") {
                await setActive({ session: res.createdSessionId });
                nav("/", { replace: true });
            }
        } catch (err: any) {
            setError(err?.errors?.[0]?.message ?? "Verification failed");
        }
    }

    return phase === "form" ? (
        <form onSubmit={handleCreate}>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />
            <button type="submit">Create account</button>
            {error && <p>{error}</p>}
        </form>
    ) : (
        <form onSubmit={handleVerify}>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Email code" />
            <button type="submit">Verify</button>
            {error && <p>{error}</p>}
        </form>
    );
}
