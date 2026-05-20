import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Login from './pages/Login'
import Profile from './pages/Profile'
import Dashboard from './pages/Dashboard'
import Registration from './pages/Registration'

function App() {
    return (
        <BrowserRouter>
            <Navbar />
            <div className="app-content">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/registration" element={<Registration />} />
                </Routes>
            </div>
        </BrowserRouter>
    )
}

export default App