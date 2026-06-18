import { auth, db } from "../../Login_Folder/LoginSystem/firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, addDoc, updateDoc, orderBy, limit, setDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

// Helper to escape HTML inputs to prevent XSS
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

let allApplications = [];
let allVendors = [];
let unsubscribeApps = null;
let unsubscribeVendors = null;

// Render applications table inside Review tab
function renderApplicationsTable() {
    const tbody = document.getElementById("apps-table-body");
    const countTag = document.getElementById("apps-count-tag");
    if (!tbody) return;

    const typeFilter = document.getElementById("filter-app-type")?.value || "";
    const statusFilter = document.getElementById("filter-app-status")?.value || "";
    const zoneFilter = document.getElementById("filter-app-zone")?.value || "";
    const searchVal = document.getElementById("apps-table-search")?.value.toLowerCase().trim() || "";

    let filtered = allApplications;

    if (typeFilter) {
        filtered = filtered.filter(app => app.applicationType === typeFilter);
    }
    if (statusFilter) {
        filtered = filtered.filter(app => app.status === statusFilter);
    }
    if (zoneFilter) {
        filtered = filtered.filter(app => app.preferredZone === zoneFilter);
    }
    if (searchVal) {
        filtered = filtered.filter(app => {
            const fullName = `${app.firstName || ''} ${app.lastName || ''}`.toLowerCase();
            const bizName = (app.businessName || "").toLowerCase();
            const id = (app.id || "").toLowerCase();
            return fullName.includes(searchVal) || bizName.includes(searchVal) || id.includes(searchVal);
        });
    }

    if (countTag) {
        countTag.textContent = `${filtered.length} results`;
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted text-sm padding-y-12">No applications match the filter criteria.</td>
            </tr>
        `;
        return;
    }

    let html = "";
    filtered.forEach(app => {
        const id = app.id;
        const refNo = id.slice(0, 8).toUpperCase();
        const fullName = `${app.firstName || ''} ${app.lastName || ''}`.trim() || "Applicant";
        const type = app.applicationType || "New Registration";
        const category = app.productCategory || "N/A";
        const zone = app.preferredZone || "N/A";
        const date = app.createdAt ? new Date(app.createdAt).toLocaleDateString() : "N/A";
        const status = app.status || "Pending";
        
        const statusClass = status.toLowerCase() === "approved" ? "status-approved" 
            : status.toLowerCase() === "rejected" ? "status-rejected" 
            : "status-pending";

        let actionsHtml = "-";
        if (status.toLowerCase() === "pending") {
            actionsHtml = `
                <div style="display:flex; gap: 8px;">
                    <button class="btn-blue-action-item approve-btn" data-id="${id}">Approve</button>
                    <button class="btn-red-action-item reject-btn" data-id="${id}">Reject</button>
                </div>
            `;
        }

        html += `
            <tr>
                <td><strong>${escapeHTML(refNo)}</strong></td>
                <td>${escapeHTML(fullName)}</td>
                <td>${escapeHTML(type)}</td>
                <td>${escapeHTML(category)}</td>
                <td>${escapeHTML(zone)}</td>
                <td>${date}</td>
                <td><span class="badge ${statusClass}">${status}</span></td>
                <td>${actionsHtml}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;

    // Bind action events
    tbody.querySelectorAll(".approve-btn").forEach(btn => {
        btn.addEventListener("click", () => handleApplicationStatusUpdate(btn.getAttribute("data-id"), "Approved"));
    });
    tbody.querySelectorAll(".reject-btn").forEach(btn => {
        btn.addEventListener("click", () => handleApplicationStatusUpdate(btn.getAttribute("data-id"), "Rejected"));
    });
}

// Update application status and push real-time user notification
async function handleApplicationStatusUpdate(appId, newStatus) {
    if (!confirm(`Are you sure you want to change the status of this application to ${newStatus}?`)) {
        return;
    }

    try {
        await updateDoc(doc(db, "applications", appId), { status: newStatus });

        // Fetch application details to log notification
        const appDoc = await getDoc(doc(db, "applications", appId));
        if (appDoc.exists()) {
            const appData = appDoc.data();
            
            // Dispatch notification for vendor dashboard
            await addDoc(collection(db, "notifications"), {
                userId: appData.userId,
                title: `Application ${newStatus}`,
                description: `Your application for ${appData.applicationType} (${appData.businessName || 'Market Stall'}) has been ${newStatus.toLowerCase()} by the market admin.`,
                type: newStatus === "Approved" ? "success" : "warning",
                read: false,
                createdAt: new Date().toISOString()
            });
        }

        alert(`Application has been successfully ${newStatus.toLowerCase()}!`);
    } catch (err) {
        alert("Error updating application status: " + err.message);
    }
}

// Render Document Review View table and queue
function renderDocsTable() {
    const tbody = document.getElementById("docs-table-body");
    const countTag = document.getElementById("docs-count-tag");
    if (!tbody) return;

    const searchVal = document.getElementById("docs-table-search")?.value.toLowerCase().trim() || "";
    const statusFilter = document.getElementById("filter-docs-status")?.value || "";
    const typeFilter = document.getElementById("filter-docs-type")?.value || "";

    let filtered = allApplications;

    if (statusFilter) {
        filtered = filtered.filter(app => {
            const docStatus = app.status === "Approved" ? "Verified" 
                : app.status === "Rejected" ? "Invalid" 
                : "Pending";
            return docStatus === statusFilter;
        });
    }
    if (typeFilter) {
        filtered = filtered.filter(app => app.applicationType === typeFilter);
    }
    if (searchVal) {
        filtered = filtered.filter(app => {
            const fullName = `${app.firstName || ''} ${app.lastName || ''}`.toLowerCase();
            const id = (app.id || "").toLowerCase();
            return fullName.includes(searchVal) || id.includes(searchVal);
        });
    }

    if (countTag) {
        countTag.textContent = `${filtered.length} results`;
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted text-sm padding-y-12">No document packages found.</td>
            </tr>
        `;
        return;
    }

    let html = "";
    filtered.forEach(app => {
        const id = app.id;
        const fullName = `${app.firstName || ''} ${app.lastName || ''}`.trim() || "Applicant";
        const appType = app.applicationType || "Stall Application";
        const date = app.createdAt ? new Date(app.createdAt).toLocaleDateString() : "N/A";
        
        const docStatus = app.status === "Approved" ? "Verified" 
            : app.status === "Rejected" ? "Invalid" 
            : "Pending";

        const statusClass = docStatus === "Verified" ? "status-approved" 
            : docStatus === "Invalid" ? "status-rejected" 
            : "status-pending";

        let actionsHtml = "-";
        if (docStatus === "Pending") {
            actionsHtml = `
                <div style="display:flex; gap: 8px;">
                    <button class="btn-blue-action-item verify-doc-btn" data-id="${id}">Verify Files</button>
                </div>
            `;
        }

        html += `
            <tr>
                <td><strong>${escapeHTML(fullName)}</strong></td>
                <td>${escapeHTML(appType)}</td>
                <td>All Files (ID, Certificates)</td>
                <td>${date}</td>
                <td><span class="badge ${statusClass}">${docStatus}</span></td>
                <td>${actionsHtml}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;

    // Bind action events
    tbody.querySelectorAll(".verify-doc-btn").forEach(btn => {
        btn.addEventListener("click", () => handleVerifyDocs(btn.getAttribute("data-id")));
    });
}

async function handleVerifyDocs(appId) {
    if (!confirm("Are you sure you want to mark all documents as verified? This will approve the application.")) {
        return;
    }
    await handleApplicationStatusUpdate(appId, "Approved");
}

// Render Manage Vendors View table
function renderVendorsTable() {
    const tbody = document.getElementById("vendors-table-body");
    const countTag = document.getElementById("vendors-count-tag");
    if (!tbody) return;

    const searchVal = document.getElementById("vendors-table-search")?.value.toLowerCase().trim() || "";
    const zoneFilter = document.getElementById("filter-vendors-zone")?.value || "";
    const statusFilter = document.getElementById("filter-vendors-status")?.value || "";
    const catFilter = document.getElementById("filter-vendors-cat")?.value || "";

    let filtered = allVendors;

    if (zoneFilter) {
        filtered = filtered.filter(v => v.preferredZone === zoneFilter || v.zone === zoneFilter);
    }
    if (statusFilter) {
        filtered = filtered.filter(v => (v.status || "Active") === statusFilter);
    }
    if (catFilter) {
        filtered = filtered.filter(v => v.productCategory === catFilter || v.category === catFilter);
    }
    if (searchVal) {
        filtered = filtered.filter(v => {
            const name = `${v.firstName || ''} ${v.lastName || ''}`.toLowerCase();
            const username = (v.username || "").toLowerCase();
            const email = (v.email || "").toLowerCase();
            return name.includes(searchVal) || username.includes(searchVal) || email.includes(searchVal);
        });
    }

    if (countTag) {
        countTag.textContent = `${filtered.length} vendors`;
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted text-sm padding-y-12">No vendors found.</td>
            </tr>
        `;
        return;
    }

    let html = "";
    filtered.forEach(v => {
        const id = v.id;
        const fullName = `${v.firstName || ''} ${v.lastName || ''}`.trim() || v.username || "Vendor";
        const stall = v.stallNo || v.stall || "N/A";
        const zone = v.preferredZone || v.zone || "N/A";
        const category = v.productCategory || v.category || "N/A";
        const permit = v.permitNo || "None";
        const status = v.status || "Active";
        const statusClass = status === "Active" ? "status-approved" : "status-rejected";

        const actionBtn = status === "Active" 
            ? `<button class="btn-red-action-item deactivate-vendor-btn" data-id="${id}">Deactivate</button>` 
            : `<button class="btn-blue-action-item activate-vendor-btn" data-id="${id}">Activate</button>`;

        html += `
            <tr>
                <td>
                    <div class="admin-name-cell" style="display:flex; align-items:center; gap:8px;">
                        <div class="blue-av" style="width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:bold;">
                            ${escapeHTML(fullName.charAt(0).toUpperCase())}
                        </div>
                        <strong>${escapeHTML(fullName)}</strong>
                    </div>
                </td>
                <td>${escapeHTML(stall)}</td>
                <td>${escapeHTML(zone)}</td>
                <td>${escapeHTML(category)}</td>
                <td>${escapeHTML(permit)}</td>
                <td><span class="badge ${statusClass}">${status}</span></td>
                <td>${actionBtn}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;

    // Bind action events
    tbody.querySelectorAll(".deactivate-vendor-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            const vendorId = btn.getAttribute("data-id");
            if (confirm("Are you sure you want to deactivate this vendor?")) {
                try {
                    await updateDoc(doc(db, "users", vendorId), { status: "Inactive" });
                } catch (err) {
                    alert("Error: " + err.message);
                }
            }
        });
    });

    tbody.querySelectorAll(".activate-vendor-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            const vendorId = btn.getAttribute("data-id");
            if (confirm("Are you sure you want to activate this vendor?")) {
                try {
                    await updateDoc(doc(db, "users", vendorId), { status: "Active" });
                } catch (err) {
                    alert("Error: " + err.message);
                }
            }
        });
    });
}

