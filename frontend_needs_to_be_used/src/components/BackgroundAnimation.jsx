import { motion } from "framer-motion";

export default function BackgroundAnimation() {
    return (
        <div className="fixed inset-0 z-0 overflow-hidden bg-zinc-50 pointer-events-none w-full h-full">
            <div className="absolute inset-0 opacity-[0.05] bg-[radial-gradient(#18181b_1px,transparent_1px)] [background-size:40px_40px]" />
            <div className="absolute inset-0 w-full h-full flex items-center justify-center">
                <svg className="w-full h-screen opacity-30 md:opacity-20" viewBox="0 0 1440 800" fill="none" xmlns="http://www.w3.org/2000/svg">

                    <motion.path
                        d="M 0 500 Q 200 420 400 480 T 800 400"
                        stroke="#818cf8"
                        strokeWidth="1.5"
                        strokeDasharray="1200"
                        animate={{ strokeDashoffset: [1200, 0] }}
                        transition={{ duration: 4, ease: "linear" }}
                    />

                    <motion.path
                        d="M 0 420 Q 250 500 500 380 T 800 400"
                        stroke="#c084fc" /* Светло лилаво */
                        strokeWidth="1.5"
                        strokeDasharray="1200"
                        animate={{ strokeDashoffset: [1200, 0] }}
                        transition={{ duration: 4.5, ease: "linear" }}
                    />

                    <motion.path
                        d="M 0 460 Q 150 350 450 460 T 800 400"
                        stroke="#a7f3d0" /* Ментово зелено - за свежест */
                        strokeWidth="1.2"
                        strokeDasharray="1200"
                        animate={{ strokeDashoffset: [1200, 0] }}
                        transition={{ duration: 5, ease: "linear" }}
                    />

                    <line x1="800" y1="0" x2="800" y2="800" stroke="#e4e4e7" strokeWidth="1" strokeDasharray="6 6" />

                    <circle cx="800" cy="400" r="5" fill="#a855f7" />
                    <motion.circle
                        cx="800"
                        cy="400"
                        animate={{ r: [5, 14, 5], opacity: [0.6, 0.2, 0.6] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                        fill="#a855f7"
                    />

                    <motion.path
                        d="M 800 400 Q 950 320 1100 360 T 1440 250"
                        stroke="#a855f7"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeDasharray="1000"
                        animate={{ strokeDashoffset: [1000, 0, 0, 1000] }}
                        transition={{
                            duration: 8,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        className="drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                    />

                    <motion.path
                        d="M 800 400 Q 950 280 1100 310 T 1440 180"
                        stroke="#c084fc"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                        opacity="0.5"
                    />

                    <motion.path
                        d="M 800 400 Q 950 360 1100 410 T 1440 320"
                        stroke="#c084fc"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                        opacity="0.5"
                    />

                </svg>
            </div>
        </div>
    );
}