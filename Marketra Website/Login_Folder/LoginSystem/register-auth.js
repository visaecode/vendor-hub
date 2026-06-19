import { auth, db } from "./firebase-config.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { doc, setDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

const regPasswordInput = document.getElementById("regPassword");
const policyBox = document.getElementById("policyBox");

const rules = {
    'pol-len':   (v) => v.length >= 8 && v.length <= 64,
    'pol-upper': (v) => /[A-Z]/.test(v),
    'pol-lower': (v) => /[a-z]/.test(v),
    'pol-num':   (v) => /[0-9]/.test(v),
    'pol-sym':   (v) => /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~;']/.test(v)
};

regPasswordInput?.addEventListener("input", () => {
    const val = regPasswordInput.value;
    if (val.length > 0) {
        if (policyBox) policyBox.style.display = "block";
    } else {
        if (policyBox) policyBox.style.display = "none";
    }

    for (const [id, test] of Object.entries(rules)) {
        const li = document.getElementById(id);
        if (!li) continue;
        const icon = li.querySelector(".pol-icon");

        if (val.length === 0) {
            li.classList.remove('pol-pass', 'pol-fail');
            if (icon) icon.textContent = '✕';
        } else {
            const isMet = test(val);
            li.classList.toggle('pol-pass', isMet);
            li.classList.toggle('pol-fail', !isMet);
            if (icon) icon.textContent = isMet ? '✓' : '✕';
        }
    }
});

// Input sanitization to prevent XSS
function sanitizeInput(str) {
    if (!str) return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;")
        .replace(/\//g, "&#x2F;");
}

const disposableDomains = ["yopmail.com", "mailinator.com", "tempmail.com", "trashmail.com", "dispostable.com", "10minutemail.com", "sharklasers.com", "guerrillamail.com"];
const commonPasswords = ["password123", "12345678", "qwertyuiop", "welcome123", "password", "123456789", "marketra123", "admin123", "user123"];

document.getElementById("registerForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    // Rate Limiting: Max 3 registration requests per hour
    const now = Date.now();
    const hourMs = 60 * 60 * 1000;
    let regAttempts = JSON.parse(localStorage.getItem("reg_attempts") || "[]");
    regAttempts = regAttempts.filter(t => now - t < hourMs);
    if (regAttempts.length >= 3) {
        alert("Registration Blocked: Too many registration requests. You can register a maximum of 3 accounts per hour. Please try again later.");
        return;
    }

    const emailRaw = document.getElementById("regContact").value;
    const email = emailRaw.trim();
    const firstName = document.getElementById("regFirstName").value.trim();
    const lastName = document.getElementById("regLastName").value.trim();
    const username = document.getElementById("regUsername").value.trim();
    const password = regPasswordInput.value;

    // Validate email structure (mobile not supported)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert("Please register with a valid email address. Mobile number registration is not supported at this time.");
        return;
    }

    // Check disposable email
    const emailDomain = email.toLowerCase().split("@")[1];
    if (disposableDomains.includes(emailDomain)) {
        alert("Registration Blocked: Temporary or disposable email addresses are not allowed. Please use a standard email provider.");
        return;
    }

    // Validate size restrictions
    if (firstName.length > 50 || lastName.length > 50) {
        alert("Registration Error: First Name and Last Name must not exceed 50 characters.");
        return;
    }
    if (username.length > 30) {
        alert("Registration Error: Username must not exceed 30 characters.");
        return;
    }
    if (password.length > 64) {
        alert("Registration Error: Password must not exceed 64 characters.");
        return;
    }

    // Validate password checklist
    const allPassed = Object.values(rules).every(test => test(password));
    if (!allPassed) {
        alert("Please make sure your password meets all requirements in the checklist.");
        return;
    }

    // Check compromised/dictionary words
    if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
        alert("Password Policy: Your password contains common compromised terms (e.g. 'password123'). Please choose a more secure password.");
        return;
    }

    try {
        // Unique Identity Checks: Check if username is already taken in Firestore
        const usernameQuery = query(collection(db, "users"), where("username", "==", username));
        const usernameSnapshot = await getDocs(usernameQuery);
        if (!usernameSnapshot.empty) {
            alert("Registration Error: Username is already in use. Please select a different username.");
            return;
        }

        // Check if email is already taken in Firestore
        const emailQuery = query(collection(db, "users"), where("email", "==", email));
        const emailSnapshot = await getDocs(emailQuery);
        if (!emailSnapshot.empty) {
            alert("Registration Error: Email is already in use.");
            return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Log attempt to localStorage for rate limiting
        regAttempts.push(now);
        localStorage.setItem("reg_attempts", JSON.stringify(regAttempts));

        await setDoc(doc(db, "users", userCredential.user.uid), {
            firstName: sanitizeInput(firstName),
            lastName: sanitizeInput(lastName),
            username: sanitizeInput(username),
            email: sanitizeInput(email),
            userRole: "Vendor",
            createdAt: new Date().toISOString()
        });
        
        alert("Account created successfully!");
        window.location.href = "../../Dashboards_Folder/UserDashboard/user.html";
    } catch (error) { 
        // Map specific email already in use error to generic/clean message
        if (error.code === "auth/email-already-in-use") {
            alert("Registration Error: Email is already in use.");
        } else {
            alert(`Registration Error: ${error.message}`); 
        }
    }
});