// Set up real-time listener for applications collection
function setupApplicationsListener() {
    if (unsubscribeApps) unsubscribeApps();

    const q = collection(db, "applications");
    unsubscribeApps = onSnapshot(q, (snapshot) => {
        allApplications = [];
        let pendingCount = 0;

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            data.id = docSnap.id;
            allApplications.push(data);
            if (data.status === "Pending") {
                pendingCount++;
            }
        });

        // Sort by createdAt descending
        allApplications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // 1. Update Pending Applications KPI
        const pendingKpi = document.getElementById("kpi-pending-apps");
        if (pendingKpi) pendingKpi.textContent = pendingCount;

        // 2. Update Docs to verify count (Pending applications count)
        const kpiDocsVerify = document.getElementById("kpi-docs-verify");
        if (kpiDocsVerify) kpiDocsVerify.textContent = pendingCount;

        // 3. Update Available Stalls KPI (Total 50 - Approved count)
        const approvedAppsCount = allApplications.filter(app => app.status === "Approved").length;
        const kpiAvailableStalls = document.getElementById("kpi-available-stalls");
        if (kpiAvailableStalls) kpiAvailableStalls.textContent = Math.max(50 - approvedAppsCount, 0);

        // 4. Update Document review page stats
        const kpiDocsPending = document.getElementById("kpi-docs-pending");
        if (kpiDocsPending) kpiDocsPending.textContent = pendingCount;
        const kpiDocsVerified = document.getElementById("kpi-docs-verified");
        if (kpiDocsVerified) kpiDocsVerified.textContent = approvedAppsCount;
        const kpiDocsInvalid = document.getElementById("kpi-docs-invalid");
        if (kpiDocsInvalid) kpiDocsInvalid.textContent = allApplications.filter(app => app.status === "Rejected").length;

        // 5. Render Review Table and Document Table
        renderApplicationsTable();
        renderDocsTable();

        // 6. Render Dashboard Recent List
        const recentList = document.getElementById("dashboard-recent-apps-list");
        if (recentList) {
            if (allApplications.length === 0) {
                recentList.innerHTML = `<li class="text-muted text-sm text-center padding-y-12">No recent applications...</li>`;
            } else {
                const topRecent = allApplications.slice(0, 5);
                let html = "";
                topRecent.forEach(app => {
                    const fullName = `${app.firstName || ''} ${app.lastName || ''}`.trim() || "Applicant";
                    const type = app.applicationType || "Stall Application";
                    const biz = app.businessName || "Market Stall";
                    const status = app.status || "Pending";
                    
                    const statusClass = status.toLowerCase() === "approved" ? "status-approved" 
                        : status.toLowerCase() === "rejected" ? "status-rejected" 
                        : "status-pending";

                    html += `
                        <li class="queue-item">
                            <div>
                                <strong>${escapeHTML(fullName)}</strong>
                                <p>${escapeHTML(type)} - ${escapeHTML(biz)}</p>
                            </div>
                            <span class="badge ${statusClass}">${status}</span>
                        </li>
                    `;
                });
                recentList.innerHTML = html;
            }
        }

        // 7. Render Dashboard Recent Docs queue
        const docsQueue = document.getElementById("dashboard-docs-queue-list");
        if (docsQueue) {
            const pendingDocs = allApplications.filter(app => app.status === "Pending").slice(0, 5);
            if (pendingDocs.length === 0) {
                docsQueue.innerHTML = `<li class="text-muted text-sm text-center padding-y-12">No pending verification items...</li>`;
            } else {
                let html = "";
                pendingDocs.forEach(app => {
                    const fullName = `${app.firstName || ''} ${app.lastName || ''}`.trim() || "Applicant";
                    const type = app.applicationType || "Stall Application";

                    html += `
                        <li class="queue-item">
                            <div>
                                <strong>${escapeHTML(fullName)}</strong>
                                <p>Files verification - ${escapeHTML(type)}</p>
                            </div>
                            <span class="badge status-pending">Pending</span>
                        </li>
                    `;
                });
                docsQueue.innerHTML = html;
            }
        }
    });
}


