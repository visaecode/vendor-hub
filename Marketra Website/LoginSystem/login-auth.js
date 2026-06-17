import { auth, db } from "./firebase-config.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

// FIXED: Form ID matched exactly to login_2.html framework tag
const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        // Ensure these input IDs match your username/password fields exactly
        const email = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value;

        try {
            // Secure serverless credential authentication query check
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Fetch the user's role from Firestore to determine which dashboard they belong on
            const userDoc = await getDoc(doc(db, "users", user.uid));
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                
                // FIXED: Multi-folder relative path routers targeting separate modules
                if (userData.userRole === "Super Admin") {
                    window.location.href = "../SuperAdminDashboard/superadmin.html";
                } else if (userData.userRole === "Admin") {
                    window.location.href = "../AdminDashboard/admin.html";
                } else {
                    window.location.href = "../UserDashboard/user.html";
                }
            } else {
                alert("Authentication Notice: Account profile data does not exist in our systems.");
            }
        } catch (error) {
            alert(`Authentication Notice: ${error.message}`);
        }
    });
}