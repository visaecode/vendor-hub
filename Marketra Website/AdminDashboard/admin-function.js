document.addEventListener("DOMContentLoaded", () => {
    
    // ==========================================
    // 1. SYSTEM VIEW ROUTER CONTROLLER
    // ==========================================
    const navLinks = document.querySelectorAll(".nav-link, [data-target]");
    const appViews = document.querySelectorAll(".app-view");

    function switchView(targetViewId, linkedSubtab = null) {
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

        if (linkedSubtab) {
            if (targetViewId === "view-billing-finance") {
                const subBtn = document.querySelector(`[data-pane="finance-pane-${linkedSubtab}"]`);
                if (subBtn) subBtn.click();
            } else if (targetViewId === "view-stall-map") {
                const subMapBtn = document.getElementById(`subtab-trigger-${linkedSubtab}`);
                if (subMapBtn) subMapBtn.click();
            } else if (targetViewId === "view-field-verification") {
                const subVBtn = document.getElementById(`vbtn-${linkedSubtab}`);
                if (subVBtn) subVBtn.click();
            }
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    navLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const target = link.getAttribute("data-target");
            const subtab = link.getAttribute("data-subtab");
            if (target) switchView(target, subtab);
        });
    });


    // ==========================================
    // 2. INNER MODULES TAB NAVIGATION DRIVERS
    // ==========================================
    const subtabButtons = document.querySelectorAll(".subtab-btn");
    subtabButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetPaneId = btn.getAttribute("data-pane");
            btn.parentElement.querySelectorAll(".subtab-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            const paneWrapper = btn.parentElement.nextElementSibling;
            paneWrapper.querySelectorAll(".subtab-pane").forEach(pane => pane.classList.remove("active"));
            document.getElementById(targetPaneId).classList.add("active");
        });
    });

    const mapTabs = document.querySelectorAll(".map-subtab");
    mapTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            mapTabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");

            const idStr = tab.id.replace("subtab-trigger-", "map-pane-");
            document.querySelectorAll(".map-content-pane").forEach(p => p.classList.remove("active-panel"));
            document.getElementById(idStr).classList.add("active-panel");
        });
    });

    const vTabs = document.querySelectorAll(".vtab-btn");
    vTabs.forEach(v => {
        v.addEventListener("click", () => {
            vTabs.forEach(t => t.classList.remove("active"));
            v.classList.add("active");

            const idStr = v.id.replace("vbtn-", "vpane-");
            document.querySelectorAll(".v-pane-item").forEach(p => p.classList.remove("active-pane"));
            document.getElementById(idStr).classList.add("active-pane");
        });
    });


    // ==========================================
    // 3. ANNOUNCEMENT CREATION DISPATCH SYSTEM
    // ==========================================
    const annForm = document.getElementById("announcement-creation-form");
    const feedContainer = document.getElementById("live-announcement-feed");

    annForm.addEventListener("submit", (e) => {
        e.preventDefault();
        
        const titleText = document.getElementById("ann-input-title").value.trim();
        const priorityText = document.getElementById("ann-input-priority").value;
        const msgText = document.getElementById("ann-input-msg").value.trim();
        
        const badgeClass = (priorityText === "High") ? "badge-red-solid" : "badge-gray-solid";

        const newItem = document.createElement("div");
        newItem.className = "ann-feed-item";
        newItem.style.borderLeft = (priorityText === "High") ? "4px solid #EF4444" : "1px solid #E2E8F0";
        newItem.innerHTML = `
            <div class="ann-item-header"><strong>${titleText}</strong><span class="badge ${badgeClass}">${priorityText}</span></div>
            <p>${msgText}</p>
            <span class="ann-date">Posted: Live Just Now</span>
        `;

        feedContainer.insertBefore(newItem, feedContainer.firstChild);
        annForm.reset();
        alert("Announcement queued for database pipeline entry dispatch!");
    });


    // ==========================================
    // 4. FINANCIAL REVENUE CALCULATOR CALCS
    // ==========================================
    const calcSize = document.getElementById("calc-size");
    const calcZone = document.getElementById("calc-zone");
    const calcDailyBox = document.getElementById("calc-daily-fee");
    const durationBadges = document.querySelectorAll(".duration-badge");

    let selectedMonths = 12;

    durationBadges.forEach(badge => {
        badge.addEventListener("click", () => {
            durationBadges.forEach(b => b.classList.remove("active"));
            badge.classList.add("active");
            selectedMonths = parseInt(badge.getAttribute("data-months"));
            runFeeCalculationLogic();
        });
    });

    function runFeeCalculationLogic() {
        const baseMonthlyValue = parseInt(calcSize.value === "6000" ? "500" : "330");
        const principalBaseFee = baseMonthlyValue * selectedMonths;
        
        const zoneSurchargeRate = parseFloat(calcZone.value);
        const compiledSurchargeValue = principalBaseFee * zoneSurchargeRate;
        
        const dailyInclusionFeeValue = calcDailyBox.checked ? (25 * selectedMonths * 4) : 0; 
        const aggregateFinalTotal = principalBaseFee + compiledSurchargeValue + dailyInclusionFeeValue;

        document.getElementById("lbl-calc-base").textContent = `₱${principalBaseFee.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        document.getElementById("lbl-calc-sur").textContent = `₱${compiledSurchargeValue.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        document.getElementById("lbl-calc-total").textContent = `₱${aggregateFinalTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
    }

    calcSize.addEventListener("change", runFeeCalculationLogic);
    calcZone.addEventListener("change", runFeeCalculationLogic);
    calcDailyBox.addEventListener("change", runFeeCalculationLogic);

    document.getElementById("btn-create-invoice-calc").addEventListener("click", () => {
        alert("Fee payload processed into invoice record generation state.");
    });


    // ==========================================
    // 5. MODAL INTERACTIVE PORTALS HANDLERS
    // ==========================================
    const payModal = document.getElementById("modal-portal-payment");
    const recModal = document.getElementById("modal-portal-receipt");

    document.getElementById("btn-trigger-payment-modal").addEventListener("click", () => payModal.style.display = "flex");
    document.getElementById("btn-close-pay-modal").addEventListener("click", () => payModal.style.display = "none");
    
    document.getElementById("modal-form-log-pay").addEventListener("submit", (e) => {
        e.preventDefault();
        payModal.style.display = "none";
        alert("Payment payload successfully recorded.");
    });

    // Helper close routing targeting generated code hooks
    window.closeReceiptModalWindow = function() {
        recModal.style.display = "none";
    };


    // ==========================================
    // 6. FIELD OPERATION CONTROLLERS (DECOUPLED FROM SPECIFIC RECORDS)
    // ==========================================
    const runScanTrigger = document.getElementById("btn-run-scan-trigger");
    const scanResultPane = document.getElementById("scan-result-pane-box");

    // Dynamic fetch placeholder hook for QR scanning validation
    async function queryScannedPermitFromDB(permitNo) {
        /* Implementation format when connected to database:
           const response = await fetch(`/api/admin/verify-permit/${permitNo}`);
           return response.ok ? await response.json() : null;
        */
        return null;
    }

    runScanTrigger.addEventListener("click", async () => {
        const queryText = document.getElementById("scan-simulation-input").value.trim();
        if (!queryText) return;

        const dbRecord = await queryScannedPermitFromDB(queryText);

        if (dbRecord) {
            scanResultPane.innerHTML = `
                <div class="qr-output-card-wrapper animate-fade-in">
                    <i class="fa-solid fa-circle-check" style="font-size:3rem; color:#2E7D32;"></i>
                    <h4 class="spacer-top">${dbRecord.vendorName}</h4>
                    <p class="text-xs text-muted">${dbRecord.permitNo}</p>
                    <div class="table-card-content text-left text-xs spacer-top background-muted" style="grid-template-columns:1fr; gap:6px;">
                        <div><span class="t-lbl">Stall:</span> <b>${dbRecord.stallNo}</b></div>
                        <div><span class="t-lbl">Status:</span> <b class="green-txt">Valid & Compliant</b></div>
                    </div>
                </div>`;
        } else {
            scanResultPane.innerHTML = `
                <div class="text-center animate-fade-in">
                    <i class="fa-regular fa-circle-xmark big-danger-cross-icon"></i>
                    <h4 class="spacer-top">Verification Pipeline Notice</h4>
                    <p class="text-muted text-xs spacer-top">Backend verification query complete. Awaiting active database integration layer link to match identifier "${queryText}".</p>
                </div>`;
        }
    });

    const btnInstant = document.getElementById("btn-trigger-instant-audit");
    const instantFailBox = document.getElementById("instant-audit-failure-box");

    btnInstant.addEventListener("click", () => {
        const matchVal = document.getElementById("input-search-instant-audit").value.trim();
        if (!matchVal) return;
        
        // Default clean state fallback for empty sandbox operations
        instantFailBox.style.display = "block";
    });
});