import { useState } from "react"
import { Link } from "@heroui/react";
import { motion } from "framer-motion";

import styled from 'styled-components';

const Form = styled.form`
    display: flex;
    flex-direction: column;
    width: 340px;
    margin: 40px auto;
    padding: 32px;
    background: rgba(255, 255, 255, 0.75);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(78, 28, 115, 0.15);
    border-radius: 16px;
    box-shadow:
            0 4px 6px -1px rgba(0, 0, 0, 0.05),
            0 10px 30px -5px rgba(78, 28, 115, 0.08);
`;

const Label = styled.label`
    font-size: 0.85rem;
    font-weight: 500;
    color: #4b5563;
    margin-bottom: 6px;
    margin-top: 16px;
    
    &:first-of-type {
        margin-top: 0;
    }
`

const Input = styled.input`
    width: 100%;
    padding: 10px 14px;
    display: flex;
    margin: 10px 0;
    font-size: 0.95rem;
    color: #1f2937;
    background-color: #ffffff;
    border-radius: 8px;
    border: 1px solid #d1d5db;
    outline: none;
    transition: all 0.2s ease-in-out;

    &:focus {
        border-color: #8800ff;
        /* Adds a beautiful, soft purple focus ring aura */
        box-shadow: 0 0 0 4px rgba(136, 0, 255, 0.15);
    }

    &::placeholder {
        color: #9ca3af;
    }
`;

const Button = styled.button`
    width: 100%;
    padding: 12px;
    font-size: 0.95rem;
    font-weight: 600;
    color: white;
    background-color: #8800ff;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    margin-top: 24px;
    transition: background-color 0.2s ease;

    &:hover {
        background-color: #4e1c73;
    }
`;

export default function Login() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        try {
            //API logic
            const response = await fetch("/api/signin", {
                method: "POST",
                body: JSON.stringify({email, password}),
                headers: {
                    "Content-Type": "application/json",
                }
            });

            if (!response.ok) {
                throw new Error("Failed to sign in");
            }

            const data = await response.json();
            console.log('Sign In successful: ', data);
        } catch {
            setError('Invalid email or password')
        }
    }
    return (
        <Form>
            <h2 style={{ margin: '10px auto', color: '#1f2937', fontSize: '1.5rem', fontWeight: 700 }}>Welcome back!</h2>
            <Label htmlFor="email">Email:</Label>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Input type="text" id="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </motion.div>

            <Label htmlFor="password">Password:</Label>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Input type="password" id="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button type="submit" disabled={loading}>
                    {loading ? "Logging in..." : "Sign In"}
                </Button>
            </motion.div>
        </Form>
    )
}