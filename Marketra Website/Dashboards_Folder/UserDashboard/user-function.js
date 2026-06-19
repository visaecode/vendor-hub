import { auth, db } from "../../Login_Folder/LoginSystem/firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { doc, getDoc, collection, query, where, getDocs, addDoc, onSnapshot, updateDoc, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

let userProfileName = "";
let userProfileStall = "";

// Helper to render a dynamic application card
function renderApplicationCard(app) {
    const statusClass = app.status === "Approved" ? "status-approved" : "status-review";
    const statusText = app.status || "Pending";
    const formattedDate = app.createdAt ? new Date(app.createdAt).toLocaleDateString() : "N/A";
    const badgeIcon = app.status === "Approved" ? '<i class="fa-solid fa-circle-check"></i>' : '<i class="fa-solid fa-clock"></i>';

    return `
        <div class="app-status-card">
            <div class="app-card-header">
                <div>
                    <h3>${app.applicationType || "Stall Application"}</h3>
                    <span class="ref-number">Ref: ${app.id ? app.id.slice(0, 8).toUpperCase() : 'APP-' + Math.random().toString(36).substr(2, 6).toUpperCase()}</span>
                </div>
                <span class="badge ${statusClass}">
                    ${badgeIcon} ${statusText}
                </span>
            </div>
            <div class="app-card-details">
                <div>
                    <span class="label">STALL PREFERENCE</span>
                    <span class="val">${app.preferredZone || "N/A"} - ${app.stallSize || "Ng/A"}</span>
                </div>
                <div>
                    <span class="label">BUSINESS NAME</span>
                    <span class="val">${app.businessName || "N/A"}</span>
                </div>
                <div>
                    <span class="label">SUBMITTED ON</span>
                    <span class="val">${formattedDate}</span>
                </div>
            </div>
            <div class="card-alert ${app.status === 'Approved' ? 'alert-green' : 'alert-blue'} flex-between">
                <span>
                    ${app.status === 'Approved' 
                      ? '<strong>Congratulations!</strong> Your permit has been approved. Please pay the permit fee to finalize.' 
                      : '<strong>Under Review:</strong> Admin is currently verifying your submitted documents.'}
                </span>
                ${app.status === 'Approved' 
                  ? '<a href="#" class="underline-link" data-target="view-billing-finance">Pay Fee &rarr;</a>' 
                  : ''}
            </div>
        </div>
    `;
}

let switchViewGlobal;

// Set up real-time listener for user's applications
function setupApplicationsListener(uid) {
    const appsQuery = query(collection(db, "applications"), where("userId", "==", uid));
    onSnapshot(appsQuery, (snapshot) => {
        const container = document.getElementById("user-applications-container");
        if (!container) return;

        if (snapshot.empty) {
            container.innerHTML = `
                <div class="content-card text-center text-muted text-sm">
                    No ongoing applications found. Click "New Registration" to get started.
                </div>
            `;
        } else {
            let cardsHTML = "";
            const appsList = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                data.id = doc.id;
                appsList.push(data);
            });
            // Sort by createdAt descending (newest first)
            appsList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            appsList.forEach(app => {
                cardsHTML += renderApplicationCard(app);
            });
            container.innerHTML = cardsHTML;
            
            // Wire navigation clicks for links rendered inside the card
            container.querySelectorAll("[data-target]").forEach(link => {
                link.addEventListener("click", (e) => {
                    e.preventDefault();
                    const target = link.getAttribute("data-target");
                    if (target && switchViewGlobal) switchViewGlobal(target);
                });
            });
        }
    });
}

let unsubscribeNotifs = null;

