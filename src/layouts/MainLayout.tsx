import { Outlet } from "react-router";
import { MainHeader } from "@/components";
import {RedirectToSignIn, SignedIn, SignedOut} from "@clerk/react-router";

export function MainLayout() {
    return (
        <div>
            <SignedIn>
                <MainHeader />
                <Outlet />
            </SignedIn>
            <SignedOut>
                <RedirectToSignIn />
            </SignedOut>
        </div>
    )
}