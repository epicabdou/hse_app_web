import { NavLink } from "react-router"
import { UserButton } from "@clerk/react-router"
import { cn } from "@/lib/utils"
import {
    LayoutDashboard,
    Users,
    Menu,
    X,
    Search,
    SearchCheck
} from "lucide-react"
import { useState } from "react"

const navigation = [
    {
        name: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
    },
    {
        name: "Users",
        href: "/users",
        icon: Users,
    },
    {
        name: "Inspections",
        href: "/inspections",
        icon: SearchCheck,
    },
    {
        name: "Tester",
        href: "/tester",
        icon: Search,
    }
]

export function SideBar() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    return (
        <>
            {/* Mobile menu button */}
            <div className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-x-4 border-b border-border bg-background px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 lg:hidden">
                <button
                    type="button"
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="-m-2.5 p-2.5 text-foreground lg:hidden"
                >
                    <Menu className="h-6 w-6" aria-hidden="true" />
                </button>
                <div className="flex flex-1 justify-end">
                    <UserButton />
                </div>
            </div>

            {/* Mobile sidebar */}
            <div className={cn(
                "relative z-50 lg:hidden",
                isMobileMenuOpen ? "fixed inset-0" : "hidden"
            )}>
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" />
                <div className="fixed inset-0 flex">
                    <div className="relative mr-16 flex w-full max-w-xs flex-1">
                        <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                            <button
                                type="button"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="-m-2.5 p-2.5"
                            >
                                <X className="h-6 w-6 text-foreground" />
                            </button>
                        </div>
                        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-border bg-background px-6 pb-2">
                            <div className="flex h-16 shrink-0 items-center">
                                <h1 className="text-xl font-semibold">Dashboard</h1>
                            </div>
                            <nav className="flex flex-1 flex-col">
                                <ul className="flex flex-1 flex-col gap-y-7">
                                    <li>
                                        <ul className="-mx-2 space-y-1">
                                            {navigation.map((item) => (
                                                <li key={item.name}>
                                                    <NavLink
                                                        to={item.href}
                                                        onClick={() => setIsMobileMenuOpen(false)}
                                                        className={({ isActive }) =>
                                                            cn(
                                                                "group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-medium transition-colors",
                                                                isActive
                                                                    ? "bg-primary text-primary-foreground"
                                                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                                            )
                                                        }
                                                    >
                                                        <item.icon className="h-5 w-5 shrink-0" />
                                                        {item.name}
                                                    </NavLink>
                                                </li>
                                            ))}
                                        </ul>
                                    </li>
                                </ul>
                            </nav>
                        </div>
                    </div>
                </div>
            </div>

            {/* Desktop sidebar */}
            <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
                <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-border bg-background px-6">
                    <div className="flex h-16 shrink-0 items-center justify-between">
                        <h1 className="text-xl font-semibold">Dashboard</h1>
                    </div>
                    <nav className="flex flex-1 flex-col">
                        <ul className="flex flex-1 flex-col gap-y-7">
                            <li>
                                <ul className="-mx-2 space-y-1">
                                    {navigation.map((item) => (
                                        <li key={item.name}>
                                            <NavLink
                                                to={item.href}
                                                className={({ isActive }) =>
                                                    cn(
                                                        "group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-medium transition-colors",
                                                        isActive
                                                            ? "bg-primary text-primary-foreground"
                                                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                                    )
                                                }
                                            >
                                                <item.icon className="h-5 w-5 shrink-0" />
                                                {item.name}
                                            </NavLink>
                                        </li>
                                    ))}
                                </ul>
                            </li>
                        </ul>
                    </nav>

                    {/* User button at bottom of sidebar */}
                    <div className="sticky bottom-0 flex items-center gap-x-4 px-2 py-3 border-t border-border bg-background">
                        <UserButton />
                    </div>
                </div>
            </div>
        </>
    )
}