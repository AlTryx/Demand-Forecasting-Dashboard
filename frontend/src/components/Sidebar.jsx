import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function Sidebar() {
    const navigate = useNavigate();
    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate("/signin");
    };

    return (
        <aside className="w-64 min-h-screen bg-zinc-50 border-r border-zinc-200 flex flex-col justify-between p-6">
            <div>
                <div className="mb-8 px-2">
                    <span className="font-black text-lg tracking-tight text-purple-600 block">
                        Forecaster
                    </span>
                    <span className="text-xs text-zinc-400 font-medium">
                        Business Engine
                    </span>
                </div>

                <nav className="flex flex-col gap-1">
                    <Link to="/dashboard" className="flex items-center px-3 py-2 text-sm font-medium text-zinc-700 hover:text-zinc-950 hover:bg-zinc-200/50 rounded-lg transition-colors">
                        Dashboard
                    </Link>
                    <Link to="/profile" className="flex items-center px-3 py-2 text-sm font-medium text-zinc-700 hover:text-zinc-950 hover:bg-zinc-200/50 rounded-lg transition-colors">
                        Profile
                    </Link>
                </nav>
            </div>

            <div className="border-t border-zinc-200 pt-4">
                <motion.button
                    whileHover={{scale: 1.02}}
                    whileTap={{scale:0.98}}
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                    Log Out
                </motion.button>
            </div>
        </aside>
    )
}