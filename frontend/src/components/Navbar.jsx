import { Link } from "@heroui/react";
import { motion } from "framer-motion";

export default function AppNavbar() {
    return (
        <nav className="w-full bg-white border-b border-zinc-200 py-4 px-6">

            {/* 2. The Inner Box: Centers content and spaces elements out */}
            <div className="max-w-7xl mx-auto flex justify-between items-center">

                {/* Logo incoming someday here */}
                <div>
                    <span className="font-bold text-xl tracking-tighter text-zinc-900">
                        Demand Forecasting Dashboard
                    </span>
                </div>

                <div className="flex items-center gap-6">
                    <Link href="/" className="text-zinc-600 hover:text-zinc-950 text-sm font-medium">
                        Home
                    </Link>

                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Link
                            href="/signin"
                            className="bg-zinc-950 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-sm"
                        >
                            Sign In
                        </Link>
                    </motion.div>
                </div>

            </div>
        </nav>
    );
}