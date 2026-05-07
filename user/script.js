/* Coimbatore Smart City User Portal Scripts */

// Global state
let mockLocation = "11.0168, 76.9558";
let attachedImages = [], generatedOTP = null, otpVerified = false;
let map = null, marker = null;

const $ = id => document.getElementById(id);

// Switch active panel
function showPanel(panelId) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    $(panelId).classList.add('active');
    // Notify Leaflet if map panel becomes visible
    if(panelId === 'complaintPanel' && map) setTimeout(() => map.invalidateSize(), 100);
}

// Initialize Leaflet Map
function initMap() {
    if(!$('map')) return;
    const defaultPos = [11.0168, 76.9558];
    map = L.map('map').setView(defaultPos, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    marker = L.marker(defaultPos, {draggable: true}).addTo(map);
    $('mockCoordinates').value = mockLocation;

    const updateCoords = pos => {
        mockLocation = `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`;
        $('mockCoordinates').value = mockLocation;
        $('streetSelect').value = "";
    };
    marker.on('dragend', () => updateCoords(marker.getLatLng()));
    map.on('click', e => { marker.setLatLng(e.latlng); updateCoords(e.latlng); });
}

// Street dropdown selection
const streetSelect = $('streetSelect');
if(streetSelect) {
    streetSelect.addEventListener('change', function() {
        if(!this.value) return;
        const [lat, lng] = this.value.split(',').map(parseFloat);
        map.setView([lat, lng], 15);
        marker.setLatLng([lat, lng]);
        mockLocation = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        $('mockCoordinates').value = mockLocation;
    });
}

// File Upload
const fileInput = $('fileInput');
if(fileInput) fileInput.addEventListener('change', handleFiles);

function handleFiles(e) {
    for(const file of e.target.files) {
        if(attachedImages.length >= 3) { alert("Maximum 3 images allowed."); break; }
        if(!file.type.startsWith('image/')) continue;
        const reader = new FileReader();
        reader.onload = ev => { attachedImages.push(ev.target.result); renderPreviews(); };
        reader.readAsDataURL(file);
    }
}

function renderPreviews() {
    const container = $('imagePreviewContainer');
    container.innerHTML = '';
    attachedImages.forEach((src, i) => {
        const img = document.createElement('img');
        img.src = src; img.className = 'img-preview'; img.title = 'Click to remove';
        img.onclick = () => { attachedImages.splice(i, 1); renderPreviews(); };
        container.appendChild(img);
    });
}

// OTP
function sendOTP() {
    const phone = $("phone").value;
    if(!phone || phone.length !== 10) { alert("Please enter a valid 10-digit phone number."); return; }
    generatedOTP = Math.floor(1000 + Math.random() * 9000).toString();
    otpVerified = false;
    alert("Coimbatore Municipal Corp: Your Demo OTP is " + generatedOTP);
    $("otpBlock").style.display = "flex";
}

function verifyOTP() {
    const btn = $("verifyBtn");
    if($("otpInput").value === generatedOTP) {
        otpVerified = true;
        btn.innerText = "Verified ✓";
        btn.classList.add("btn-success");
        btn.style.pointerEvents = "none";
    } else {
        alert("Invalid OTP. Try again.");
    }
}

// Submit Complaint
const form = $("complaintForm");
if(form) {
    form.addEventListener("submit", function(e) {
        e.preventDefault();
        if(!otpVerified) { alert("Please verify your phone number using OTP first."); return; }

        const complaint = {
            id: 'CCMC' + Date.now().toString().slice(-6),
            category: $("category").value,
            description: $("description").value,
            landmark: $("landmark").value,
            coordinates: mockLocation || "Location Not Pinned",
            contact: $("phone").value,
            images: attachedImages,
            status: "Pending",
            timestamp: Date.now()
        };

        try {
            const complaints = JSON.parse(localStorage.getItem("complaints")) || [];
            complaints.push(complaint);
            localStorage.setItem("complaints", JSON.stringify(complaints));
        } catch(err) {
            alert("Storage limit exceeded. Try uploading smaller images.");
            return;
        }

        $("successMsg").style.display = "block";
        form.reset();
        otpVerified = false;
        attachedImages = [];
        renderPreviews();
        const btn = $("verifyBtn");
        btn.innerText = "Verify OTP";
        btn.classList.remove("btn-success");
        btn.style.pointerEvents = "auto";
        $("otpBlock").style.display = "none";
        $('mockCoordinates').value = mockLocation;
    });
}

// Track Complaint
function trackComplaint() {
    const phone = $("trackPhone").value;
    const complaints = JSON.parse(localStorage.getItem("complaints")) || [];
    const results = $("trackResults");
    const filtered = complaints.filter(c => c.contact === phone);

    if(!filtered.length) { results.innerHTML = "<p>No complaints found for this number.</p>"; return; }

    results.innerHTML = filtered.map(c => {
        const statusClass = c.status === "Pending" ? "status-pending" : c.status === "In Progress" ? "status-progress" : "status-resolved";
        const imgHtml = c.images?.length
            ? `<div style="margin-top:10px;"><strong>Evidence:</strong><br><img src="${c.images[0]}" style="max-width:100px;max-height:100px;border-radius:4px;margin-top:5px;border:1px solid #ccc;"></div>`
            : '';
        return `
        <div class="card" style="padding:20px;margin-top:15px;margin-bottom:0;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <strong>${c.id} - ${c.category}</strong>
                <span class="status-badge ${statusClass}">${c.status}</span>
            </div>
            <p style="margin-bottom:5px;font-size:14px;"><strong>Date:</strong> ${new Date(c.timestamp).toLocaleDateString()} | <strong>Landmark:</strong> ${c.landmark||'N/A'}</p>
            <p style="color:#666;font-size:14px;">${c.description}</p>
            ${imgHtml}
        </div>`;
    }).join('');
}

// Init
document.addEventListener('DOMContentLoaded', initMap);
