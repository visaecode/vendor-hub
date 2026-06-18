import { auth, db } from "./firebase-config.js";
import { signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

async function processUserAuthorization(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        let userData = null;

        // Try searching by Auth UID first
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            userData = userDoc.data();
        } else {
            // Fallback: Query collection by email field
            const q = query(collection(db, "users"), where("email", "==", email));
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
        alert(`Login Failure: ${error.message}`);
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