// Escapes special HTML characters to prevent XSS
function escapeHTML(str) {
    if (!str) return "";
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// Formats timestamp relative to now
function formatNotifTime(dateStr) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Set up real-time listener for user's notifications
function setupNotificationsListener(uid) {
    if (unsubscribeNotifs) unsubscribeNotifs();

    const notifQuery = query(collection(db, "notifications"), where("userId", "==", uid));
    
    unsubscribeNotifs = onSnapshot(notifQuery, async (snapshot) => {
        const listContainer = document.getElementById("notif-list");
        const badge = document.getElementById("bell-badge");
        
        if (!listContainer) return;

        // Populate a welcome notification if user has no notifications
        if (snapshot.empty) {
            try {
                await addDoc(collection(db, "notifications"), {
                    userId: uid,
                    title: "Welcome to Marketra!",
                    description: "Start managing your public market stall applications or permit renewals directly from your dashboard.",
                    type: "info",
                    read: false,
                    createdAt: new Date().toISOString()
                });
            } catch (err) {
                console.error("Error creating welcome notification:", err);
            }
            return;
        }

        const notifs = [];
        let unreadCount = 0;
        
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            data.id = docSnap.id;
            notifs.push(data);
            if (!data.read) {
                unreadCount++;
            }
        });

        // Sort by createdAt descending
        notifs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Update badge UI
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.style.display = "flex";
            } else {
                badge.style.display = "none";
            }
        }

        // Render HTML
        let html = "";
        notifs.forEach(notif => {
            const iconClass = notif.type === "success" ? "fa-circle-check" : notif.type === "warning" ? "fa-triangle-exclamation" : "fa-info-circle";
            const typeClass = notif.type || "info";
            const unreadClass = notif.read ? "" : "unread";
            const formattedTime = formatNotifTime(notif.createdAt);

            html += `
                <div class="notif-item ${unreadClass}" data-id="${notif.id}">
                    <div class="notif-icon ${typeClass}">
                        <i class="fa-solid ${iconClass}"></i>
                    </div>
                    <div class="notif-content">
                        <span class="notif-title">${escapeHTML(notif.title)}</span>
                        <span class="notif-desc">${escapeHTML(notif.description)}</span>
                        <span class="notif-time">${formattedTime}</span>
                    </div>
                </div>
            `;
        });

        listContainer.innerHTML = html;

        // Bind clicks on notification items to mark them as read
        listContainer.querySelectorAll(".notif-item").forEach(item => {
            item.addEventListener("click", async () => {
                const notifId = item.getAttribute("data-id");
                const targetNotif = notifs.find(n => n.id === notifId);
                if (targetNotif && !targetNotif.read) {
                    try {
                        await updateDoc(doc(db, "notifications", notifId), { read: true });
                    } catch (err) {
                        console.error("Error marking notification as read:", err);
                    }
                }
            });
        });
    });
}

let unsubscribeNotices = null;
function setupNoticesListener() {
    if (unsubscribeNotices) unsubscribeNotices();
    const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"), limit(5));
    unsubscribeNotices = onSnapshot(q, (snapshot) => {
        const container = document.getElementById("dashboard-notices-container");
        if (!container) return;

        if (snapshot.empty) {
            container.innerHTML = `<li class="text-muted text-sm text-center padding-y-12">No notices posted yet...</li>`;
            return;
        }

        let html = "";
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const title = data.title || "Notice";
            const priority = data.priority || "Normal";
            const message = data.message || "";
            const date = data.createdAt ? new Date(data.createdAt).toLocaleDateString() : "N/A";
            
            const priorityBadge = priority === "High" ? `<span class="badge badge-red-solid" style="background:#ef4444; color:white; font-size:10px; padding:2px 6px; border-radius:4px; margin-left: 8px;">High</span>` : "";

            html += `
                <li class="notice-item" style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; list-style:none;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 4px;">
                        <strong style="color: #1e293b; font-size: 0.95rem;">${escapeHTML(title)}</strong>
                        ${priorityBadge}
                    </div>
                    <p style="margin: 0 0 4px 0; font-size: 0.85rem; color:#64748b; line-height: 1.4;">${escapeHTML(message)}</p>
                    <span style="font-size: 0.75rem; color: #94a3b8;">${date}</span>
                </li>
            `;
        });
        container.innerHTML = html;
    });
}

let unsubscribeUser = null;
let unsubscribeInvoices = null;
let unsubscribePayments = null;

function setupFinanceListeners() {
    if (unsubscribeInvoices) unsubscribeInvoices();
    if (unsubscribePayments) unsubscribePayments();

    unsubscribeInvoices = onSnapshot(collection(db, "invoices"), (snapshot) => {
        const invoicesList = [];
        snapshot.forEach(docSnap => {
            const inv = docSnap.data();
            inv.id = docSnap.id;
            
            const matchesName = userProfileName && inv.vendorName && inv.vendorName.toLowerCase() === userProfileName.toLowerCase();
            const matchesStall = userProfileStall && inv.stallNo && inv.stallNo.toLowerCase() === userProfileStall.toLowerCase();
            
            if (matchesName || matchesStall) {
                invoicesList.push(inv);
            }
        });

        invoicesList.sort((a, b) => new Date(b.issuedDate) - new Date(a.issuedDate));

        renderUserInvoicesTable(invoicesList);
        updateFinanceKPIs(invoicesList);
    });

    unsubscribePayments = onSnapshot(collection(db, "payments"), (snapshot) => {
        const paymentsList = [];
        snapshot.forEach(docSnap => {
            const pay = docSnap.data();
            pay.id = docSnap.id;
            
            const matchesName = userProfileName && pay.vendorName && pay.vendorName.toLowerCase() === userProfileName.toLowerCase();
            const matchesStall = userProfileStall && pay.stallNo && pay.stallNo.toLowerCase() === userProfileStall.toLowerCase();
            
            if (matchesName || matchesStall) {
                paymentsList.push(pay);
            }
        });

        paymentsList.sort((a, b) => new Date(b.date) - new Date(a.date));

        renderUserPaymentsTable(paymentsList);
    });
}

