document.addEventListener("DOMContentLoaded", () => {
    
    // ==========================================
    // 1. NAVIGATION ROUTER CONTROL CORE
    // ==========================================
    const navLinks = document.querySelectorAll(".nav-link, .bread-link, .quick-card, [data-target]");
    const appViews = document.querySelectorAll(".app-view");

    function switchView(targetViewId) {
        const targetView = document.getElementById(targetViewId);
        if (!targetView) return;

        appViews.forEach(view => view.classList.remove("active"));
        targetView.classList.add("active");

        document.querySelectorAll(".nav-link").forEach(link => {
            if (link.getAttribute("data-target") === targetViewId) {
                link.classList.add("active");
            } else {
                link.classList.remove("active");
            }
        });

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    navLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const target = link.getAttribute("data-target");
            if (target) switchView(target);
        });
    });

    document.querySelector('[data-action="start-app"]')?.addEventListener("click", () => switchView("view-new-registration"));
    document.querySelector('[data-action="view-guide"]')?.addEventListener("click", () => switchView("view-reg-guide"));


    // ==========================================
    // 2. DAY BADGES MULTI-SELECT INTERACTIVE ROW
    // ==========================================
    const dayBadges = document.querySelectorAll(".day-badge");
    dayBadges.forEach(badge => {
        badge.addEventListener("click", () => {
            badge.classList.toggle("selected");
        });
    });


    // ==========================================
    // 3. WIZARD WIDGET CONTROLLER (NEW REGISTRATION)
    // ==========================================
    let currentRegStep = 1;
    const totalRegSteps = 5;

    const btnRegNext = document.getElementById("btn-reg-next");
    const btnRegPrev = document.getElementById("btn-reg-prev");
    const btnRegCancel = document.getElementById("btn-reg-cancel");
    const newRegForm = document.getElementById("new-registration-form");

    function updateRegistrationWizardUI() {
        for (let i = 1; i <= totalRegSteps; i++) {
            const pane = document.getElementById(`reg-pane-${i}`);
            if (pane) pane.classList.toggle("active", i === currentRegStep);
        }

        const wizardSteps = document.querySelectorAll("#reg-wizard-steps .wiz-step");
        const wizardLines = document.querySelectorAll("#reg-wizard-steps .wiz-line");

        wizardSteps.forEach((stepElement, idx) => {
            const stepNum = idx + 1;
            stepElement.classList.remove("active", "completed");
            
            if (stepNum === currentRegStep) {
                stepElement.classList.add("active");
            } else if (stepNum < currentRegStep) {
                stepElement.classList.add("completed");
                stepElement.querySelector(".wiz-num").innerHTML = '<i class="fa-solid fa-check"></i>';
            } else {
                stepElement.querySelector(".wiz-num").textContent = stepNum;
            }
        });

        wizardLines.forEach((lineElement, idx) => {
            lineElement.classList.toggle("filled", idx + 1 < currentRegStep);
        });

        if (currentRegStep === 1) {
            btnRegPrev.style.display = "none";
            btnRegCancel.style.display = "inline-block";
            btnRegNext.innerHTML = "Next Step &rarr;";
        } else {
            btnRegPrev.style.display = "inline-block";
            btnRegCancel.style.display = "none";
            
            if (currentRegStep === totalRegSteps) {
                btnRegNext.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Submit Application';
            } else {
                btnRegNext.innerHTML = "Next Step &rarr;";
            }
        }
    }

    btnRegNext.addEventListener("click", (e) => {
        e.preventDefault(); 
        
        if (currentRegStep < totalRegSteps) {
            if (currentRegStep === totalRegSteps - 1) {
                const reviewContainer = document.querySelector(".review-block-container");
                const inputs = newRegForm.querySelectorAll("input, select");
                let summaryHTML = `<p class="pane-desc">Please double check all submitted answers before confirmation.</p>
                                   <div class="table-summary-card">
                                        <div class="table-card-header-plain"></div>
                                        <div class="table-card-content layout-2col-grid">`;
                
                inputs.forEach(input => {
                    const labelText = input.parentElement.querySelector("label")?.textContent.replace('*', '').trim() || "Field";
                    const valueText = input.value || "Not provided";
                    summaryHTML += `<div><span class="t-lbl">${labelText}:</span><span class="t-val">${valueText}</span></div>`;
                });
                
                summaryHTML += `</div></div>`;
                reviewContainer.innerHTML = summaryHTML;
            }

            currentRegStep++;
            updateRegistrationWizardUI();
        } else {
            alert("Application submitted successfully!");
            switchView("view-my-applications");
            currentRegStep = 1;
            newRegForm.reset();
            document.querySelectorAll(".day-badge").forEach(b => b.classList.remove("selected"));
            updateRegistrationWizardUI();
        }
    });

    btnRegPrev.addEventListener("click", (e) => {
        e.preventDefault();
        if (currentRegStep > 1) {
            currentRegStep--;
            updateRegistrationWizardUI();
        }
    });

    btnRegCancel.addEventListener("click", (e) => {
        e.preventDefault();
        if (confirm("Are you sure you want to cancel? All progress will be cleared.")) {
            newRegForm.reset();
            currentRegStep = 1;
            updateRegistrationWizardUI();
            switchView("view-dashboard");
        }
    });


    // ==========================================
    // 4. PERMIT RENEWAL FLOW DATABASE CONNECTION ENGINE
    // ==========================================
    let currentRenewStep = 1;
    const totalRenewSteps = 4;

    const btnVerifyPermit = document.getElementById("btn-verify-permit");
    const resultCard = document.getElementById("renew-verification-result");
    const btnRenewNext = document.getElementById("btn-renew-next");
    const btnRenewPrev = document.getElementById("btn-renew-prev");

    // Placeholder Function to attach your backend database API endpoint fetch
    async function fetchPermitRecordFromDB(permitNo, lastName) {
        /* Example live code implementation when server is ready:
           const response = await fetch(`/api/permits/verify?no=${permitNo}&name=${lastName}`);
           if (!response.ok) return null;
           return await response.json();
        */
        return null; 
    }

    btnVerifyPermit.addEventListener("click", async () => {
        const pNo = document.getElementById("renew-input-permit").value.trim();
        const lName = document.getElementById("renew-input-lastname").value.trim();

        if (!pNo || !lName) {
            alert("Please fill in both required verification fields.");
            return;
        }

        const record = await fetchPermitRecordFromDB(pNo, lName);

        if (record) {
            document.getElementById("vf-no").textContent = record.permitNo;
            document.getElementById("vf-vendor").textContent = record.vendorName;
            document.getElementById("vf-stall").textContent = record.stallNo;
            document.getElementById("vf-zone").textContent = record.zoneName;
            
            resultCard.style.display = "block";
            btnRenewNext.removeAttribute("disabled");
        } else {
            // Baseline Fallback layout behavior while database remains decoupled
            resultCard.style.display = "none";
            btnRenewNext.setAttribute("disabled", "true");
            alert("Database connection context: Awaiting backend server pipeline integration to complete query lookup.");
        }
    });

    function updateRenewWizardUI() {
        for (let i = 1; i <= totalRenewSteps; i++) {
            const pane = document.getElementById(`renew-pane-${i}`);
            if (pane) pane.classList.toggle("active", i === currentRenewStep);
        }

        const steps = document.querySelectorAll("#renew-wizard-steps .wiz-step");
        const lines = document.querySelectorAll("#renew-wizard-steps .wiz-line");

        steps.forEach((step, idx) => {
            const sNum = idx + 1;
            step.classList.remove("active", "completed");
            if (sNum === currentRenewStep) {
                step.classList.add("active");
            } else if (sNum < currentRenewStep) {
                step.classList.add("completed");
                step.querySelector(".wiz-num").innerHTML = '<i class="fa-solid fa-check"></i>';
            } else {
                step.querySelector(".wiz-num").textContent = sNum;
            }
        });

        lines.forEach((line, idx) => {
            line.classList.toggle("filled", idx + 1 < currentRenewStep);
        });

        btnRenewPrev.style.display = (currentRenewStep === 1) ? "none" : "inline-block";
        
        if (currentRenewStep === totalRenewSteps) {
            btnRenewNext.innerHTML = '<i class="fa-solid fa-rotate"></i> Submit Renewal';
        } else {
            btnRenewNext.innerHTML = "Next Step &rarr;";
        }
    }

    btnRenewNext.addEventListener("click", () => {
        if (currentRenewStep < totalRenewSteps) {
            if (currentRenewStep === 2) {
                document.getElementById("rv-bname").textContent = document.getElementById("ren-bname").value || "-";
                document.getElementById("rv-cat").textContent = document.getElementById("ren-cat").value || "-";
                document.getElementById("rv-phone").textContent = document.getElementById("ren-phone").value || "-";
                document.getElementById("rv-email").textContent = document.getElementById("ren-email").value || "-";
                document.getElementById("rv-addr").textContent = document.getElementById("ren-address").value || "-";
                
                document.getElementById("rv-pno").textContent = document.getElementById("vf-no").textContent;
                document.getElementById("rv-stallno").textContent = document.getElementById("vf-stall").textContent;
                document.getElementById("rv-zoneno").textContent = document.getElementById("vf-zone").textContent;
            }
            
            currentRenewStep++;
            updateRenewWizardUI();
        } else {
            alert("Permit renewal request processed successfully!");
            switchView("view-my-applications");
            currentRenewStep = 1;
            resultCard.style.display = "none";
            btnRenewNext.setAttribute("disabled", "true");
            updateRenewWizardUI();
        }
    });

    btnRenewPrev.addEventListener("click", () => {
        if (currentRenewStep > 1) {
            currentRenewStep--;
            updateRenewWizardUI();
        }
    });


    // ==========================================
    // 5. FAQS ENGINE ACCORDION TRIGGER LOGIC
    // ==========================================
    const accordionTriggers = document.querySelectorAll(".accordion-trigger");

    accordionTriggers.forEach(trigger => {
        trigger.addEventListener("click", () => {
            const parentItem = trigger.parentElement;
            const panel = trigger.nextElementSibling;
            const isOpen = parentItem.classList.contains("open");

            document.querySelectorAll(".accordion-item").forEach(item => {
                item.classList.remove("open");
                item.querySelector(".accordion-panel").style.maxHeight = null;
            });

            if (!isOpen) {
                parentItem.classList.add("open");
                panel.style.maxHeight = panel.scrollHeight + "px";
            }
        });
    });


    // ==========================================
    // 6. REALTIME REGEX PATTERN SEARCH ENGINE FOR FAQ
    // ==========================================
    const faqSearchInput = document.getElementById("faq-search-input");
    const faqItems = document.querySelectorAll(".accordion-item");
    const categoryBlocks = document.querySelectorAll(".faq-category-block");

    faqSearchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase().trim();

        faqItems.forEach(item => {
            const questionText = item.querySelector(".accordion-trigger span").textContent.toLowerCase();
            const answerText = item.querySelector(".accordion-panel p").textContent.toLowerCase();

            if (questionText.includes(query) || answerText.includes(query)) {
                item.style.display = "block";
            } else {
                item.style.display = "none";
                item.classList.remove("open");
                item.querySelector(".accordion-panel").style.maxHeight = null;
            }
        });

        categoryBlocks.forEach(block => {
            const totalVisibleChildren = block.querySelectorAll('.accordion-item[style="display: block;"]').length;
            const totalItems = block.querySelectorAll('.accordion-item').length;
            const absoluteHidden = block.querySelectorAll('.accordion-item[style="display: none;"]').length;

            if (absoluteHidden === totalItems) {
                block.style.display = "none";
            } else {
                block.style.display = "block";
            }
        });
    });
});