// Set up real-time listener for vendors (users collection)
function setupVendorsListener() {
    if (unsubscribeVendors) unsubscribeVendors();

    const q = query(collection(db, "users"), where("userRole", "==", "Vendor"));
    unsubscribeVendors = onSnapshot(q, (snapshot) => {
        allVendors = [];
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            data.id = docSnap.id;
            allVendors.push(data);
        });
        
        // Update Active Vendors KPI card
        const activeCount = allVendors.filter(v => (v.status || "Active") === "Active").length;
        const kpiActive = document.getElementById("kpi-active-vendors");
        if (kpiActive) kpiActive.textContent = activeCount;

        // Update Vendors Table
        renderVendorsTable();
    });
}

let unsubscribeAnnouncements = null;
function setupAnnouncementsListener() {
    if (unsubscribeAnnouncements) unsubscribeAnnouncements();
    const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
    unsubscribeAnnouncements = onSnapshot(q, (snapshot) => {
        const feedContainer = document.getElementById("live-announcement-feed");
        if (!feedContainer) return;
        
        if (snapshot.empty) {
            feedContainer.innerHTML = `<div class="text-muted text-sm text-center padding-y-12">No announcements posted yet...</div>`;
            return;
        }
        
        let html = "";
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const titleText = data.title || "Notice";
            const priorityText = data.priority || "Normal";
            const msgText = data.message || "";
            const date = data.createdAt ? new Date(data.createdAt).toLocaleDateString() : "N/A";
            const badgeClass = (priorityText === "High") ? "badge-red-solid" : "badge-gray-solid";
            const borderStyle = (priorityText === "High") ? "4px solid #EF4444" : "1px solid #E2E8F0";
            
            html += `
                <div class="ann-feed-item" style="border-left: ${borderStyle}; margin-bottom: 12px; padding: 12px; border-radius: 4px; background: #f8fafc;">
                    <div class="ann-item-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
                        <strong>${escapeHTML(titleText)}</strong>
                        <span class="badge ${badgeClass}">${priorityText}</span>
                    </div>
                    <p style="margin: 0 0 6px 0; font-size: 0.875rem; color:#475569;">${escapeHTML(msgText)}</p>
                    <span class="ann-date" style="font-size: 0.75rem; color:#94a3b8;">Posted: ${date}</span>
                </div>
            `;
        });
        feedContainer.innerHTML = html;
    });
}

let unsubscribeStalls = null;
let allStalls = [];
let activeZoneFilter = "Zone A"; // default active zone for map

async function seedStallsIfEmpty() {
    try {
        const snapshot = await getDocs(collection(db, "stalls"));
        if (snapshot.empty) {
            console.log("Seeding default stalls...");
            const batchPromises = [];
            // Seed Zone A (A-01 to A-25)
            for (let i = 1; i <= 25; i++) {
                const num = String(i).padStart(2, "0");
                const stallNo = `A-${num}`;
                batchPromises.push(setDoc(doc(db, "stalls", `stall-${stallNo}`), {
                    stallNo: stallNo,
                    zone: "Zone A",
                    status: "Available",
                    vendorId: "",
                    vendorName: "",
                    category: "",
                    permitNo: "",
                    expiryDate: "",
                    size: "Medium",
                    createdAt: new Date().toISOString()
                }));
            }
            // Seed Zone B (B-01 to B-25)
            for (let i = 1; i <= 25; i++) {
                const num = String(i).padStart(2, "0");
                const stallNo = `B-${num}`;
                batchPromises.push(setDoc(doc(db, "stalls", `stall-${stallNo}`), {
                    stallNo: stallNo,
                    zone: "Zone B",
                    status: "Available",
                    vendorId: "",
                    vendorName: "",
                    category: "",
                    permitNo: "",
                    expiryDate: "",
                    size: "Small",
                    createdAt: new Date().toISOString()
                }));
            }
            await Promise.all(batchPromises);
            console.log("Seeding default stalls complete.");
        }
    } catch (err) {
        console.error("Error seeding stalls:", err);
    }
}

function updateStallsKPIs() {
    const occupied = allStalls.filter(s => s.status === "Occupied").length;
    const available = allStalls.filter(s => s.status === "Available").length;
    const reserved = allStalls.filter(s => s.status === "Reserved").length;
    const maintenance = allStalls.filter(s => s.status === "Maintenance").length;
    const blocked = allStalls.filter(s => s.status === "Blocked").length;

    const occupiedEl = document.getElementById("map-kpi-occupied");
    if (occupiedEl) occupiedEl.textContent = occupied;

    const availableEl = document.getElementById("map-kpi-available");
    if (availableEl) availableEl.textContent = available;

    const reservedEl = document.getElementById("map-kpi-reserved");
    if (reservedEl) reservedEl.textContent = reserved;

    const maintenanceEl = document.getElementById("map-kpi-maintenance");
    if (maintenanceEl) maintenanceEl.textContent = maintenance;

    const blockedEl = document.getElementById("map-kpi-blocked");
    if (blockedEl) blockedEl.textContent = blocked;
    
    // Also update main dashboard available stalls count
    const dashboardAvail = document.getElementById("kpi-available-stalls");
    if (dashboardAvail) dashboardAvail.textContent = available;
}

function renderMapZoneFilters() {
    const container = document.getElementById("map-interactive-zone-filters");
    if (!container) return;

    container.innerHTML = `
        <button class="subtab-btn ${activeZoneFilter === 'Zone A' ? 'active' : ''}" style="padding: 6px 12px; border-radius:4px; font-size:0.875rem;" id="btn-map-filter-zoneA">Zone A (Wet Market)</button>
        <button class="subtab-btn ${activeZoneFilter === 'Zone B' ? 'active' : ''}" style="padding: 6px 12px; border-radius:4px; font-size:0.875rem; margin-left: 8px;" id="btn-map-filter-zoneB">Zone B (Dry Goods)</button>
    `;

    document.getElementById("btn-map-filter-zoneA").addEventListener("click", () => {
        activeZoneFilter = "Zone A";
        const zoneLabel = document.getElementById("map-active-zone-label");
        if (zoneLabel) zoneLabel.textContent = "Zone A - Wet Market Section";
        renderMapZoneFilters();
        renderMapGrid();
    });

    document.getElementById("btn-map-filter-zoneB").addEventListener("click", () => {
        activeZoneFilter = "Zone B";
        const zoneLabel = document.getElementById("map-active-zone-label");
        if (zoneLabel) zoneLabel.textContent = "Zone B - Dry Goods Section";
        renderMapZoneFilters();
        renderMapGrid();
    });
}

