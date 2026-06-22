import { auth, db } from "./firebase-config.js";
import { signInWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

async function processUserAuthorization(email, password) {
    const now = Date.now();
    const lockoutMs = 15 * 60 * 1000; // 15-minute ban
    let lockoutData = JSON.parse(localStorage.getItem("login_lockout") || "{}");

    if (lockoutData.time && now - lockoutData.time < lockoutMs) {
        const remainingMin = Math.ceil((lockoutMs - (now - lockoutData.time)) / (60 * 1000));
        alert(`Account Lockout: Too many failed login attempts. Please try again in ${remainingMin} minutes.`);
        return;
    }
    try {
        // Lowercase input to ensure consistency and prevent duplicates
        let loginEmail = email.trim().toLowerCase();
        
        // Input sanitization to prevent code injection
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(loginEmail)) {
            // Resolve username to registered email
            const q = query(collection(db, "users"), where("username", "==", loginEmail));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                loginEmail = querySnapshot.docs[0].data().email;
            } else {
                throw new Error("Invalid credentials");
            }
        }

        const userCredential = await signInWithEmailAndPassword(auth, loginEmail, password);
        const user = userCredential.user;
        let userData = null;

        // Try searching by Auth UID first
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            userData = userDoc.data();
        } else {
            // Fallback: Query collection by email field
            const q = query(collection(db, "users"), where("email", "==", loginEmail));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                userData = querySnapshot.docs[0].data();
            }
        }
        
        if (userData) {
            // Check maintenance mode gate
            if (userData.userRole !== "Super Admin") {
                try {
                    const settingsSnap = await getDoc(doc(db, "settings", "system"));
                    if (settingsSnap.exists() && settingsSnap.data().maintenanceMode) {
                        alert("Login Blocked: The platform is currently undergoing scheduled system maintenance. Please try again later.");
                        await signOut(auth);
                        return;
                    }
                } catch (settingsError) {
                    console.error("Error reading maintenance status on login:", settingsError);
                }
            }

            // Clear login lockout state upon success
            localStorage.removeItem("failed_logins");
            localStorage.removeItem("login_lockout");

            if (userData.userRole === "Super Admin") {
                window.location.href = "../../Dashboards_Folder/SuperAdminDashboard/superadmin.html";
            } else if (userData.userRole === "Admin") {
                window.location.href = "../../Dashboards_Folder/AdminDashboard/admin.html";
            } else {
                window.location.href = "../../Dashboards_Folder/UserDashboard/user.html";
            }
        } else {
            alert("Account record missing from system databases.");
        }
    } catch (error) {
        // Increment brute force lockout counter
        let failedAttempts = parseInt(localStorage.getItem("failed_logins") || "0") + 1;
        if (failedAttempts >= 5) {
            localStorage.setItem("login_lockout", JSON.stringify({ time: Date.now() }));
            localStorage.setItem("failed_logins", "0");
            alert("Account Lockout: 5 consecutive failed login attempts. Your login access has been locked for 15 minutes.");
        } else {
            localStorage.setItem("failed_logins", failedAttempts.toString());
            // Generic disclosure warning message
            alert("Login Failure: Incorrect email, username, or password.");
        }
    }
}

