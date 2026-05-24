import { useState } from "react"
import { motion } from "framer-motion";
import { login } from "../hooks/authService";

export default function Login() {
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            const data = await login(username, password)
            localStorage.setItem("token", data.token);
            console.log("Successful login, Access token is:", data.access);
        } catch {
            setError('Invalid username or password')
        } finally {
            setLoading(false)
        }
    }
    return (
        <form className = "w-full max-w-[340px] mx-auto mt-10 p-8 rounded-2xl bg-white/75 backdrop-blur-md shadow-xl border border-zinc-200/50" onSubmit = {handleLogin} >
            <h2 style={{ margin: '10px auto', color: '#1f2937', fontSize: '1.5rem', fontWeight: 700 }}>
                Welcome back!
            </h2>
            <label className = "block text-xs font-medium text-zinc-600 mb-1 mt-4"
                   htmlFor="username">
                Username:
            </label>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <input className = "w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-purple-600 focus:outline-none"
                       type="text"
                       id="username"
                       value={username}
                       onChange={e => setUsername(e.target.value)} required
                />
            </motion.div>

            <label className = "block text-xs font-medium text-zinc-600 mb-1 mt-4"
                   htmlFor="password">
                Password:
            </label>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <input className = "w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-purple-600 focus:outline-none"
                       type="password"
                       id="password"
                       placeholder="••••••••"
                       value={password}
                       onChange={e => setPassword(e.target.value)}
                />
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg py-2.5 mt-6 transition-colors"
                        type="submit"
                        disabled={loading}
                >
                    {loading ? "Logging in..." : "Sign In"}
                </button>
            </motion.div>
        </form>
    )
}