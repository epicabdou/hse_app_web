import { NavLink } from "react-router";
import { UserButton } from "@clerk/react-router"

export function MainHeader() {
    return (
        <nav>
            <div>
                <NavLink to="/">Dashboard</NavLink>
                <NavLink to="/users">Users</NavLink>
                <NavLink to={"/account"}>Account</NavLink>
            </div>
            <div>
                <UserButton />
            </div>
        </nav>
    );
}
