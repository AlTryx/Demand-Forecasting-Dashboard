import { BrowserRouter, Routes, Route, useLocation, Navigate, Outlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import PageTransition from './components/PageTransition.jsx';
import ProtectedLayout from './components/ProtectedLayout.jsx';
import PublicLayout from './components/PublicLayout.jsx';
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
                <Route element={<PublicLayout />}>
                    <Route path="/" element={<PageTransition><Home /></PageTransition>} />
                    <Route path="/signin" element={<PageTransition><Login /></PageTransition>} />
                    <Route path="/registration" element={<PageTransition><Registration /></PageTransition>} />
                </Route>
                <Route element={<ProtectedLayout />}>
                    <Route path="/profile" element={<PageTransition><Profile /></PageTransition>} />
                    <Route path="/dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
                </Route>
            </Routes>
        </AnimatePresence>
    );
}

function App() {
    return (
        <BrowserRouter>
            <div className="app-content">
                <AnimatedRoutes/>
            </div>
        </BrowserRouter>
    )
}

export default App