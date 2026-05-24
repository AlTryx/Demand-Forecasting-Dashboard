import {Navigate, Outlet} from "react-router-dom";
import Sidebar from "./Sidebar.jsx";

const ProtectedLayout = () => {
    const token = localStorage.getItem('token');
    if (!token){
        return <Navigate to="/signin" replace />;
    }
    return (
        <div className="flex min-h-screen bg-white">
            <Sidebar />
            <main className="flex-1">
                <Outlet/>
            </main>
        </div>
    );
}

export default ProtectedLayout;