function downloadCertificate(inv) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
    });

    const width = 297;
    const height = 210;

    // Draw borders
    doc.setDrawColor(20, 52, 36);
    doc.setLineWidth(1.5);
    doc.rect(10, 10, width - 20, height - 20);
    doc.rect(12, 12, width - 24, height - 24);

    // Draw corner decorations
    doc.setFillColor(20, 52, 36);
    doc.rect(10, 10, 8, 8, 'F');
    doc.rect(width - 18, 10, 8, 8, 'F');
    doc.rect(10, height - 18, 8, 8, 'F');
    doc.rect(width - 18, height - 18, 8, 8, 'F');

    // Header Logo/Title
    doc.setTextColor(20, 52, 36);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.text("ALTURA PUBLIC MARKET", width / 2, 35, { align: "center" });

    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.text("Altura Zone Operations Section — City of Manila", width / 2, 42, { align: "center" });

    // Divider Line
    doc.setDrawColor(35, 105, 68);
    doc.setLineWidth(0.5);
    doc.line(40, 48, width - 40, 48);

    // Certificate Title
    doc.setTextColor(198, 40, 40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("CERTIFICATE OF STALL REGISTRATION", width / 2, 62, { align: "center" });

    // Body text
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text("This is to certify and officially recognize that", width / 2, 75, { align: "center" });

    // Vendor Name
    doc.setTextColor(20, 52, 36);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(inv.vendorName.toUpperCase(), width / 2, 88, { align: "center" });

    // Description text
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text("has complied with all regulatory clearances, background document verifications,", width / 2, 100, { align: "center" });
    doc.text("and financial commitments required to operate at Altura Public Market.", width / 2, 106, { align: "center" });

    doc.text("Specifically, the registered vendor is assigned to:", width / 2, 116, { align: "center" });

    // Stall No Badge Box
    doc.setFillColor(232, 245, 233);
    doc.rect(width / 2 - 45, 122, 90, 12, 'F');
    doc.setDrawColor(46, 125, 50);
    doc.setLineWidth(0.3);
    doc.rect(width / 2 - 45, 122, 90, 12, 'D');

    doc.setTextColor(46, 125, 50);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`STALL NUMBER: ${inv.stallNo}`, width / 2, 130, { align: "center" });

    // Details Block (Table format at bottom-left)
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Invoice Reference: ${inv.invoiceNo}`, 30, 160);
    doc.text(`Billing Status: PAID & SETTLED`, 30, 165);
    doc.text(`Date of Issuance: ${inv.issuedDate}`, 30, 170);
    const issueDateObj = new Date(inv.issuedDate);
    const expiryDate = new Date(issueDateObj.setFullYear(issueDateObj.getFullYear() + 1)).toISOString().split('T')[0];
    doc.text(`Expiry Date: ${expiryDate}`, 30, 175);

    // Seal decoration (circular badge)
    doc.setFillColor(255, 248, 225);
    doc.setDrawColor(230, 81, 0);
    doc.circle(width / 2, 168, 14, 'FD');
    doc.setTextColor(230, 81, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("APPROVED", width / 2, 166, { align: "center" });
    doc.setFontSize(6);
    doc.text("ALTURA BOARD", width / 2, 171, { align: "center" });
    doc.text("★ OFFICIAL ★", width / 2, 175, { align: "center" });

    // Signatures (Bottom-right)
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.line(width - 90, 168, width - 30, 168);
    doc.text("MARKET ADMINISTRATOR", width - 60, 174, { align: "center" });
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Altura Public Market Board Authority", width - 60, 179, { align: "center" });

    // Save PDF
    doc.save(`Stall_Certificate_${inv.stallNo}.pdf`);
}

function renderUserInvoicesTable(invoices) {
    const tbody = document.getElementById("user-invoices-table-body");
    if (!tbody) return;

    if (invoices.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted text-sm" style="padding: 16px 20px; text-align: center;">No invoices found.</td>
            </tr>
        `;
        return;
    }

    let html = "";
    invoices.forEach(inv => {
        const isPaid = inv.status === "Paid";
        const actionHtml = isPaid 
            ? `<div style="display: flex; align-items: center; gap: 8px;">
                   <span class="badge status-approved"><i class="fa-solid fa-circle-check"></i> Paid</span>
                   <button class="btn btn-outline user-cert-btn" style="padding: 4px 10px; font-size: 0.72rem; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; cursor: pointer; border: 1px solid var(--sidebar-active); color: var(--sidebar-active);" data-id="${inv.id}"><i class="fa-solid fa-file-pdf"></i> Certificate</button>
               </div>`
            : `<button class="btn-blue-action-item user-pay-btn" data-id="${inv.id}" data-invoice="${inv.invoiceNo}" data-amount="${inv.amount}">Pay Now</button>`;

        const statusClass = isPaid ? "status-approved" : "status-review";

        html += `
            <tr style="border-bottom: 1px solid #F1F5F9;">
                <td style="padding: 14px 16px;"><strong>${escapeHTML(inv.invoiceNo)}</strong></td>
                <td style="padding: 14px 16px;">${escapeHTML(inv.stallNo)}</td>
                <td style="padding: 14px 16px;">₱${inv.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td style="padding: 14px 16px;">${inv.issuedDate}</td>
                <td style="padding: 14px 16px;">${inv.dueDate}</td>
                <td style="padding: 14px 16px;"><span class="badge ${statusClass}">${inv.status}</span></td>
                <td style="padding: 14px 16px;">${actionHtml}</td>
            </tr>
        `;
    });
    tbody.innerHTML = html;

    tbody.querySelectorAll(".user-pay-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = btn.getAttribute("data-id");
            const invNo = btn.getAttribute("data-invoice");
            const amount = parseFloat(btn.getAttribute("data-amount"));
            
            const modal = document.getElementById("modal-portal-user-payment");
            if (modal) {
                document.getElementById("user-pay-modal-invoice-id").value = id;
                document.getElementById("user-pay-modal-invoice-no").value = invNo;
                document.getElementById("user-pay-modal-amount").value = amount;
                
                document.getElementById("user-pay-modal-display-invoice").value = invNo;
                document.getElementById("user-pay-modal-display-amount").value = `₱${amount.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
                
                modal.style.display = "flex";
            }
        });
    });

    tbody.querySelectorAll(".user-cert-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = btn.getAttribute("data-id");
            const inv = invoices.find(i => i.id === id);
            if (inv) {
                downloadCertificate(inv);
            }
        });
    });
}

function renderUserPaymentsTable(payments) {
    const tbody = document.getElementById("user-payments-table-body");
    if (!tbody) return;

    if (payments.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted text-sm" style="padding: 16px 20px; text-align: center;">No transaction records found.</td>
            </tr>
        `;
        return;
    }

    let html = "";
    payments.forEach(p => {
        html += `
            <tr style="border-bottom: 1px solid #F1F5F9;">
                <td style="padding: 14px 16px;"><strong>${escapeHTML(p.paymentId)}</strong></td>
                <td style="padding: 14px 16px;">${p.date}</td>
                <td style="padding: 14px 16px;">₱${p.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td style="padding: 14px 16px;">${escapeHTML(p.method)}</td>
                <td style="padding: 14px 16px;"><span class="badge status-approved">Completed</span></td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function updateFinanceKPIs(invoices) {
    const unpaid = invoices.filter(inv => inv.status === "Unpaid");
    const paid = invoices.filter(inv => inv.status === "Paid");

    const outstandingTotal = unpaid.reduce((sum, inv) => sum + inv.amount, 0);
    const settledTotal = paid.reduce((sum, inv) => sum + inv.amount, 0);

    const outstandingEl = document.getElementById("user-fin-kpi-outstanding");
    if (outstandingEl) outstandingEl.textContent = `₱${outstandingTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}`;

    const settledEl = document.getElementById("user-fin-kpi-settled");
    if (settledEl) settledEl.textContent = `₱${settledTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
}

// Authentication state check
onAuthStateChanged(auth, (user) => {
    if (unsubscribeUser) unsubscribeUser();

    if (!user) {
        window.location.href = "../../Login_Folder/LoginSystem/login.html";
        return;
    }

    // Subscribe to user document/query updates in real-time
    const userQuery = query(collection(db, "users"), where("email", "==", user.email));
    unsubscribeUser = onSnapshot(userQuery, (snapshot) => {
        if (!snapshot.empty) {
            const userData = snapshot.docs[0].data();
            
            const firstName = userData.firstName || "";
            const lastName = userData.lastName || "";
            const fullName = `${firstName} ${lastName}`.trim() || userData.username || user.email;
            const stallNo = userData.stallNo || userData.stall || "";
            const permitNo = userData.permitNo || "";

            userProfileName = fullName;
            userProfileStall = stallNo;

            // Populate display name
            const nameEl = document.getElementById("profile-display-name");
            if (nameEl) nameEl.textContent = fullName;

            // Populate initials
            const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || userData.username?.slice(0, 2).toUpperCase() || "U";
            const avatarEl = document.getElementById("profile-avatar-initials");
            if (avatarEl) avatarEl.textContent = initials;

            // Populate welcome heading
            const welcomeHeading = document.getElementById("dashboard-welcome-heading");
            if (welcomeHeading) welcomeHeading.textContent = `Welcome, ${firstName || userData.username || "Vendor"}!`;

            // Update assigned stall KPI card
            const stallCardVal = document.getElementById("stat-my-stall");
            if (stallCardVal) {
                stallCardVal.textContent = stallNo || "None";
                const stallCardSubtitle = stallCardVal.nextElementSibling;
                if (stallCardSubtitle) {
                    stallCardSubtitle.textContent = stallNo ? "Altura Public Market" : "Awaiting allocation";
                }
            }

            // Update permit ID KPI card
            const permitCardVal = document.getElementById("stat-my-permit");
            if (permitCardVal) {
                permitCardVal.textContent = permitNo || "None";
                const permitCardSubtitle = permitCardVal.nextElementSibling;
                if (permitCardSubtitle) {
                    permitCardSubtitle.textContent = permitNo ? "Valid & Compliant" : "No active permit";
                }
            }

            // Re-initialize finance listeners with new stall/name info
            setupFinanceListeners();
        }
    }, (err) => {
        console.error("Error listening to user profile updates:", err);
    });

    // Initialize other real-time listeners (only once per auth session)
    setupApplicationsListener(user.uid);
    setupNotificationsListener(user.uid);
    setupNoticesListener();
});

function initializeUserDashboard() {
    
    // Toggle notifications dropdown menu
    const notifBell = document.getElementById("notification-bell");
    const notifDropdown = document.getElementById("notif-dropdown");
    if (notifBell && notifDropdown) {
        notifBell.addEventListener("click", (e) => {
            e.stopPropagation();
            const isOpen = notifDropdown.style.display === "block";
            notifDropdown.style.display = isOpen ? "none" : "block";
        });
    }

    // Close notifications dropdown menu when clicking outside
    document.addEventListener("click", (e) => {
        if (notifBell && notifDropdown && !notifBell.contains(e.target)) {
            notifDropdown.style.display = "none";
        }
    });

    // Mark all notifications as read
    const btnMarkAllRead = document.getElementById("btn-mark-all-read");
    if (btnMarkAllRead) {
        btnMarkAllRead.addEventListener("click", async (e) => {
            e.stopPropagation();
            if (!auth.currentUser) return;
            try {
                const q = query(collection(db, "notifications"), where("userId", "==", auth.currentUser.uid), where("read", "==", false));
                const snapshot = await getDocs(q);
                const updatePromises = [];
                snapshot.forEach(docSnap => {
                    updatePromises.push(updateDoc(doc(db, "notifications", docSnap.id), { read: true }));
                });
                await Promise.all(updatePromises);
            } catch (err) {
                console.error("Error marking all notifications read:", err);
            }
        });
    }

    // Sign out button handler
    document.querySelector(".btn-logout")?.addEventListener("click", async (e) => {
        e.preventDefault();
        if (confirm("Are you sure you want to sign out?")) {
            try {
                await signOut(auth);
                window.location.href = "../../Login_Folder/LoginSystem/login.html";
            } catch (err) {
                alert("Sign Out Error: " + err.message);
            }
        }
    });

    // ==========================================
    // USER PAYMENT MODAL HANDLERS
    // ==========================================
    const userPayModal = document.getElementById("modal-portal-user-payment");
    const userPayForm = document.getElementById("modal-form-user-pay");
    const btnCloseUserPay = document.getElementById("btn-close-user-pay-modal");

    if (userPayModal && userPayForm) {
        btnCloseUserPay?.addEventListener("click", () => {
            userPayModal.style.display = "none";
        });

        userPayModal.addEventListener("click", (e) => {
            if (e.target === userPayModal) {
                userPayModal.style.display = "none";
            }
        });

        userPayForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const id = document.getElementById("user-pay-modal-invoice-id").value;
            const invNo = document.getElementById("user-pay-modal-invoice-no").value;
            const amount = parseFloat(document.getElementById("user-pay-modal-amount").value);
            const method = document.getElementById("user-pay-modal-method").value;
            const account = document.getElementById("user-pay-modal-account").value.trim();

            if (!id || !invNo || isNaN(amount) || !account) {
                alert("Please fill in all details.");
                return;
            }

            try {
                userPayModal.style.display = "none";

                // 1. Add payment transaction record
                await addDoc(collection(db, "payments"), {
                    paymentId: "TXN-" + Math.floor(100000 + Math.random() * 900000),
                    vendorName: userProfileName,
                    stallNo: userProfileStall || "N/A",
                    amount: amount,
                    method: `${method} (${account})`,
                    date: new Date().toISOString().split('T')[0],
                    status: "Completed",
                    createdAt: new Date().toISOString()
                });

                // 2. Update invoice status in Firestore
                await updateDoc(doc(db, "invoices", id), { status: "Paid" });

                // 3. Create a success notification
                await addDoc(collection(db, "notifications"), {
                    userId: auth.currentUser.uid,
                    title: "Payment Successful",
                    description: `Your payment of ₱${amount.toLocaleString(undefined, {minimumFractionDigits: 2})} for invoice ${invNo} has been processed successfully.`,
                    type: "success",
                    read: false,
                    createdAt: new Date().toISOString()
                });

                userPayForm.reset();
                alert(`Payment for invoice ${invNo} was successfully processed!`);
            } catch (err) {
                alert("Payment failed: " + err.message);
            }
        });
    }

    // ==========================================
    // 1. NAVIGATION ROUTER CONTROL CORE
    // ==========================================
    const navLinks = document.querySelectorAll(".nav-link, .bread-link, .quick-card, [data-target]");
    const appViews = document.querySelectorAll(".app-view");

    function switchView(targetViewId) {
        switchViewGlobal = switchView;
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

document.querySelector('[data-action="start-app"]')?.addEventListener("click", async () => {
    const token = localStorage.getItem("mkt_token");
    if (!token) return;

    try {
        const res = await fetch("http://localhost:3000/api/applications/registration-status", {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (data.alreadyRegistered) {
            alert("YOU ARE ALREADY REGISTERED");
            return;
        }

        switchView("view-new-registration");
    } catch (err) {
        console.error("Registration status check failed:", err);
        switchView("view-new-registration"); // fail-open so a network hiccup doesn't lock them out
    }
});
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

    btnRegNext.addEventListener("click", async (e) => {
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
            // Check auth state
            if (!auth.currentUser) {
                alert("You must be logged in to submit an application.");
                return;
            }

            // Gather values and upload application payload to Firestore
            const bizname = document.getElementById("reg-input-bizname").value.trim();
            const biztype = document.getElementById("reg-input-biztype").value;
            const category = document.getElementById("reg-input-category").value;
            const preferredZone = document.getElementById("reg-input-zone").value;
            const stallSize = document.getElementById("reg-input-size").value;
            const operatingHours = document.getElementById("reg-input-hours").value.trim();
            const operatingDays = Array.from(document.querySelectorAll(".day-badge.selected")).map(b => b.textContent.trim());

            const appPayload = {
                userId: auth.currentUser.uid,
                firstName: document.getElementById("reg-input-firstname").value.trim(),
                lastName: document.getElementById("reg-input-lastname").value.trim(),
                email: document.getElementById("reg-input-email").value.trim(),
                phone: document.getElementById("reg-input-phone").value.trim(),
                address: document.getElementById("reg-input-address").value.trim(),
                city: document.getElementById("reg-input-city").value.trim(),
                idType: document.getElementById("reg-input-idtype").value,
                idNumber: document.getElementById("reg-input-idno").value.trim(),
                businessName: bizname || "Market Stall",
                businessType: biztype || "Sole",
                productCategory: category || "Vegetables",
                yearsInBusiness: parseInt(document.getElementById("reg-input-years").value) || 0,
                tinNumber: document.getElementById("reg-input-tin").value.trim(),
                preferredZone: preferredZone || "Zone A",
                stallSize: stallSize || "Small",
                operatingHours: operatingHours || "N/A",
                operatingDays: operatingDays,
                status: "Pending",
                applicationType: "New Registration",
                createdAt: new Date().toISOString()
            };

            try {
                btnRegNext.setAttribute("disabled", "true");
                await addDoc(collection(db, "applications"), appPayload);
                
                // Add real-time notification
                try {
                    await addDoc(collection(db, "notifications"), {
                        userId: auth.currentUser.uid,
                        title: "Application Submitted",
                        description: `Your new stall application for "${bizname || 'Market Stall'}" has been successfully submitted and is under review.`,
                        type: "success",
                        read: false,
                        createdAt: new Date().toISOString()
                    });
                } catch (notifErr) {
                    console.error("Failed to write submission notification:", notifErr);
                }

                alert("Application submitted successfully!");
                
                // Clear wizard status and form values
                switchView("view-my-applications");
                currentRegStep = 1;
                newRegForm.reset();
                document.querySelectorAll(".day-badge").forEach(b => b.classList.remove("selected"));
                updateRegistrationWizardUI();
            } catch (err) {
                alert("Submission Failed: " + err.message);
            } finally {
                btnRegNext.removeAttribute("disabled");
            }
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
    let verifiedPermitRecord = null;

    const btnVerifyPermit = document.getElementById("btn-verify-permit");
    const resultCard = document.getElementById("renew-verification-result");
    const btnRenewNext = document.getElementById("btn-renew-next");
    const btnRenewPrev = document.getElementById("btn-renew-prev");

    // Function to retrieve permit records from Firestore, with dynamic fallback for testing
    async function fetchPermitRecordFromDB(permitNo, lastName) {
        try {
            // 1. Query Firestore permits collection
            const q = query(collection(db, "permits"), where("permitNo", "==", permitNo));
            const querySnapshot = await getDocs(q);
            
            let foundPermit = null;
            querySnapshot.forEach(docSnapshot => {
                const data = docSnapshot.data();
                if (data.lastName && data.lastName.toLowerCase() === lastName.toLowerCase()) {
                    foundPermit = {
                        id: docSnapshot.id,
                        permitNo: data.permitNo,
                        lastName: data.lastName,
                        vendorName: data.vendorName || `${data.firstName || ''} ${data.lastName}`.trim(),
                        stallNo: data.stallNo || data.stall || "N/A",
                        zoneName: data.zoneName || data.zone || "N/A",
                        phone: data.phone || "",
                        email: data.email || "",
                        address: data.address || "",
                        businessName: data.businessName || "",
                        productCategory: data.productCategory || data.category || "",
                        expiryDate: data.expiryDate || "2026-12-31"
                    };
                }
            });

            if (foundPermit) {
                return foundPermit;
            }
        } catch (e) {
            console.error("Error querying permits collection:", e);
        }

        // 2. Fallback: Check user's profile in Firestore and dynamically mock a permit record
        if (auth.currentUser) {
            try {
                let userProfile = null;
                const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
                if (userDoc.exists()) {
                    userProfile = userDoc.data();
                } else {
                    const uQuery = query(collection(db, "users"), where("email", "==", auth.currentUser.email));
                    const uSnapshot = await getDocs(uQuery);
                    if (!uSnapshot.empty) {
                        userProfile = uSnapshot.docs[0].data();
                    }
                }

                if (userProfile && userProfile.lastName && userProfile.lastName.toLowerCase() === lastName.toLowerCase()) {
                    return {
                        id: "mock-permit-id",
                        permitNo: permitNo,
                        lastName: userProfile.lastName,
                        vendorName: `${userProfile.firstName || ''} ${userProfile.lastName}`.trim(),
                        stallNo: "Stall 42-B",
                        zoneName: "Zone B",
                        phone: userProfile.phone || "0917-123-4567",
                        email: userProfile.email || auth.currentUser.email,
                        address: userProfile.address || "123 Market St, Manila",
                        businessName: userProfile.businessName || "Mock Vendor Shop",
                        productCategory: userProfile.productCategory || "Dry Goods & Grocery",
                        expiryDate: "2026-12-31"
                    };
                }
            } catch (e) {
                console.error("Error checking user profile fallback:", e);
            }
        }
        return null; 
    }

    btnVerifyPermit.addEventListener("click", async () => {
        const pNo = document.getElementById("renew-input-permit").value.trim();
        const lName = document.getElementById("renew-input-lastname").value.trim();

        if (!pNo || !lName) {
            alert("Please fill in both required verification fields.");
            return;
        }

        btnVerifyPermit.setAttribute("disabled", "true");
        btnVerifyPermit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying...';

        try {
            const record = await fetchPermitRecordFromDB(pNo, lName);

            if (record) {
                verifiedPermitRecord = record;
                document.getElementById("vf-no").textContent = record.permitNo;
                document.getElementById("vf-vendor").textContent = record.vendorName;
                document.getElementById("vf-stall").textContent = record.stallNo;
                document.getElementById("vf-zone").textContent = record.zoneName;
                
                // Pre-populate Step 2
                document.getElementById("ren-phone").value = record.phone || "";
                document.getElementById("ren-email").value = record.email || "";
                document.getElementById("ren-address").value = record.address || "";
                document.getElementById("ren-bname").value = record.businessName || "";
                document.getElementById("ren-cat").value = record.productCategory || "";

                resultCard.style.display = "block";
                btnRenewNext.removeAttribute("disabled");
            } else {
                verifiedPermitRecord = null;
                resultCard.style.display = "none";
                btnRenewNext.setAttribute("disabled", "true");
                alert("Permit record not found. Make sure the Permit Number is correct and the Last Name matches either the permit record or your profile last name.");
            }
        } catch (err) {
            alert("Verification Error: " + err.message);
        } finally {
            btnVerifyPermit.removeAttribute("disabled");
            btnVerifyPermit.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Verify Permit';
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

    btnRenewNext.addEventListener("click", async (e) => {
        e.preventDefault();

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
                document.getElementById("rv-expirydate").textContent = (verifiedPermitRecord && verifiedPermitRecord.expiryDate) ? verifiedPermitRecord.expiryDate : "2026-12-31";
            }
            
            currentRenewStep++;
            updateRenewWizardUI();
        } else {
            // Check auth state
            if (!auth.currentUser) {
                alert("You must be logged in to submit a renewal application.");
                return;
            }

            if (!verifiedPermitRecord) {
                alert("No verified permit record found. Please verify your permit first.");
                return;
            }

            const renewalPayload = {
                userId: auth.currentUser.uid,
                firstName: verifiedPermitRecord.vendorName.split(" ")[0] || "",
                lastName: verifiedPermitRecord.lastName || "",
                email: document.getElementById("ren-email").value.trim(),
                phone: document.getElementById("ren-phone").value.trim(),
                address: document.getElementById("ren-address").value.trim(),
                businessName: document.getElementById("ren-bname").value.trim(),
                productCategory: document.getElementById("ren-cat").value,
                permitNo: verifiedPermitRecord.permitNo,
                stallNo: verifiedPermitRecord.stallNo,
                preferredZone: verifiedPermitRecord.zoneName,
                stallSize: verifiedPermitRecord.stallNo, // displays in card details next to zone
                status: "Pending",
                applicationType: "Permit Renewal",
                createdAt: new Date().toISOString()
            };

            try {
                btnRenewNext.setAttribute("disabled", "true");
                btnRenewNext.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
                await addDoc(collection(db, "applications"), renewalPayload);
                
                // Add real-time notification
                try {
                    await addDoc(collection(db, "notifications"), {
                        userId: auth.currentUser.uid,
                        title: "Renewal Submitted",
                        description: `Your permit renewal application for "${renewalPayload.businessName || 'Market Stall'}" (Permit No: ${renewalPayload.permitNo}) has been submitted.`,
                        type: "success",
                        read: false,
                        createdAt: new Date().toISOString()
                    });
                } catch (notifErr) {
                    console.error("Failed to write renewal notification:", notifErr);
                }

                alert("Permit renewal application submitted successfully!");
                
                // Clear wizard status and form values
                switchView("view-my-applications");
                currentRenewStep = 1;
                resultCard.style.display = "none";
                btnRenewNext.setAttribute("disabled", "true");
                
                // Reset inputs
                document.getElementById("renew-input-permit").value = "";
                document.getElementById("renew-input-lastname").value = "";
                document.getElementById("ren-phone").value = "";
                document.getElementById("ren-email").value = "";
                document.getElementById("ren-address").value = "";
                document.getElementById("ren-bname").value = "";
                document.getElementById("ren-cat").value = "";
                
                verifiedPermitRecord = null;
                updateRenewWizardUI();
            } catch (err) {
                alert("Renewal Submission Failed: " + err.message);
            } finally {
                btnRenewNext.removeAttribute("disabled");
            }
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
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeUserDashboard);
} else {
    initializeUserDashboard();
}