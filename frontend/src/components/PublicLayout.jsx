import AppNavbar from "./Navbar.jsx";
import {Outlet} from "react-router-dom";
import BackgroundAnimation from "../components/BackgroundAnimation"

const PublicLayout = () => {
    return (
        <div className="relative min-h-screen w-full bg-zinc-50 flex flex-col isolation-isolate">

            <BackgroundAnimation />

            <div className="relative z-20">
                <AppNavbar />
            </div>

            <div className="flex-1 relative z-10 w-full">
                <Outlet />
            </div>
        </div>
    );
};

export default PublicLayout;