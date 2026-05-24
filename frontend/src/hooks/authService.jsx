export async function login (username, password) {
    const response = await fetch("http://127.0.0.1:8000/api/token/", {
        method: "POST",
        body: JSON.stringify({username, password}),
        headers: {
            "Content-Type": "application/json",
        }
    });
    if (!response.ok) {
        throw new Error("Login failed")
    }

    return response.json();
}