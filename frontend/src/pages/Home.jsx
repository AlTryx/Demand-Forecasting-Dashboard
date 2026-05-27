import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function Home() {
    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 text-center max-w-4xl mx-auto">

            <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-5xl md:text-6xl font-black tracking-tight text-zinc-950 leading-tight"
            >
                Predict Your Demand. <br />
                <span className="text-purple-600 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                    Optimize Your Inventory.
                </span>
            </motion.h1>

            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="mt-6 text-lg text-zinc-600 max-w-xl leading-relaxed"
            >
                Stop relying on intuition. Use machine learning to analyze historical sales data, prevent costly overstocking, and eliminate missed sales opportunities.
            </motion.p>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
            >
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Link
                        to="/signin"
                        className="bg-purple-600 hover:bg-purple-700 text-white text-base font-semibold px-8 py-3.5 rounded-xl shadow-lg shadow-purple-600/20 transition-colors inline-block"
                    >
                        Open Dashboard →
                    </Link>
                </motion.div>

                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Link
                        to="/signup"
                        className="bg-white hover:bg-zinc-50 text-zinc-900 border border-zinc-200 text-base font-semibold px-8 py-3.5 rounded-xl shadow-sm transition-colors inline-block"
                    >
                        Create Free Account
                    </Link>
                </motion.div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="mt-20 grid grid-cols-3 gap-8 border-t border-zinc-200 pt-8 w-full max-w-2xl"
            >
                <div>
                    <h3 className="text-2xl font-bold text-zinc-950">67.67%</h3>
                    <p className="text-xs text-zinc-500 font-medium mt-1">Model Accuracy</p>
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-zinc-950">&lt; 5m</h3>
                    <p className="text-xs text-zinc-500 font-medium mt-1">Setup Time</p>
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-zinc-950">30-Day</h3>
                    <p className="text-xs text-zinc-500 font-medium mt-1">Forecast Horizon</p>
                </div>
            </motion.div>

        </div>
    );
}