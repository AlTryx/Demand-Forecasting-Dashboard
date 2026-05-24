import AppNavbar from "./Navbar.jsx";
import {Outlet} from "react-router-dom";

const PublicLayout = () => {
    return (
        <div className="min-h-screen bg-zinc-50 flex flex-col">
            <AppNavbar /> {/* Този Navbar ще се вижда САМО тук */}
            <div className="flex-1">
                <Outlet /> {/* Тук React Router ще мушне Home, Login или Registration */}
            </div>
        </div>
    );
};

export default PublicLayout;