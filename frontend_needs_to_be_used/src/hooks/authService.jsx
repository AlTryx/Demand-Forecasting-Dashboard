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

export async function register(username, firstName, lastName, email, password) {
    const response = await fetch("http://127.0.0.1:8000/api/user/registration/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            username: username,
            first_name: firstName,
            last_name: lastName,
            email: email,
            password: password,
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw errorData;
    }

    return response.json();
}