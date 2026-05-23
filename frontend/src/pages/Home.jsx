import { useState } from "react"

export default function Home() {
    return (
        /* The Wrapper: Centers content vertically and horizontally */
        <main className="flex flex-col items-center justify-center min-h-[75vh] px-4 text-center">

            <h1 className="text-5xl md:text-6xl font-black tracking-tight text-zinc-950 max-w-3xl leading-tight">
                AI-Powered <span className="text-purple-600">Demand Forecasting</span>
            </h1>

            <p className="mt-4 text-lg md:text-xl text-zinc-500 max-w-xl">
                Predict your inventory layout with precision using our next-generation engine.
            </p>

        </main>
    );
}