function renderMapGrid() {
    const grid = document.getElementById("map-grid-hardware-matrix");
    if (!grid) return;

    const zoneStalls = allStalls.filter(s => s.zone === activeZoneFilter);
    const N = zoneStalls.length;

    if (N === 0) {
        grid.innerHTML = `<div class="text-center text-muted text-sm padding-y-12">No stalls in this zone. Click "Add Stall" to create one.</div>`;
        grid.style.display = "block";
        return;
    }

    const stallCols = 5;
    const stallRowsCount = Math.ceil(N / stallCols);
    const walkwayRowsCount = Math.floor((stallRowsCount - 1) / 3);
    const totalActualRows = stallRowsCount + walkwayRowsCount;

    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "1fr 1fr 40px 1fr 1fr 1fr";
    grid.style.gridTemplateRows = `repeat(${totalActualRows}, auto)`;
    grid.style.gap = "8px";
    grid.style.background = "#F8FAFC";
    grid.style.padding = "16px";
    grid.style.borderRadius = "8px";
    grid.style.border = "1px solid #E2E8F0";

    let html = "";
    
    // Build a map of grid coordinates to items
    const cellMap = {};
    
    // 1. Mark vertical walkway at Column 3 for all rows
    for (let r = 1; r <= totalActualRows; r++) {
        cellMap[`${r},3`] = { type: "vertical-walkway" };
    }

    // 2. Mark horizontal walkways at every 4th row
    for (let r = 4; r <= totalActualRows; r += 4) {
        for (let c = 1; c <= 6; c++) {
            if (c === 3) {
                cellMap[`${r},${c}`] = { type: "intersection" };
            } else {
                cellMap[`${r},${c}`] = { type: "horizontal-walkway" };
            }
        }
    }

    // 3. Place the stalls in the remaining cells
    let stallIdx = 0;
    for (let r = 1; r <= totalActualRows; r++) {
        for (let c = 1; c <= 6; c++) {
            const coord = `${r},${c}`;
            if (cellMap[coord]) continue;

            const stall = zoneStalls[stallIdx++];
            if (stall) {
                cellMap[coord] = { type: "stall", data: stall };
            }
        }
    }

    // 4. Render the grid
    for (let r = 1; r <= totalActualRows; r++) {
        for (let c = 1; c <= 6; c++) {
            const item = cellMap[`${r},${c}`];
            if (!item) {
                html += `<div style="grid-row: ${r}; grid-column: ${c}; min-height:65px;"></div>`;
            } else if (item.type === "intersection") {
                html += `<div style="grid-row: ${r}; grid-column: ${c}; display:flex; align-items:center; justify-content:center; background:#E2E8F0; color:#94A3B8; font-size:0.55rem; font-weight:bold; border: 1px dashed #CBD5E1; border-radius:4px; min-height:65px;">✚</div>`;
            } else if (item.type === "horizontal-walkway") {
                html += `<div style="grid-row: ${r}; grid-column: ${c}; display:flex; align-items:center; justify-content:center; background:#E2E8F0; color:#64748B; font-size:0.6rem; font-weight:600; border-top: 1px dashed #CBD5E1; border-bottom: 1px dashed #CBD5E1; min-height:65px; letter-spacing: 0.5px;">AISLE</div>`;
            } else if (item.type === "vertical-walkway") {
                html += `<div style="grid-row: ${r}; grid-column: ${c}; display:flex; align-items:center; justify-content:center; background:#E2E8F0; color:#64748B; font-size:0.6rem; font-weight:600; border-left: 1px dashed #CBD5E1; border-right: 1px dashed #CBD5E1; writing-mode: vertical-lr; min-height:65px; letter-spacing: 0.5px;">AISLE</div>`;
            } else if (item.type === "stall") {
                const stall = item.data;
                let bgColor = "#ECFDF5"; // Available (soft green)
                let txtColor = "#047857";
                let borderColor = "#A7F3D0";
                
                if (stall.status === "Occupied") {
                    bgColor = "#FFF1F2"; // Soft red
                    txtColor = "#E11D48";
                    borderColor = "#FECDD3";
                } else if (stall.status === "Reserved") {
                    bgColor = "#FFFBEB"; // Soft Amber
                    txtColor = "#D97706";
                    borderColor = "#FDE68A";
                } else if (stall.status === "Maintenance") {
                    bgColor = "#F1F5F9"; // Soft Slate
                    txtColor = "#475569";
                    borderColor = "#E2E8F0";
                } else if (stall.status === "Blocked") {
                    bgColor = "#FAF5FF"; // Soft Purple
                    txtColor = "#7C3AED";
                    borderColor = "#E9D5FF";
                }

                html += `
                    <div class="stall-grid-cell" style="grid-row: ${r}; grid-column: ${c}; background: ${bgColor}; border: 1px solid ${borderColor}; padding: 8px; border-radius: 6px; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; min-height: 65px; transition: all 0.15s ease;" data-id="${stall.id}" title="Stall: ${stall.stallNo}\nStatus: ${stall.status}\nVendor: ${stall.vendorName || 'None'}">
                        <strong style="color: ${txtColor}; font-size: 0.85rem; margin-bottom: 2px;">${stall.stallNo}</strong>
                        <span style="font-size: 0.6rem; color: ${txtColor}; opacity: 0.85; font-weight: 600;">${stall.status}</span>
                    </div>
                `;
            }
        }
    }
    grid.innerHTML = html;

    // Attach click listeners
    grid.querySelectorAll(".stall-grid-cell").forEach(cell => {
        cell.addEventListener("click", () => {
            const id = cell.getAttribute("data-id");
            const stall = allStalls.find(s => s.id === id);
            if (!stall) return;

            const modal = document.getElementById("modal-portal-stall");
            if (!modal) return;

            document.getElementById("stall-modal-title").textContent = `Edit Stall ${stall.stallNo}`;
            document.getElementById("stall-modal-id").value = stall.id;
            
            const statusSelect = document.getElementById("stall-modal-status");
            statusSelect.value = stall.status;
            
            const occupiedFields = document.getElementById("stall-modal-occupied-fields");
            const vendorInput = document.getElementById("stall-modal-vendor");
            const permitInput = document.getElementById("stall-modal-permit");
            const catInput = document.getElementById("stall-modal-category");
            
            vendorInput.value = stall.vendorName || "";
            permitInput.value = stall.permitNo || "";
            catInput.value = stall.category || "";

            if (stall.status === "Occupied") {
                occupiedFields.style.display = "block";
                vendorInput.required = true;
            } else {
                occupiedFields.style.display = "none";
                vendorInput.required = false;
            }

            modal.style.display = "flex";
        });
    });
}