async function continueWithGoogle() {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        let userData = null;

        // Try searching by Auth UID first
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            userData = userDoc.data();
        } else {
            // Fallback: Query collection by email field
            const q = query(collection(db, "users"), where("email", "==", user.email));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                userData = querySnapshot.docs[0].data();
            } else {
                // Auto-register new users as Vendors
                let firstName = "Google";
                let lastName = "User";
                if (user.displayName) {
                    const nameParts = user.displayName.trim().split(/\s+/);
                    if (nameParts.length > 0) {
                        firstName = nameParts[0];
                        if (nameParts.length > 1) {
                            lastName = nameParts.slice(1).join(" ");
                        }
                    }
                }

                userData = {
                    firstName: firstName,
                    lastName: lastName,
                    username: user.email.split("@")[0],
                    email: user.email,
                    userRole: "Vendor",
                    createdAt: new Date().toISOString()
                };
                await setDoc(userDocRef, userData);
            }
        }

        if (userData) {
            // Check maintenance mode gate
            if (userData.userRole !== "Super Admin") {
                try {
                    const settingsSnap = await getDoc(doc(db, "settings", "system"));
                    if (settingsSnap.exists() && settingsSnap.data().maintenanceMode) {
                        alert("Login Blocked: The platform is currently undergoing scheduled system maintenance. Please try again later.");
                        await signOut(auth);
                        return;
                    }
                } catch (settingsError) {
                    console.error("Error reading maintenance status on login:", settingsError);
                }
            }

            // Clear login lockout state upon success
            localStorage.removeItem("failed_logins");
            localStorage.removeItem("login_lockout");

            if (userData.userRole === "Super Admin") {
                window.location.href = "../../Dashboards_Folder/SuperAdminDashboard/superadmin.html";
            } else if (userData.userRole === "Admin") {
                window.location.href = "../../Dashboards_Folder/AdminDashboard/admin.html";
            } else {
                window.location.href = "../../Dashboards_Folder/UserDashboard/user.html";
            }
        } else {
            alert("Account record missing from system databases.");
        }
    } catch (error) {
        alert(`Google Authentication Failure: ${error.message}`);
    }
}

document.getElementById("loginForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    processUserAuthorization(document.getElementById("username").value.trim(), document.getElementById("password").value);
});
document.getElementById("adminLoginForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    processUserAuthorization(document.getElementById("adminEmail").value.trim(), document.getElementById("adminPassword").value);
});

document.getElementById("googleBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    continueWithGoogle();
});
document.getElementById("regGoogleBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    continueWithGoogle();
});

// --- FORGOT PASSWORD MODULE ---
const forgotModal = document.getElementById("forgotModal");
const fpStep1 = document.getElementById("fpStep1");
const fpStep2 = document.getElementById("fpStep2");
const fpContactInput = document.getElementById("fpContact");
const fpSentTo = document.getElementById("fpSentTo");

function openForgotModal() {
    if (!forgotModal) return;
    if (fpContactInput) fpContactInput.value = "";
    if (fpStep1) fpStep1.style.display = "block";
    if (fpStep2) fpStep2.style.display = "none";
    forgotModal.classList.add("active");
}

function closeForgotModal() {
    forgotModal?.classList.remove("active");
}

// Show modal links
document.getElementById("forgotPass")?.addEventListener("click", (e) => {
    e.preventDefault();
    openForgotModal();
});
document.getElementById("adminForgotPass")?.addEventListener("click", (e) => {
    e.preventDefault();
    openForgotModal();
});

// Close modal triggers
document.getElementById("closeForgot")?.addEventListener("click", closeForgotModal);
document.getElementById("fpBackToLogin")?.addEventListener("click", (e) => {
    e.preventDefault();
    closeForgotModal();
});
document.getElementById("fpDoneBtn")?.addEventListener("click", closeForgotModal);

// Close modal on backdrop overlay click
forgotModal?.addEventListener("click", (e) => {
    if (e.target === forgotModal) {
        closeForgotModal();
    }
});

async function triggerPasswordReset(email) {
    if (!email) {
        alert("Please enter your registered email address.");
        return;
    }
    // Simple email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert("Please enter a valid email address. Mobile numbers are not supported for password reset at this time.");
        return;
    }

    try {
        await sendPasswordResetEmail(auth, email);
        if (fpSentTo) fpSentTo.textContent = email;
        if (fpStep1) fpStep1.style.display = "none";
        if (fpStep2) fpStep2.style.display = "block";
    } catch (error) {
        alert(`Reset Password Failure: ${error.message}`);
    }
}

// Submit handler
document.getElementById("forgotForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = fpContactInput?.value.trim();
    triggerPasswordReset(email);
});

// Resend link handler
document.getElementById("fpResendBtn")?.addEventListener("click", () => {
    const email = fpContactInput?.value.trim();
    if (email) {
        triggerPasswordReset(email);
        alert("A new password reset link has been sent to your email!");
    }
});