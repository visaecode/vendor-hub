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

document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('regContact').value.trim();

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    alert("Please enter a valid email address (e.g. juan@gmail.com).");
    return;
  }

  const password = regPasswordInput.value;
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
  if (!passwordRegex.test(password)) {
    alert("Password must contain at least 8 characters, 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.");
    return;
  }

  const firstName = document.getElementById('regFirstName').value.trim();
  const lastName = document.getElementById('regLastName').value.trim();
  const username = document.getElementById('regUsername').value.trim();

  const res = await fetch("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, username, firstName, lastName, password }),
  });

  const data = await res.json();
  if (!res.ok) return alert(data.error);

  alert("Account created successfully! You can now sign in.");
  closeModal();
});