function renderStallsTracker() {
    const container = document.getElementById("map-zones-progress-container");
    if (!container) return;

    const zones = ["Zone A", "Zone B"];
    let html = "";

    zones.forEach(zone => {
        const zoneStalls = allStalls.filter(s => s.zone === zone);
        const total = zoneStalls.length;
        const occupied = zoneStalls.filter(s => s.status === "Occupied").length;
        const rate = total > 0 ? Math.round((occupied / total) * 100) : 0;

        html += `
            <div class="zone-progress-card" style="background:white; border: 1px solid #e2e8f0; padding:16px; border-radius:8px; margin-bottom:12px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:0.875rem;">
                    <strong>${zone === 'Zone A' ? 'Zone A – Wet Market Section' : 'Zone B – Dry Goods Section'}</strong>
                    <span style="color:#64748b;">${occupied} / ${total} Stalls Occupied (${rate}%)</span>
                </div>
                <div style="width:100%; height:8px; background:#f1f5f9; border-radius:4px; overflow:hidden;">
                    <div style="width: ${rate}%; height:100%; background:#2e7d32;"></div>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function renderStallsVendorTable() {
    const tbody = document.getElementById("stalls-vendor-table-body");
    if (!tbody) return;

    if (allStalls.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted text-sm padding-y-12">No stalls found.</td></tr>`;
        return;
    }

    let html = "";
    allStalls.forEach(stall => {
        const statusBadgeClass = stall.status === 'Available' ? 'status-approved' 
            : stall.status === 'Occupied' ? 'status-pending' 
            : 'status-rejected';

        html += `
            <tr>
                <td><strong>${escapeHTML(stall.stallNo)}</strong></td>
                <td>${escapeHTML(stall.zone)}</td>
                <td>${escapeHTML(stall.size)}</td>
                <td>${escapeHTML(stall.vendorName || "N/A")}</td>
                <td>${escapeHTML(stall.category || "N/A")}</td>
                <td>${escapeHTML(stall.permitNo || "N/A")}</td>
                <td>${stall.expiryDate || "N/A"}</td>
                <td><span class="badge ${statusBadgeClass}">${stall.status}</span></td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function renderAssignStallsTable() {
    const tbody = document.getElementById("assign-stalls-table-body");
    if (!tbody) return;

    if (allStalls.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted text-sm padding-y-12">No stalls loaded.</td></tr>`;
        return;
    }

    let html = "";
    allStalls.forEach(stall => {
        const actionBtn = stall.status === "Available"
            ? `<button class="btn-blue-action-item assign-stall-btn" data-id="${stall.id}" data-stall="${stall.stallNo}" data-zone="${stall.zone}">Assign Stall</button>`
            : `<button class="btn-red-action-item unassign-stall-btn" data-id="${stall.id}">Unassign</button>`;

        html += `
            <tr>
                <td><strong>${escapeHTML(stall.stallNo)}</strong></td>
                <td>${escapeHTML(stall.zone)}</td>
                <td>${escapeHTML(stall.vendorName || "None")}</td>
                <td><span class="badge ${stall.status === 'Available' ? 'status-approved' : 'status-rejected'}">${stall.status}</span></td>
                <td>${actionBtn}</td>
            </tr>
        `;
    });
    tbody.innerHTML = html;

    // Bind Assign buttons
    tbody.querySelectorAll(".assign-stall-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            const stallId = btn.getAttribute("data-id");
            const stallNo = btn.getAttribute("data-stall");
            const zone = btn.getAttribute("data-zone");

            // Filter approved applications that do not have a stall yet
            const assignable = allApplications.filter(app => 
                app.status === "Approved" && 
                !allStalls.some(s => s.vendorName === `${app.firstName || ''} ${app.lastName || ''}`.trim())
            );

            let vendorName = "";
            let permitNo = "";
            let category = "";
            let selectedApp = null;

            if (assignable.length > 0) {
                let optionsMsg = "Choose an approved vendor to assign to Stall " + stallNo + ":\n";
                assignable.forEach((app, idx) => {
                    optionsMsg += `${idx + 1}. ${app.firstName} ${app.lastName} (${app.businessName || 'Market Stall'})\n`;
                });
                optionsMsg += "\n(Or type a custom name directly in the prompt below)";
                
                const choice = prompt(optionsMsg);
                if (choice === null) return; 

                const choiceIdx = parseInt(choice) - 1;
                if (!isNaN(choiceIdx) && choiceIdx >= 0 && choiceIdx < assignable.length) {
                    selectedApp = assignable[choiceIdx];
                    vendorName = `${selectedApp.firstName || ''} ${selectedApp.lastName || ''}`.trim();
                    permitNo = selectedApp.permitNo || "PERMIT-" + Math.floor(100000 + Math.random() * 900000);
                    category = selectedApp.productCategory || "Vegetables";
                }
            }

            if (!vendorName) {
                vendorName = prompt("Enter the Vendor Name manually for Stall " + stallNo + ":");
                if (!vendorName) return;
                permitNo = prompt("Enter Permit Number:") || "PERMIT-" + Math.floor(100000 + Math.random() * 900000);
                category = prompt("Enter Product Category:") || "Vegetables";
            }

            try {
                // 1. Update stall in Firestore
                await updateDoc(doc(db, "stalls", stallId), {
                    status: "Occupied",
                    vendorName: vendorName.trim(),
                    permitNo: permitNo.trim(),
                    category: category.trim(),
                    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                });

                // 2. Update application and user profile
                if (selectedApp) {
                    await updateDoc(doc(db, "applications", selectedApp.id), {
                        stallNo: stallNo,
                        permitNo: permitNo
                    });

                    const userQuery = query(collection(db, "users"), where("email", "==", selectedApp.email));
                    const userSnap = await getDocs(userQuery);
                    if (!userSnap.empty) {
                        const userDocId = userSnap.docs[0].id;
                        await updateDoc(doc(db, "users", userDocId), {
                            stallNo: stallNo,
                            permitNo: permitNo,
                            productCategory: category
                        });
                    }

                    await addDoc(collection(db, "notifications"), {
                        userId: selectedApp.userId,
                        title: "Stall Assigned",
                        description: `Congratulations! Stall ${stallNo} in ${zone} has been assigned to you. Permit No: ${permitNo}.`,
                        type: "success",
                        read: false,
                        createdAt: new Date().toISOString()
                    });
                }

                alert(`Stall ${stallNo} has been assigned to ${vendorName}!`);
            } catch (err) {
                alert("Failed to assign stall: " + err.message);
            }
        });
    });

    // Bind Unassign buttons
    tbody.querySelectorAll(".unassign-stall-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            const stallId = btn.getAttribute("data-id");
            if (!confirm("Are you sure you want to unassign this stall? This will set it back to Available.")) return;

            try {
                await updateDoc(doc(db, "stalls", stallId), {
                    status: "Available",
                    vendorName: "",
                    permitNo: "",
                    category: "",
                    vendorId: "",
                    expiryDate: ""
                });
                alert("Stall successfully unassigned.");
            } catch (err) {
                alert("Failed to unassign: " + err.message);
            }
        });
    });
}

function setupStallsListener() {
    if (unsubscribeStalls) unsubscribeStalls();

    unsubscribeStalls = onSnapshot(collection(db, "stalls"), (snapshot) => {
        allStalls = [];
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            data.id = docSnap.id;
            allStalls.push(data);
        });

        if (allStalls.length === 0) {
            seedStallsIfEmpty();
            return;
        }

        allStalls.sort((a, b) => a.stallNo.localeCompare(b.stallNo));

        renderMapGrid();
        renderMapZoneFilters();
        renderStallsTracker();
        renderStallsVendorTable();
        renderAssignStallsTable();
        updateStallsKPIs();
    });
}

let unsubscribeInvoices = null;
let unsubscribePayments = null;
let allInvoices = [];
let allPayments = [];

