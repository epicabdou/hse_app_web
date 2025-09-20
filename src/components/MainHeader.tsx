import { NavLink } from "react-router"
import { UserButton } from "@clerk/react-router"
import { cn } from "@/lib/utils"

export function MainHeader() {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 max-w-screen-2xl items-center">
                <nav className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-6 md:gap-10">
                        <NavLink
                            to="/"
                            className={({ isActive }) =>
                                cn(
                                    "flex items-center space-x-2 text-sm font-medium transition-colors hover:text-foreground/80",
                                    isActive ? "text-foreground" : "text-foreground/60",
                                )
                            }
                        >
                            Dashboard
                        </NavLink>
                        <NavLink
                            to="/users"
                            className={({ isActive }) =>
                                cn(
                                    "flex items-center space-x-2 text-sm font-medium transition-colors hover:text-foreground/80",
                                    isActive ? "text-foreground" : "text-foreground/60",
                                )
                            }
                        >
                            Users
                        </NavLink>
                        <NavLink
                            to="/account"
                            className={({ isActive }) =>
                                cn(
                                    "flex items-center space-x-2 text-sm font-medium transition-colors hover:text-foreground/80",
                                    isActive ? "text-foreground" : "text-foreground/60",
                                )
                            }
                        >
                            Account
                        </NavLink>
                    </div>
                    <div className="flex items-center">
                        <UserButton />
                    </div>
                </nav>
            </div>
        </header>
    )
}
