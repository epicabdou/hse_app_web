// src/main.tsx
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router";
import { ClerkProvider } from "@clerk/react-router";

import {Home, Users, User, Login, Register, Inspections, Tester} from "@/pages";
import { AuthLayout, MainLayout } from "@/layouts";
import "./styles/index.css";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!PUBLISHABLE_KEY) {
    throw new Error("Add your Clerk Publishable Key to the .env file");
}

createRoot(document.getElementById("root")!).render(
        <BrowserRouter>
            <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
                <Routes>

                    {/* Protected app routes */}
                    <Route element={<MainLayout />}>
                        <Route index element={<Home />} />
                        <Route path="/inspections" element={<Inspections />} />
                        <Route path="/tester" element={<Tester />} />
                        <Route path="users">
                            <Route index element={<Users />} />
                            <Route path=":id" element={<User />} />
                        </Route>
                    </Route>

                    {/* Auth routes (public) */}
                    <Route element={<AuthLayout />}>
                        <Route path="sign-in" element={<Login />} />
                        <Route path="sign-up" element={<Register />} />
                    </Route>
                </Routes>
            </ClerkProvider>
        </BrowserRouter>
);