function renderInvoicesTable() {
    const tbody = document.getElementById("invoices-table-body");
    if (!tbody) return;
    
    if (allInvoices.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted text-sm padding-y-12">No invoices recorded...</td></tr>`;
        return;
    }

    let html = "";
    allInvoices.forEach(inv => {
        const actionBtn = inv.status === 'Unpaid' 
            ? `<button class="btn-blue-action-item pay-invoice-btn" data-vendor="${escapeHTML(inv.vendorName)}" data-stall="${escapeHTML(inv.stallNo)}" data-amount="${inv.amount}">Log Pay</button>` 
            : `<button class="btn-outline-action-item" style="border: 1px solid #cbd5e1; background: #f8fafc; color: #64748b; font-size: 0.75rem; padding: 4px 8px; border-radius: 4px;" onclick="alert('Receipt: ${escapeHTML(inv.invoiceNo)} is fully settled.')">Paid</button>`;

        html += `
            <tr>
                <td><strong>${escapeHTML(inv.invoiceNo)}</strong></td>
                <td>${escapeHTML(inv.vendorName)}</td>
                <td>${escapeHTML(inv.stallNo)}</td>
                <td>₱${inv.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td>${inv.issuedDate}</td>
                <td>${inv.dueDate}</td>
                <td><span class="badge ${inv.status === 'Paid' ? 'status-approved' : 'status-pending'}">${inv.status}</span></td>
                <td>${actionBtn}</td>
            </tr>
        `;
    });
    tbody.innerHTML = html;

    // Bind pay button events
    tbody.querySelectorAll(".pay-invoice-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const payModal = document.getElementById("modal-portal-payment");
            if (payModal) {
                const inputs = payModal.querySelectorAll("input");
                if (inputs.length >= 4) {
                    inputs[0].value = btn.getAttribute("data-vendor") || "";
                    inputs[1].value = btn.getAttribute("data-stall") || "";
                    inputs[2].value = btn.getAttribute("data-amount") || "";
                    inputs[3].value = "GCash";
                }
                payModal.style.display = "flex";
            }
        });
    });
}

function renderPaymentsTable() {
    const tbody = document.getElementById("payments-table-body");
    if (!tbody) return;

    if (allPayments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted text-sm padding-y-12">No transaction entries found...</td></tr>`;
        return;
    }

    let html = "";
    allPayments.forEach(p => {
        html += `
            <tr>
                <td><strong>${escapeHTML(p.paymentId)}</strong></td>
                <td>${escapeHTML(p.vendorName)}</td>
                <td>${escapeHTML(p.stallNo)}</td>
                <td>₱${p.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td>Permit Fee</td>
                <td>${p.date}</td>
                <td>${escapeHTML(p.method)}</td>
                <td><span class="badge status-approved">${p.status}</span></td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function renderArrearsTable() {
    const tbody = document.getElementById("arrears-table-body");
    if (!tbody) return;

    const overdueInvoices = allInvoices.filter(inv => inv.status === "Unpaid" && new Date(inv.dueDate) < new Date());
    
    if (overdueInvoices.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted text-sm padding-y-12">Clear compliant record: No arrears found...</td></tr>`;
        return;
    }

    let html = "";
    overdueInvoices.forEach(inv => {
        const diffTime = Math.abs(new Date() - new Date(inv.dueDate));
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const monthsOverdue = Math.max(Math.floor(diffDays / 30), 1);
        const penalty = inv.amount * 0.02 * monthsOverdue;
        const totalDue = inv.amount + penalty;

        html += `
            <tr>
                <td><strong>${escapeHTML(inv.vendorName)}</strong></td>
                <td>${escapeHTML(inv.stallNo)}</td>
                <td>${inv.dueDate}</td>
                <td>₱${inv.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td>${monthsOverdue} mo</td>
                <td>₱${penalty.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td><strong>₱${totalDue.toLocaleString(undefined, {minimumFractionDigits: 2})}</strong></td>
                <td>
                    <button class="btn-red-action-item pay-invoice-btn" data-vendor="${escapeHTML(inv.vendorName)}" data-stall="${escapeHTML(inv.stallNo)}" data-amount="${totalDue}">Settle</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;

    // Bind pay button events
    tbody.querySelectorAll(".pay-invoice-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const payModal = document.getElementById("modal-portal-payment");
            if (payModal) {
                const inputs = payModal.querySelectorAll("input");
                if (inputs.length >= 4) {
                    inputs[0].value = btn.getAttribute("data-vendor") || "";
                    inputs[1].value = btn.getAttribute("data-stall") || "";
                    inputs[2].value = btn.getAttribute("data-amount") || "";
                    inputs[3].value = "GCash";
                }
                payModal.style.display = "flex";
            }
        });
    });
}

function updateFinanceKPIs() {
    // Collected (All payments)
    const totalCollected = allPayments.reduce((sum, p) => sum + p.amount, 0);
    const colEl = document.getElementById("fin-kpi-collected");
    if (colEl) colEl.textContent = `₱${totalCollected.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    const calloutEl = document.getElementById("fin-callout-total");
    if (calloutEl) calloutEl.innerHTML = `<i class="fa-solid fa-chart-line"></i> Total Collected: <b>₱${totalCollected.toLocaleString(undefined, {minimumFractionDigits: 2})}</b>`;

    // Pending unpaid invoices (not overdue)
    const unpaidNotOverdue = allInvoices.filter(inv => inv.status === "Unpaid" && new Date(inv.dueDate) >= new Date());
    const totalPending = unpaidNotOverdue.reduce((sum, inv) => sum + inv.amount, 0);
    const penEl = document.getElementById("fin-kpi-pending");
    if (penEl) penEl.textContent = `₱${totalPending.toLocaleString(undefined, {minimumFractionDigits: 2})}`;

    // Overdue invoices details
    const overdueInvoices = allInvoices.filter(inv => inv.status === "Unpaid" && new Date(inv.dueDate) < new Date());
    let principalDue = 0;
    let totalPenalties = 0;
    const uniqueVendors = new Set();

    overdueInvoices.forEach(inv => {
        const diffTime = Math.abs(new Date() - new Date(inv.dueDate));
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const monthsOverdue = Math.max(Math.floor(diffDays / 30), 1);
        const penalty = inv.amount * 0.02 * monthsOverdue;
        
        principalDue += inv.amount;
        totalPenalties += penalty;
        uniqueVendors.add(inv.vendorName);
    });

    const totalArrears = principalDue + totalPenalties;
    const arrEl = document.getElementById("fin-kpi-arrears");
    if (arrEl) arrEl.textContent = `₱${totalArrears.toLocaleString(undefined, {minimumFractionDigits: 2})}`;

    // Invoices issued count
    const invCountEl = document.getElementById("fin-kpi-invoices");
    if (invCountEl) invCountEl.textContent = allInvoices.length;

    // Arrears subtab KPIs
    const arrVendorsEl = document.getElementById("kpi-arr-vendors");
    if (arrVendorsEl) arrVendorsEl.textContent = uniqueVendors.size;
    const arrPrincipalEl = document.getElementById("kpi-arr-principal");
    if (arrPrincipalEl) arrPrincipalEl.textContent = `₱${principalDue.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    const arrPenaltiesEl = document.getElementById("kpi-arr-penalties");
    if (arrPenaltiesEl) arrPenaltiesEl.textContent = `₱${totalPenalties.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
}

function setupFinanceListeners() {
    if (unsubscribeInvoices) unsubscribeInvoices();
    if (unsubscribePayments) unsubscribePayments();

    unsubscribeInvoices = onSnapshot(collection(db, "invoices"), (snapshot) => {
        allInvoices = [];
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            data.id = docSnap.id;
            allInvoices.push(data);
        });
        allInvoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        renderInvoicesTable();
        renderArrearsTable();
        updateFinanceKPIs();
    });

    unsubscribePayments = onSnapshot(collection(db, "payments"), (snapshot) => {
        allPayments = [];
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            data.id = docSnap.id;
            allPayments.push(data);
        });
        allPayments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        renderPaymentsTable();
        updateFinanceKPIs();
    });
}

// Authentication state & role authorization check
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "../../Login_Folder/LoginSystem/login.html";
        return;
    }

    try {
        let userData = null;
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            userData = userDoc.data();
        } else {
            // Fallback: Query by email field
            const q = query(collection(db, "users"), where("email", "==", user.email));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                userData = querySnapshot.docs[0].data();
            }
        }

        if (userData) {
            // Check authorization role
            if (userData.userRole !== "Admin" && userData.userRole !== "Super Admin") {
                alert("Unauthorized Access: This area is reserved for administrators.");
                window.location.href = "../../Login_Folder/LoginSystem/login.html";
                return;
            }

            // Check account status
            if (userData.status === "Inactive") {
                alert("Access Denied: Your administrator account has been deactivated.");
                await signOut(auth);
                window.location.href = "../../Login_Folder/LoginSystem/login.html";
                return;
            }

            const firstName = userData.firstName || "";
            const lastName = userData.lastName || "";
            const fullName = `${firstName} ${lastName}`.trim() || userData.username || "Admin";

            // Populate profile elements
            const nameEl = document.getElementById("admin-profile-name");
            if (nameEl) nameEl.textContent = fullName;

            const emailEl = document.getElementById("admin-profile-email");
            if (emailEl) emailEl.textContent = userData.email || user.email;

            // Populate initials in avatar-circle
            const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || userData.username?.slice(0, 2).toUpperCase() || "AD";
            const avatarEl = document.querySelector(".top-header .avatar-circle");
            if (avatarEl) avatarEl.textContent = initials;
            
            const sidebarAvatarEl = document.querySelector(".sidebar .avatar-circle");
            if (sidebarAvatarEl) sidebarAvatarEl.textContent = initials;

            // Initialize database queues and counts
            setupApplicationsListener();
            setupVendorsListener();
            setupAnnouncementsListener();
            setupFinanceListeners();
            setupStallsListener();
        } else {
            alert("No user profile found in Firestore.");
            window.location.href = "../../Login_Folder/LoginSystem/login.html";
        }
    } catch (err) {
        console.error("Error fetching admin data:", err);
    }
});

