import { auth, db } from "./firebase-config.js";
import { createUserWithEmailAndPassword, sendEmailVerification } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { doc, setDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

// ─── DOM References ───────────────────────────────────────────────────────────
const regPasswordInput   = document.getElementById("regPassword");
const regConfirmInput    = document.getElementById("regConfirmPassword");
const regUsernameInput   = document.getElementById("regUsername");
const regDobInput        = document.getElementById("regDob");
const regAgeInput        = document.getElementById("regAge");
const regSubmitBtn       = document.getElementById("regSubmitBtn");
const policyBox          = document.getElementById("policyBox");
const strengthMeterWrap  = document.getElementById("strengthMeterWrap");
const strengthFill       = document.getElementById("strengthFill");
const strengthLabel      = document.getElementById("strengthLabel");

// ─── Password policy rules ────────────────────────────────────────────────────
const rules = {
    'pol-len':   (v) => v.length >= 8 && v.length <= 64,
    'pol-upper': (v) => /[A-Z]/.test(v),
    'pol-lower': (v) => /[a-z]/.test(v),
    'pol-num':   (v) => /[0-9]/.test(v),
    'pol-sym':   (v) => /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\\/`~;']/.test(v)
};

// ─── Profanity list (extend as needed) ───────────────────────────────────────
const profanityList = [
    "fuck","shit","ass","bitch","bastard","damn","crap","dick","pussy","cock",
    "nigger","nigga","faggot","fag","slut","whore","cunt","piss","rape","retard"
];

function containsProfanity(str) {
    const lower = str.toLowerCase().replace(/[^a-z0-9]/g, "");
    return profanityList.some(w => lower.includes(w));
}

// ─── Inline error helpers ─────────────────────────────────────────────────────
function showFieldError(fieldId, message) {
    const errEl   = document.getElementById("err-" + fieldId);
    const groupEl = document.getElementById("ig-" + fieldId);
    if (errEl)   { errEl.innerHTML = message; errEl.style.display = "flex"; }
    if (groupEl) groupEl.classList.add("has-error");
}

function clearFieldError(fieldId) {
    const errEl   = document.getElementById("err-" + fieldId);
    const groupEl = document.getElementById("ig-" + fieldId);
    if (errEl)   { errEl.textContent = ""; errEl.style.display = "none"; }
    if (groupEl) groupEl.classList.remove("has-error");
}

function clearAllErrors() {
    ["regContact","regFirstName","regLastName","regUsername",
     "regDob","regAge","regGender","regPassword","regConfirmPassword"]
        .forEach(id => clearFieldError(id));
}

// ─── Age calculation from DOB ─────────────────────────────────────────────────
function calcAge(dobValue) {
    if (!dobValue) return null;
    const dob   = new Date(dobValue);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age;
}

// Auto-fill age when DOB changes
regDobInput?.addEventListener("change", () => {
    clearFieldError("regDob");
    clearFieldError("regAge");
    const age = calcAge(regDobInput.value);
    if (regAgeInput) regAgeInput.value = (age !== null && age >= 0) ? age : "";

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dob = new Date(regDobInput.value);

    if (dob >= today) {
        showFieldError("regDob", "⚠ Date of birth cannot be in the future.");
        if (regAgeInput) regAgeInput.value = "";
        return;
    }
    if (age !== null && age < 18) {
        showFieldError("regAge", `⚠ You must be at least 18 years old to register. You are ${age} year(s) old.`);
    }
});

// ─── Strength meter logic ─────────────────────────────────────────────────────
function updateStrengthMeter(val) {
    if (!strengthFill || !strengthLabel || !strengthMeterWrap) return;
    if (val.length === 0) { strengthMeterWrap.style.display = "none"; return; }
    strengthMeterWrap.style.display = "flex";
    const metCount = Object.values(rules).filter(fn => fn(val)).length;
    const hasLong  = val.length >= 12;
    const score    = metCount + (hasLong ? 1 : 0);
    let width, label, cls;
    if (score <= 2)      { width = "25%"; label = "Weak";        cls = "strength-weak"; }
    else if (score <= 3) { width = "50%"; label = "Fair";        cls = "strength-fair"; }
    else if (score <= 5) { width = "75%"; label = "Strong";      cls = "strength-strong"; }
    else                 { width = "100%"; label = "Very Strong"; cls = "strength-very-strong"; }
    strengthFill.style.width   = width;
    strengthFill.className     = "strength-meter-fill " + cls;
    strengthLabel.textContent  = label;
    strengthLabel.className    = "strength-meter-label " + cls;
}

// ─── SHA-1 generator ─────────────────────────────────────────────────────────
async function sha1(string) {
    const utf8 = new TextEncoder().encode(string);
    const hashBuffer = await crypto.subtle.digest("SHA-1", utf8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

// ─── HaveIBeenPwned API check ────────────────────────────────────────────────
async function isPasswordBreached(password) {
    if (!password || password.length < 8) return false;
    if (!window.crypto || !window.crypto.subtle) {
        return commonPasswords.includes(password.toLowerCase());
    }
    try {
        const hash = await sha1(password);
        const prefix = hash.slice(0, 5);
        const suffix = hash.slice(5);
        
        const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
        if (!response.ok) return false;
        
        const text = await response.text();
        const lines = text.split('\n');
        for (const line of lines) {
            const [partsuffix, count] = line.trim().split(':');
            if (partsuffix === suffix) {
                return parseInt(count) > 0;
            }
        }
    } catch (e) {
        console.error("HIBP API check failed:", e);
    }
    return false;
}

// ─── Password checklist live update ──────────────────────────────────────────
regPasswordInput?.addEventListener("blur", async () => {
    const val = regPasswordInput.value;
    if (val.length >= 8) {
        const isBreached = await isPasswordBreached(val);
        if (isBreached) {
            showFieldError("regPassword", "⚠ Warning: This password has been exposed in public data leaks. Choose a stronger password.");
        }
    }
});

regPasswordInput?.addEventListener("input", () => {
    const val = regPasswordInput.value;
    if (policyBox) policyBox.style.display = val.length > 0 ? "block" : "none";
    for (const [id, test] of Object.entries(rules)) {
        const li   = document.getElementById(id);
        if (!li) continue;
        const icon = li.querySelector(".pol-icon");
        if (val.length === 0) {
            li.classList.remove("pol-pass", "pol-fail");
            if (icon) icon.textContent = "✕";
        } else {
            const isMet = test(val);
            li.classList.toggle("pol-pass", isMet);
            li.classList.toggle("pol-fail", !isMet);
            if (icon) icon.textContent = isMet ? "✓" : "✕";
        }
    }
    updateStrengthMeter(val);
    if (regConfirmInput?.value.length > 0) {
        if (val !== regConfirmInput.value) {
            showFieldError("regConfirmPassword", "⚠ Passwords do not match.");
        } else {
            clearFieldError("regConfirmPassword");
        }
    }
});

// ─── Confirm password live check ──────────────────────────────────────────────
regConfirmInput?.addEventListener("blur", () => {
    const pass = regPasswordInput?.value || "";
    const conf = regConfirmInput.value;
    if (!conf)             showFieldError("regConfirmPassword", "⚠ Please confirm your password.");
    else if (pass !== conf) showFieldError("regConfirmPassword", "⚠ Passwords do not match.");
    else                    clearFieldError("regConfirmPassword");
});
regConfirmInput?.addEventListener("input", () => {
    const pass = regPasswordInput?.value || "";
    if (regConfirmInput.value.length > 0 && pass !== regConfirmInput.value) {
        showFieldError("regConfirmPassword", "⚠ Passwords do not match.");
    } else {
        clearFieldError("regConfirmPassword");
    }
});

// ─── Username: live format validation ────────────────────────────────────────
regUsernameInput?.addEventListener("input", () => {
    const val = regUsernameInput.value.trim();
    if (val.length > 0 && !/^[a-zA-Z0-9_]+$/.test(val)) {
        showFieldError("regUsername", "⚠ Only letters, numbers, and underscores are allowed.");
    } else if (val.length > 0 && containsProfanity(val)) {
        showFieldError("regUsername", "⚠ Username contains inappropriate language. Please choose another.");
    } else {
        clearFieldError("regUsername");
    }
});

// ─── Username: uniqueness check on blur ──────────────────────────────────────
regUsernameInput?.addEventListener("blur", async () => {
    const val = regUsernameInput.value.trim();
    if (!val || val.length < 3 || !/^[a-zA-Z0-9_]+$/.test(val)) return;
    if (containsProfanity(val)) return;
    try {
        const q    = query(collection(db, "users"), where("username", "==", val));
        const snap = await getDocs(q);
        if (!snap.empty) showFieldError("regUsername", "⚠ Username is already taken. Please choose another.");
        else             clearFieldError("regUsername");
    } catch (_) {}
});

// ─── First / Last name: block numbers and invalid characters on input ─────────
function blockNumbersInName(inputId, errorId) {
    document.getElementById(inputId)?.addEventListener("input", function () {
        // Strip invalid characters (anything other than letters, spaces, hyphens, and apostrophes) in real-time
        const clean = this.value.replace(/[^a-zA-Z\s'\-]/g, "");
        if (clean !== this.value) {
            const pos = this.selectionStart - (this.value.length - clean.length);
            this.value = clean;
            this.setSelectionRange(pos, pos);
            showFieldError(errorId, "⚠ Only letters, spaces, hyphens, and apostrophes are allowed.");
        } else {
            clearFieldError(errorId);
        }
    });
}
blockNumbersInName("regFirstName", "regFirstName");
blockNumbersInName("regLastName",  "regLastName");

// ─── Character Counters for registration modal ───────────────────────────────
function setupRegCharCounters() {
    const fields = ["regFirstName", "regLastName", "regUsername", "regContact"];
    fields.forEach(id => {
        const input = document.getElementById(id);
        if (!input) return;
        
        const maxLen = input.getAttribute("maxlength");
        if (!maxLen) return;
        
        let counterEl = document.getElementById(`counter-${id}`);
        if (!counterEl) {
            counterEl = document.createElement("div");
            counterEl.id = `counter-${id}`;
            counterEl.style.fontSize = "0.72rem";
            counterEl.style.color = "#64748b";
            counterEl.style.textAlign = "right";
            counterEl.style.marginTop = "4px";
            counterEl.style.fontWeight = "500";
            counterEl.textContent = `${input.value.length}/${maxLen}`;
            
            const group = document.getElementById(`ig-${id}`) || input;
            group.insertAdjacentElement("afterend", counterEl);
        }
        
        input.addEventListener("input", () => {
            counterEl.textContent = `${input.value.length}/${maxLen}`;
            if (input.value.length >= maxLen) {
                counterEl.style.color = "#dc2626";
            } else {
                counterEl.style.color = "#64748b";
            }
        });
    });
}
setupRegCharCounters();



// ─── Helpers ─────────────────────────────────────────────────────────────────
function sanitizeInput(str) {
    if (!str) return "";
    return str
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#x27;").replace(/\//g, "&#x2F;");
}

const disposableDomains = [
    "yopmail.com","mailinator.com","tempmail.com","trashmail.com",
    "dispostable.com","10minutemail.com","sharklasers.com","guerrillamail.com"
];

const commonPasswords = [
    "password123","12345678","qwertyuiop","welcome123","password",
    "123456789","marketra123","admin123","user123"
];

// ─── Registration form submit ─────────────────────────────────────────────────
document.getElementById("registerForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearAllErrors();



    // ── Rate limiting ─────────────────────────────────────────────────────────
    const now      = Date.now();
    const hourMs   = 60 * 60 * 1000;
    let regAttempts = JSON.parse(localStorage.getItem("reg_attempts") || "[]");
    regAttempts     = regAttempts.filter(t => now - t < hourMs);
    if (regAttempts.length >= 3) {
        alert("Registration Blocked: Too many registration requests. You can register a maximum of 3 accounts per hour. Please try again later.");
        return;
    }

    // ── Gather values ─────────────────────────────────────────────────────────
    const emailRaw    = document.getElementById("regContact").value;
    const email       = emailRaw.trim().toLowerCase();
    const firstName   = document.getElementById("regFirstName").value.trim();
    const lastName    = document.getElementById("regLastName").value.trim();
    const username    = document.getElementById("regUsername").value.trim();
    const password    = regPasswordInput.value;
    const confirmPass = regConfirmInput?.value || "";
    const dobValue    = regDobInput?.value || "";
    const gender      = document.getElementById("regGender")?.value || "";

    let hasError = false;

    // ── Email ─────────────────────────────────────────────────────────────────
    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
        showFieldError("regContact", "⚠ Please enter a valid email address (e.g., name@domain.com).");
        hasError = true;
    } else if (disposableDomains.includes(email.split("@")[1])) {
        showFieldError("regContact", "⚠ Disposable email addresses are not allowed.");
        hasError = true;

    }

    // ── First/Last name: letters, spaces, hyphens, apostrophes — NO numbers ──
    const nameRegex = /^[a-zA-Z\s'\-]+$/;
    if (!firstName || firstName.length < 2 || !nameRegex.test(firstName)) {
        showFieldError("regFirstName", "⚠ First name must be at least 2 characters (letters only — no numbers).");
        hasError = true;
    }
    if (!lastName || lastName.length < 2 || !nameRegex.test(lastName)) {
        showFieldError("regLastName", "⚠ Last name must be at least 2 characters (letters only — no numbers).");
        hasError = true;
    }

    // ── Username ──────────────────────────────────────────────────────────────
    if (!username || username.length < 3) {
        showFieldError("regUsername", "⚠ Username must be at least 3 characters.");
        hasError = true;
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        showFieldError("regUsername", "⚠ Only letters, numbers, and underscores are allowed.");
        hasError = true;
    } else if (username.length > 30) {
        showFieldError("regUsername", "⚠ Username must not exceed 30 characters.");
        hasError = true;
    } else if (containsProfanity(username)) {
        showFieldError("regUsername", "⚠ Username contains inappropriate language. Please choose another.");
        hasError = true;
    }

    // ── Date of Birth / Age ───────────────────────────────────────────────────
    const MIN_AGE = 18;
    if (!dobValue) {
        showFieldError("regDob", "⚠ Date of birth is required.");
        hasError = true;
    } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dob = new Date(dobValue);
        if (dob >= today) {
            showFieldError("regDob", "⚠ Date of birth cannot be today or in the future.");
            hasError = true;
        } else {
            const age = calcAge(dobValue);
            if (age < MIN_AGE) {
                showFieldError("regAge", `⚠ You must be at least ${MIN_AGE} years old to register. You are ${age} year(s) old.`);
                hasError = true;
            }
        }
    }

    // ── Gender ────────────────────────────────────────────────────────────────
    if (!gender) {
        showFieldError("regGender", "⚠ Please select a gender or pronouns option.");
        hasError = true;
    }

    // ── Password ──────────────────────────────────────────────────────────────
    const allRulesPassed = Object.values(rules).every(test => test(password));
    if (!allRulesPassed) {
        showFieldError("regPassword", "⚠ Password does not meet all requirements listed above.");
        hasError = true;
    } else if (commonPasswords.some(c => password.toLowerCase().includes(c))) {
        showFieldError("regPassword", "⚠ Password is too common. Choose a stronger password.");
        hasError = true;
    } else if (
        (username && password.toLowerCase().includes(username.toLowerCase())) ||
        (email    && password.toLowerCase().includes(email.split("@")[0].toLowerCase()))
    ) {
        showFieldError("regPassword", "⚠ Password must not contain your username or email address.");
        hasError = true;
    } else {
        // Breached Password check
        const isBreached = await isPasswordBreached(password);
        if (isBreached) {
            showFieldError("regPassword", "⚠ Warning: This password has been exposed in public data leaks. Choose a stronger password.");
            hasError = true;
        }
    }

    // ── Confirm password ──────────────────────────────────────────────────────
    if (!confirmPass) {
        showFieldError("regConfirmPassword", "⚠ Please confirm your password.");
        hasError = true;
    } else if (password !== confirmPass) {
        showFieldError("regConfirmPassword", "⚠ Passwords do not match.");
        hasError = true;
    }

    if (hasError) return;

    // ── Double-submit protection ──────────────────────────────────────────────
    if (regSubmitBtn) {
        regSubmitBtn.disabled = true;
        regSubmitBtn.innerHTML = `<span class="btn-spinner" aria-hidden="true"></span> Creating account…`;
    }

    try {
        // ── Username uniqueness ───────────────────────────────────────────────
        const usernameSnap = await getDocs(query(collection(db, "users"), where("username", "==", username)));
        if (!usernameSnap.empty) {
            showFieldError("regUsername", "⚠ Username is already taken. Please choose another.");
            return;
        }

        // ── Email uniqueness ──────────────────────────────────────────────────
        const emailSnap = await getDocs(query(collection(db, "users"), where("email", "==", email)));
        if (!emailSnap.empty) {
            showFieldError("regContact",
                `⚠ Email is already registered. <a href="#" id="reg-signin-link" style="color:#16a34a;font-weight:600;">Sign in instead?</a>`);
            document.getElementById("reg-signin-link")?.addEventListener("click", (ev) => {
                ev.preventDefault();
                document.getElementById("registerModal")?.classList.remove("active");
            });
            return;
        }

        // ── Create Firebase Auth account ──────────────────────────────────────
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);

        // ── Send verification email ───────────────────────────────────────────
        try { await sendEmailVerification(userCredential.user); } catch (_) {}

        // ── Rate limit log ────────────────────────────────────────────────────
        regAttempts.push(now);
        localStorage.setItem("reg_attempts", JSON.stringify(regAttempts));

        // ── Write Firestore profile ───────────────────────────────────────────
        const age = calcAge(dobValue);
        await setDoc(doc(db, "users", userCredential.user.uid), {
            firstName:   sanitizeInput(firstName),
            lastName:    sanitizeInput(lastName),
            username:    sanitizeInput(username),
            email:       email,
            gender:      gender,
            dateOfBirth: dobValue,
            age:         age,
            userRole:    "Vendor",
            createdAt:   new Date().toISOString()
        });

        alert("Account created successfully! A verification email has been sent to " + email + ". Please verify before logging in.");
        window.location.href = "../../Dashboards_Folder/UserDashboard/user.html";

    } catch (error) {
        if (error.code === "auth/email-already-in-use") {
            showFieldError("regContact",
                `⚠ Email is already registered. <a href="#" id="reg-signin-link" style="color:#16a34a;font-weight:600;">Sign in instead?</a>`);
            document.getElementById("reg-signin-link")?.addEventListener("click", (ev) => {
                ev.preventDefault();
                document.getElementById("registerModal")?.classList.remove("active");
            });
        } else {
            alert("Registration Error: " + error.message);
        }
    } finally {
        if (regSubmitBtn) {
            regSubmitBtn.disabled      = false;
            regSubmitBtn.style.opacity = "1";
            regSubmitBtn.textContent   = "Create Account";
        }
    }
});