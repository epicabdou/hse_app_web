import { Outlet, useNavigate, useLocation } from "react-router";
import { SideBar } from "@/components";
import { useUser, useClerk } from "@clerk/react-router";
import { useEffect } from "react";

export function MainLayout() {
    const navigateTo = useNavigate();
    const { pathname } = useLocation();
    const { isLoaded, isSignedIn, user } = useUser();
    const { signOut } = useClerk();

    const role = (user?.publicMetadata?.appRole as string | undefined) ?? null;

    useEffect(() => {
        if (!isLoaded) return;

        // If not signed in, just go to sign-in (no signOut() needed)
        if (!isSignedIn) {
            if (pathname !== "/sign-in") {
                navigateTo("/sign-in", { replace: true });
            }
            return;
        }

        // Signed in but wrong role → sign out, then send to sign-in
        if (role !== "superadmin") {
            (async () => {
                try {
                    await signOut();
                } finally {
                    if (pathname !== "/sign-in") {
                        navigateTo("/sign-in", { replace: true });
                    }
                }
            })();
        }
    }, [isLoaded, isSignedIn, role, navigateTo, pathname, signOut]);

    // Avoid flicker until Clerk is loaded; also hide while redirecting
    if (!isLoaded || !isSignedIn || role !== "superadmin") {
        return null; // or a spinner
    }

    return (
        <div className="min-h-screen bg-background">
            <SideBar />
            <main className="lg:pl-72">
                <div className="px-4 py-6 sm:px-6 lg:px-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