function initializeAdminDashboard() {
    
    // Populate dropdown options
    const filterType = document.getElementById("filter-app-type");
    if (filterType) {
        filterType.innerHTML = `
            <option value="">Type</option>
            <option value="New Registration">New Registration</option>
            <option value="Permit Renewal">Permit Renewal</option>
        `;
        filterType.addEventListener("change", renderApplicationsTable);
    }

    const filterStatus = document.getElementById("filter-app-status");
    if (filterStatus) {
        filterStatus.innerHTML = `
            <option value="">Status</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
        `;
        filterStatus.addEventListener("change", renderApplicationsTable);
    }

    const filterZone = document.getElementById("filter-app-zone");
    if (filterZone) {
        filterZone.innerHTML = `
            <option value="">Zone</option>
            <option value="Zone A">Zone A</option>
            <option value="Zone B">Zone B</option>
            <option value="Zone C">Zone C</option>
            <option value="Zone D">Zone D</option>
        `;
        filterZone.addEventListener("change", renderApplicationsTable);
    }

    const appsSearch = document.getElementById("apps-table-search");
    if (appsSearch) {
        appsSearch.addEventListener("input", renderApplicationsTable);
    }

    // Document Review Filters
    const filterDocsStatus = document.getElementById("filter-docs-status");
    if (filterDocsStatus) {
        filterDocsStatus.innerHTML = `
            <option value="">Status</option>
            <option value="Pending">Pending</option>
            <option value="Verified">Verified</option>
            <option value="Invalid">Invalid</option>
        `;
        filterDocsStatus.addEventListener("change", renderDocsTable);
    }

    const filterDocsType = document.getElementById("filter-docs-type");
    if (filterDocsType) {
        filterDocsType.innerHTML = `
            <option value="">Doc Type</option>
            <option value="New Registration">New Registration</option>
            <option value="Permit Renewal">Permit Renewal</option>
        `;
        filterDocsType.addEventListener("change", renderDocsTable);
    }

    const docsSearch = document.getElementById("docs-table-search");
    if (docsSearch) {
        docsSearch.addEventListener("input", renderDocsTable);
    }

    // Manage Vendor Filters
    const filterVendorsZone = document.getElementById("filter-vendors-zone");
    if (filterVendorsZone) {
        filterVendorsZone.innerHTML = `
            <option value="">Zone</option>
            <option value="Zone A">Zone A</option>
            <option value="Zone B">Zone B</option>
            <option value="Zone C">Zone C</option>
            <option value="Zone D">Zone D</option>
        `;
        filterVendorsZone.addEventListener("change", renderVendorsTable);
    }

    const filterVendorsStatus = document.getElementById("filter-vendors-status");
    if (filterVendorsStatus) {
        filterVendorsStatus.innerHTML = `
            <option value="">Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
        `;
        filterVendorsStatus.addEventListener("change", renderVendorsTable);
    }

    const filterVendorsCat = document.getElementById("filter-vendors-cat");
    if (filterVendorsCat) {
        filterVendorsCat.innerHTML = `
            <option value="">Category</option>
            <option value="Dry Goods & Grocery">Dry Goods & Grocery</option>
            <option value="Vegetables">Vegetables & Fruits</option>
        `;
        filterVendorsCat.addEventListener("change", renderVendorsTable);
    }

    const vendorsSearch = document.getElementById("vendors-table-search");
    if (vendorsSearch) {
        vendorsSearch.addEventListener("input", renderVendorsTable);
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
    const subtabButtons = document.querySelectorAll(".inner-subtabs-container .subtab-btn");
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


    // ==========================================
    // 3. ANNOUNCEMENT CREATION DISPATCH SYSTEM
    // ==========================================
    const annForm = document.getElementById("announcement-creation-form");

    if (annForm) {
        annForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const titleText = document.getElementById("ann-input-title").value.trim();
            const priorityText = document.getElementById("ann-input-priority").value;
            const msgText = document.getElementById("ann-input-msg").value.trim();
            
            try {
                await addDoc(collection(db, "announcements"), {
                    title: titleText,
                    priority: priorityText,
                    message: msgText,
                    createdAt: new Date().toISOString()
                });
                annForm.reset();
                alert("Announcement posted successfully!");
            } catch (err) {
                alert("Failed to post announcement: " + err.message);
            }
        });
    }


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

    document.getElementById("btn-create-invoice-calc").addEventListener("click", async () => {
        const vendorName = prompt("Enter the Vendor Name for this invoice:");
        if (!vendorName) return;
        const stallNo = prompt("Enter the Stall Number (e.g., A-12):") || "N/A";

        // Calculate invoice fee
        const baseMonthlyValue = parseInt(calcSize.value === "6000" ? "500" : "330");
        const principalBaseFee = baseMonthlyValue * selectedMonths;
        const zoneSurchargeRate = parseFloat(calcZone.value);
        const compiledSurchargeValue = principalBaseFee * zoneSurchargeRate;
        const dailyInclusionFeeValue = calcDailyBox.checked ? (25 * selectedMonths * 4) : 0; 
        const aggregateFinalTotal = principalBaseFee + compiledSurchargeValue + dailyInclusionFeeValue;

        const invoicePayload = {
            invoiceNo: "INV-" + Math.floor(100000 + Math.random() * 900000),
            vendorName: vendorName.trim(),
            stallNo: stallNo.trim().toUpperCase(),
            amount: aggregateFinalTotal,
            issuedDate: new Date().toISOString().split('T')[0],
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: "Unpaid",
            createdAt: new Date().toISOString()
        };

        try {
            await addDoc(collection(db, "invoices"), invoicePayload);
            alert(`Invoice ${invoicePayload.invoiceNo} successfully generated for ${vendorName}!`);
        } catch (err) {
            alert("Error generating invoice: " + err.message);
        }
    });


    // ==========================================
    // 5. MODAL INTERACTIVE PORTALS HANDLERS
    // ==========================================
    const payModal = document.getElementById("modal-portal-payment");
    const recModal = document.getElementById("modal-portal-receipt");

    document.getElementById("btn-trigger-payment-modal").addEventListener("click", () => {
        // Reset form inputs
        const inputs = payModal.querySelectorAll("input");
        inputs.forEach(input => input.value = "");
        payModal.style.display = "flex";
    });
    document.getElementById("btn-close-pay-modal").addEventListener("click", () => payModal.style.display = "none");
    payModal.addEventListener("click", (e) => {
        if (e.target === payModal) payModal.style.display = "none";
    });
    recModal.addEventListener("click", (e) => {
        if (e.target === recModal) recModal.style.display = "none";
    });
    
    document.getElementById("modal-form-log-pay").addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const inputs = e.target.querySelectorAll("input");
        if (inputs.length < 4) return;
        
        const vendorName = inputs[0].value.trim();
        const stallNo = inputs[1].value.trim().toUpperCase();
        const amount = parseFloat(inputs[2].value);
        const method = inputs[3].value.trim();

        if (!vendorName || !stallNo || isNaN(amount)) {
            alert("Please provide valid payment details.");
            return;
        }

        try {
            payModal.style.display = "none";
            
            // 1. Add payment record to Firestore
            await addDoc(collection(db, "payments"), {
                paymentId: "TXN-" + Math.floor(100000 + Math.random() * 900000),
                vendorName: vendorName,
                stallNo: stallNo,
                amount: amount,
                method: method,
                date: new Date().toISOString().split('T')[0],
                status: "Completed",
                createdAt: new Date().toISOString()
            });

            // 2. Check for a matching unpaid invoice and mark it as Paid
            const invQuery = query(collection(db, "invoices"), 
                where("vendorName", "==", vendorName),
                where("stallNo", "==", stallNo),
                where("status", "==", "Unpaid")
            );
            const invSnap = await getDocs(invQuery);
            if (!invSnap.empty) {
                const oldestInvoice = invSnap.docs[0];
                await updateDoc(doc(db, "invoices", oldestInvoice.id), { status: "Paid" });
            }

            e.target.reset();
            alert("Payment logged successfully!");
        } catch (err) {
            alert("Failed to log payment: " + err.message);
        }
    });

    // Stall Editor Modal event listeners
    const stallModal = document.getElementById("modal-portal-stall");
    if (stallModal) {
        document.getElementById("btn-close-stall-modal")?.addEventListener("click", () => {
            stallModal.style.display = "none";
        });
        stallModal.addEventListener("click", (e) => {
            if (e.target === stallModal) stallModal.style.display = "none";
        });
        
        const statusSelect = document.getElementById("stall-modal-status");
        statusSelect?.addEventListener("change", () => {
            const occupiedFields = document.getElementById("stall-modal-occupied-fields");
            const vendorInput = document.getElementById("stall-modal-vendor");
            if (statusSelect.value === "Occupied") {
                occupiedFields.style.display = "block";
                vendorInput.required = true;
            } else {
                occupiedFields.style.display = "none";
                vendorInput.required = false;
            }
        });

        document.getElementById("modal-form-edit-stall")?.addEventListener("submit", async (e) => {
            e.preventDefault();
            const id = document.getElementById("stall-modal-id").value;
            const newStatus = statusSelect.value;
            const vendorName = document.getElementById("stall-modal-vendor").value.trim();
            const permitNo = document.getElementById("stall-modal-permit").value.trim();
            const category = document.getElementById("stall-modal-category").value.trim();

            try {
                stallModal.style.display = "none";
                if (newStatus === "Occupied") {
                    await updateDoc(doc(db, "stalls", id), {
                        status: "Occupied",
                        vendorName: vendorName,
                        permitNo: permitNo,
                        category: category,
                        expiryDate: "2027-06-18"
                    });
                } else if (newStatus === "Available") {
                    await updateDoc(doc(db, "stalls", id), {
                        status: "Available",
                        vendorName: "",
                        permitNo: "",
                        category: "",
                        vendorId: "",
                        expiryDate: ""
                    });
                } else {
                    await updateDoc(doc(db, "stalls", id), {
                        status: newStatus,
                        vendorName: "",
                        permitNo: "",
                        category: "",
                        vendorId: "",
                        expiryDate: ""
                    });
                }
                alert("Stall successfully updated!");
            } catch (err) {
                alert("Failed to update stall: " + err.message);
            }
        });
    }

    // Add Stall Modal event listeners
    const addStallModal = document.getElementById("modal-portal-add-stall");
    if (addStallModal) {
        document.getElementById("btn-map-add-stall")?.addEventListener("click", () => {
            document.getElementById("modal-form-add-stall").reset();
            addStallModal.style.display = "flex";
        });

        document.getElementById("btn-close-add-stall-modal")?.addEventListener("click", () => {
            addStallModal.style.display = "none";
        });
        addStallModal.addEventListener("click", (e) => {
            if (e.target === addStallModal) addStallModal.style.display = "none";
        });

        document.getElementById("modal-form-add-stall")?.addEventListener("submit", async (e) => {
            e.preventDefault();
            const stallNo = document.getElementById("add-stall-modal-no").value.trim().toUpperCase();
            const zone = document.getElementById("add-stall-modal-zone").value;
            const size = document.getElementById("add-stall-modal-size").value;

            if (!stallNo) return;

            const exists = allStalls.some(s => s.stallNo === stallNo);
            if (exists) {
                alert(`Error: Stall ${stallNo} already exists!`);
                return;
            }

            try {
                addStallModal.style.display = "none";
                await setDoc(doc(db, "stalls", `stall-${stallNo}`), {
                    stallNo: stallNo,
                    zone: zone,
                    status: "Available",
                    vendorId: "",
                    vendorName: "",
                    category: "",
                    permitNo: "",
                    expiryDate: "",
                    size: size,
                    createdAt: new Date().toISOString()
                });
                alert(`Stall ${stallNo} created successfully!`);
            } catch (err) {
                alert("Failed to create stall: " + err.message);
            }
        });
    }

    // Helper close routing targeting generated code hooks
    window.closeReceiptModalWindow = function() {
        recModal.style.display = "none";
    };
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeAdminDashboard);
} else {
    initializeAdminDashboard();
}