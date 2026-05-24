import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

export default function AppNavbar() {
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);

    const rawToken = localStorage.getItem("access_token");
    const token = (rawToken && rawToken !== "undefined") ? rawToken : null;

    return (
        <div className="relative w-full max-w-7xl mx-auto z-50">

            <nav className="w-full border-b border-zinc-200/50 bg-white/75 backdrop-blur-md sticky top-0 px-4 py-3 md:px-6 md:py-4 flex items-center justify-between rounded-b-2xl shadow-sm">

                {/* Logo */}
                <Link to="/" className="flex items-center gap-1.5 font-black text-lg md:text-xl tracking-tight text-zinc-900 shrink-0">
                    <span className="h-5 w-5 md:h-6 md:w-6 rounded-lg bg-purple-600 flex items-center justify-center text-white text-[10px] md:text-xs font-bold">Ω</span>
                    Forecasting<span className="text-purple-600 hidden sm:inline">.AI</span>
                </Link>

                {/* Desktop navigation */}
                <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-600">
                    <a href="#features" className="hover:text-purple-600 transition-colors">Features</a>
                    <a href="#team" className="hover:text-purple-600 transition-colors">Our Team</a>
                    <a href="#contacts" className="hover:text-purple-600 transition-colors">Contacts</a>
                </div>

                <div className="flex items-center gap-2 md:gap-4">

                    {!token ? (
                        <>
                            <Link to="/signin" className="text-zinc-600 hover:text-purple-600 text-xs font-semibold transition-colors px-2 py-2 hidden sm:block">
                                Sign In
                            </Link>
                            <Link to="/signup" className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold px-3 py-1.5 md:px-4 md:py-2 rounded-xl transition-colors shadow-sm">
                                Get Started
                            </Link>
                        </>
                    ) : (
                        <Link to="/dashboard" className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors shadow-md shadow-purple-600/10">
                            Dashboard
                        </Link>
                    )}

                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="block md:hidden text-zinc-700 text-2xl font-semibold p-1 focus:outline-none ml-2 leading-none"
                    >
                        {isOpen ? "✕" : "☰"}
                    </button>
                </div>
            </nav>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-[105%] left-4 right-4 bg-white/95 backdrop-blur-md border border-zinc-200/60 p-6 flex flex-col gap-4 z-40 md:hidden shadow-xl rounded-2xl"
                    >
                        <a
                            href="/features"
                            onClick={() => setIsOpen(false)}
                            className="text-zinc-700 hover:text-purple-600 font-semibold text-sm py-2 border-b border-zinc-100 transition-colors"
                        >
                            Features
                        </a>
                        <a
                            href="/team"
                            onClick={() => setIsOpen(false)}
                            className="text-zinc-700 hover:text-purple-600 font-semibold text-sm py-2 border-b border-zinc-100 transition-colors"
                        >
                            Our Team
                        </a>
                        <a
                            href="/contacts"
                            onClick={() => setIsOpen(false)}
                            className="text-zinc-700 hover:text-purple-600 font-semibold text-sm py-2 transition-colors"
                        >
                            Contacts
                        </a>

                        {!token && (
                            <Link
                                to="/signin"
                                onClick={() => setIsOpen(false)}
                                className="text-center bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold py-3 rounded-xl transition-colors mt-2 sm:hidden"
                            >
                                Sign In to Account
                            </Link>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}