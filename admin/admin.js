/* Coimbatore Smart City Admin Portal Scripts */

// App state
let complaints = JSON.parse(localStorage.getItem("complaints")) || [];
const ADMIN_PASSWORD = "ccmcadmin";
let currentFilter = 'All', currentView = 'all', chartInstance = null;

const $ = id => document.getElementById(id);

function login() {
    if($('password').value === ADMIN_PASSWORD) {
        $('loginView').style.display = "none";
        $('dashboardView').style.display = "flex";
        renderComplaints();
    } else {
        alert("Invalid Authority Credentials.");
    }
}

function logout() {
    $('password').value = "";
    $('dashboardView').style.display = "none";
    $('loginView').style.display = "flex";
}

function setFilter(status) {
    if(currentView === 'analytics') switchView('all');
    currentFilter = status;
    $('listTitle').innerText = status === 'All' ? 'Recent & Escalated Grid' : `Filtered by: ${status}`;
    renderComplaints();
}

function switchView(viewName) {
    currentView = viewName;
    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
    ['complaintsView', 'analyticsView', 'statsGrid'].forEach(id => $( id).style.display = 'none');

    const views = {
        all: {
            nav: 'navAll', show: [['complaintsView','block'],['statsGrid','grid']],
            title: 'Overview Statistics',
            sub: 'Real-time aggregation of citizen reported issues across Coimbatore wards.',
            list: 'Recent & Escalated Grid', filter: 'All', action: renderComplaints
        },
        high: {
            nav: 'navHigh', show: [['complaintsView','block'],['statsGrid','grid']],
            title: 'High Priority Issues',
            sub: 'SLA Breached complaints requiring immediate attention.',
            list: 'High Priority (Escalated)', filter: 'High', action: renderComplaints
        },
        analytics: {
            nav: 'navAnalytics', show: [['analyticsView','block']],
            title: 'Analytics Reports',
            sub: 'Data-driven insights for city planning and resource allocation.',
            action: renderChart
        }
    };

    const v = views[viewName];
    $(v.nav).classList.add('active');
    v.show.forEach(([id, display]) => $(id).style.display = display);
    $('viewTitle').innerText = v.title;
    $('viewSubtitle').innerText = v.sub;
    if(v.filter !== undefined) { currentFilter = v.filter; $('listTitle').innerText = v.list; }
    v.action();
}

// Check if complaint is high priority (older than ~2 min and still pending, for demo)
function isHighPriority(c) {
    return c.status === "Pending" && (Date.now() - c.timestamp) / 3600000 > 0.033;
}

function deleteComplaint(id) {
    if(confirm("Are you sure you want to delete this complaint record?")) {
        complaints = complaints.filter(c => c.id !== id);
        localStorage.setItem("complaints", JSON.stringify(complaints));
        renderComplaints();
    }
}

function renderComplaints() {
    // Refresh from storage and update stats
    complaints = JSON.parse(localStorage.getItem("complaints")) || [];
    $('totalCount').innerText = complaints.length;
    $('pendingCount').innerText = complaints.filter(c => c.status === "Pending").length;
    $('progressCount').innerText = complaints.filter(c => c.status === "In Progress").length;
    $('resolvedCount').innerText = complaints.filter(c => c.status === "Resolved").length;

    // Filter
    let filtered = currentFilter === 'High'
        ? complaints.filter(isHighPriority)
        : currentFilter === 'All' ? [...complaints]
        : complaints.filter(c => c.status === currentFilter);

    // Sort: high priority first, then newest
    filtered.sort((a, b) => {
        const ah = isHighPriority(a), bh = isHighPriority(b);
        return ah !== bh ? (ah ? -1 : 1) : b.timestamp - a.timestamp;
    });

    const container = $("complaintsContainer");
    if(!filtered.length) {
        container.innerHTML = "<div style='padding:20px;text-align:center;'>No complaints recorded in this view.</div>";
        return;
    }

    container.innerHTML = "";
    filtered.forEach(c => {
        const hp = isHighPriority(c);
        const imgHtml = c.images?.length
            ? `<div style="margin-top:10px;"><strong>Attached Evidence:</strong><br><img src="${c.images[0]}" style="max-width:100px;max-height:100px;border-radius:4px;margin-top:5px;border:1px solid #ccc;"></div>`
            : '';
        const div = document.createElement('div');
        div.className = `complaint-item${hp ? ' high-priority' : ''}`;
        div.innerHTML = `
            <div>
                <div class="c-meta">${new Date(c.timestamp).toLocaleString()}</div>
                <div class="c-id">${c.id}</div>
                <strong>${c.category}</strong>
                <div>${hp ? '<span class="c-badge badge-danger">High Priority (SLA Expired)</span>' : ''}</div>
            </div>
            <div class="c-desc">
                ${c.description}<br><br>
                <small><strong>Landmark:</strong> ${c.landmark||'N/A'}</small><br>
                <small><strong>Coords:</strong> ${c.coordinates||'N/A'}</small>
                ${imgHtml}
            </div>
            <div><strong>Phone:</strong><br>${c.contact}</div>
            <div><strong>Status:</strong><br>${c.status}</div>
            <div>
                <select class="status-select" onchange="updateStatus('${c.id}',this.value)">
                    ${['Pending','In Progress','Resolved'].map(s => `<option value="${s}"${c.status===s?' selected':''}>${s}</option>`).join('')}
                </select>
                <button class="btn-delete" onclick="deleteComplaint('${c.id}')">Delete Record</button>
            </div>`;
        container.appendChild(div);
    });
}

function updateStatus(id, newStatus) {
    complaints = complaints.map(c => c.id === id ? {...c, status: newStatus} : c);
    localStorage.setItem("complaints", JSON.stringify(complaints));
    renderComplaints();
}

function renderChart() {
    complaints = JSON.parse(localStorage.getItem("complaints")) || [];
    const areaCounts = {};
    complaints.forEach(c => {
        let area = (c.landmark?.trim() || 'Unknown Area');
        if(area.length > 20) area = area.substring(0, 20) + '...';
        areaCounts[area] = (areaCounts[area] || 0) + 1;
    });

    const labels = Object.keys(areaCounts).sort((a,b) => areaCounts[b]-areaCounts[a]).slice(0,10);
    const ctx = $('analyticsChart').getContext('2d');
    if(chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Number of Complaints', data: labels.map(a => areaCounts[a]), backgroundColor: '#1A237E', borderRadius: 4 }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });
}

// Auto-refresh dashboard every 30 seconds
setInterval(() => {
    if($('dashboardView').style.display === "flex") {
        currentView === 'analytics' ? renderChart() : renderComplaints();
    }
}, 30000);
