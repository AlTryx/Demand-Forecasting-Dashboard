import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import AppNavbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import Registration from './pages/Registration';

function AnimatedRoutes() {
    const location = useLocation();

    return (
        <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
                <Route path="/" element={<PageTransition><Home /></PageTransition>} />
                <Route path="/signin" element={<PageTransition><Login /></PageTransition>} />
                <Route path="/profile" element={<PageTransition><Profile /></PageTransition>} />
                <Route path="/registration" element={<PageTransition><Registration /></PageTransition>} />
                <Route path="/dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
            </Routes>
        </AnimatePresence>
    );
}

// A reusable wrapper for your pages
const PageTransition = ({ children }) => (
    <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        transition={{ duration: 0.3 }}
    >
        {children}
    </motion.div>
);

function App() {
    return (
        <BrowserRouter>
            <AppNavbar />
            <div className="app-content">
                <AnimatedRoutes/>
            </div>
        </BrowserRouter>
    )
}

export default App