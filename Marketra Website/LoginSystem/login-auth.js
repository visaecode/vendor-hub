const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const identifier = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value;

        if (!identifier || !password) {
            alert("Please enter both your email/username and password.");
            return;
        }

        if (identifier.length > 100 || password.length > 100) {
            alert("Input is too long.");
            return;
        }

        if (identifier.includes("@")) {
            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            if (!emailRegex.test(identifier)) {
                alert("Please enter a valid email address.");
                return;
            }
        }

        try {
            const res = await fetch("http://localhost:3000/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identifier, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                alert(`Authentication Notice: ${data.error}`);
                return;
            }

            localStorage.setItem("mkt_token", data.token);
            localStorage.setItem("mkt_user", JSON.stringify(data.user));

            if (data.user.role === "Super Admin") {
                window.location.href = "../SuperAdminDashboard/superadmin.html";
            } else if (data.user.role === "Admin") {
                window.location.href = "../AdminDashboard/admin.html";
            } else {
                window.location.href = "../UserDashboard/user.html";
            }
        } catch (error) {
            alert(`Authentication Notice: ${error.message}`);
        }
    });
}