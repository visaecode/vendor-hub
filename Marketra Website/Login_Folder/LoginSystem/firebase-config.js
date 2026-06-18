// ============================================================
// MARKETRA — Central Firebase Initialization Pipeline
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyCZ7-OvOzsSoqNiuXUKquKMsmitUJDTcLw",
    authDomain: "marketra-website-25140.firebaseapp.com",
    projectId: "marketra-website-25140",
    storageBucket: "marketra-website-25140.firebasestorage.app",
    messagingSenderId: "943864250185",
    appId: "1:943864250185:web:14d3944c9b4bf37c206498",
    measurementId: "G-KD1KVRJP2J"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);