import { auth, db } from "./firebase-config.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

const regPasswordInput = document.getElementById("regPassword");
const policyBox = document.getElementById("policyBox");

const rules = {
    'pol-len':   (v) => v.length >= 8,
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

document.getElementById("registerForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("regContact").value.trim();
    const password = regPasswordInput.value;

    // Validate password checklist before registration
    const allPassed = Object.values(rules).every(test => test(password));
    if (!allPassed) {
        alert("Please make sure your password meets all requirements in the checklist.");
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", userCredential.user.uid), {
            firstName: document.getElementById("regFirstName").value.trim(),
            lastName: document.getElementById("regLastName").value.trim(),
            username: document.getElementById("regUsername").value.trim(),
            email: email,
            userRole: "Vendor",
            createdAt: new Date().toISOString()
        });
        alert("Account created successfully!");
        window.location.href = "../../Dashboards_Folder/UserDashboard/user.html";
    } catch (error) { 
        alert(`Registration Error: ${error.message}`); 
    }
});