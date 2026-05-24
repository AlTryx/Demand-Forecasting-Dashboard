import {useState} from "react";
import {body} from "framer-motion/m";

export default function Registration() {
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        try {
            const response = await fetch("http://127.0.0.1:8000/api/user/registration", {
                method: "POST",
                body: JSON.stringify({firstName, lastName, email, password}),
                headers: {
                    "Content-Type": "application/json",
                }
            });

            if (!response.ok){
                throw new Error("Sign up failed.")
            }
            const data = await response.json();
            console.log("Registration successful: " + data);
        } catch {
            console.error("Error creating user");
        }
    }
}