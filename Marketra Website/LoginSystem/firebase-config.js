// ============================================================
// MARKETRA — Central Firebase Initialization Pipeline
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-storage.js";

// Your verified web app's Firebase configuration payload
const firebaseConfig = {
    apiKey: "AIzaSyAgHGmi7fkj3wR1QWaORCR4JChsxFk6ACU",
    authDomain: "marketra-website.firebaseapp.com",
    projectId: "marketra-website",
    storageBucket: "marketra-website.firebasestorage.app",
    messagingSenderId: "147199695428",
    appId: "1:147199695428:web:81e31bf4aae9d956eb7a11",
    measurementId: "G-WBHKVJ1MDW"
};

// Initialize Firebase App instance context
const app = initializeApp(firebaseConfig);

// Instantiated structural service references hooks
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);