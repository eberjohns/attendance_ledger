// Browser compatible: Remove Capacitor plugin usage
const DATA_FILE = 'attendance_data.json';
// Variable declarations moved below if already present in the file

let appData = { events: [], lookouts: [], overrides: {}, profile: {name:"", college:"", dept:"", hod:""} };
let curDate = new Date();
let selectedISO = "";
let editingLookoutId = null;

async function sync() {
    try {
        localStorage.setItem('att_v9', JSON.stringify(appData));
    } catch (e) {
        alert("Sync error: " + e.message);
    }
    renderAll();
}

async function loadData() {
    try {
        const local = localStorage.getItem('att_v9');
        if (local) appData = JSON.parse(local);
    } catch (e) {
        alert("Load error: " + e.message);
    }
    renderAll();
}

function renderAll() { renderHistory(); renderCalendar(); }

function renderCalendar() {
    const body = document.getElementById('calendarBody');
    const head = document.getElementById('calendarHeader');
    head.innerHTML = ['S','M','T','W','T','F','S'].map(d => `<div style="font-size:0.7em;font-weight:bold;color:#64748b">${d}</div>`).join('');
    body.innerHTML = "";
    const y = curDate.getFullYear(), m = curDate.getMonth();
    document.getElementById('monthDisplay').innerText = new Intl.DateTimeFormat('en-US', {month:'long', year:'numeric'}).format(curDate);
    const first = new Date(y, m, 1).getDay(), total = new Date(y, m+1, 0).getDate();
    for (let i=0; i<first; i++) body.innerHTML += `<div></div>`;
    for (let d=1; d<=total; d++) {
        const s = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const isWE = (new Date(y, m, d).getDay() === 0 || new Date(y, m, d).getDay() === 6);
        const status = appData.overrides[s] || (isWE ? 'holiday' : 'working');
        const hasHistory = appData.events.some(e => s >= e.start && s <= e.end);
        const hasLookout = appData.lookouts.some(e => e.date === s);
        body.innerHTML += `
            <div class="cal-day" onclick="openDay('${s}')" style="background:${status==='holiday'?'#fee2e2':'#dcfce7'}; color:${status==='holiday'?'#dc2626':'#16a34a'}">
                ${d}
                <div class="dot-container">
                    ${hasHistory ? '<div class="dot history"></div>' : ''}
                    ${hasLookout ? '<div class="dot lookout"></div>' : ''}
                </div>
            </div>`;
    }
}

function openDay(iso) {
    selectedISO = iso;
    document.getElementById('sliderDateTitle').innerText = new Date(iso).toDateString();
    document.getElementById('eventSliderOverlay').style.display = "flex";
    renderSlider();
}

function viewImg(src) {
    document.getElementById('viewerImg').src = src;
    document.getElementById('imageViewer').style.display = "flex";
}

// --- SCHEDULING LOGIC ---
function renderSlider() {
    const wrapper = document.getElementById('sliderItems');
    const dayLookouts = appData.lookouts.filter(e => e.date === selectedISO);
    if(dayLookouts.length === 0) { wrapper.innerHTML = `<div class="slider-card" style="text-align:center;">No events.</div>`; return; }

    wrapper.innerHTML = dayLookouts.map(e => `
        <div class="slider-card">
            ${e.poster ? `<img src="${e.poster}" onclick="viewImg('${e.poster}')">` : ''}
            <h3 style="margin:0 0 5px 0;">${e.title}</h3>
            <div style="font-size:0.8em; color:#94a3b8; margin-bottom:10px;">
                📍 ${e.venue || 'N/A'} | 📅 ${e.duration || 1} Days<br>
                💰 ${e.prize || 'N/A'} | 🎟️ ${e.fee || 'Free'}
            </div>
            ${e.link ? `<a href="${e.link}" target="_blank" style="color:var(--accent); font-size:0.8em; display:block; margin-bottom:5px;">Registration Link 🔗</a>` : ''}
            <p style="font-size:0.8em; height:60px; overflow-y:auto; color:#cbd5e1; margin-top:5px;">${e.desc || 'No description'}</p>
            <div style="display:flex; gap:5px;">
                <button onclick="toggleGoing(${e.id})" style="flex:2; background:${e.going ? '#10b981' : '#475569'}">${e.going ? '✅ Going' : 'Mark'}</button>
                <button onclick="editLookout(${e.id})" class="btn-sec">Edit</button>
                <button onclick="delLookout(${e.id})" class="btn-danger">🗑️</button>
            </div>
        </div>`).join('');
}

function openAddLookout() {
    document.getElementById('addLookoutModal').style.display = "flex";
    document.getElementById('lookContent').innerHTML = `
        <h3 style="margin-top:0;">Schedule Event</h3>
        <input type="text" id="lt" placeholder="Event Title">
        <div style="display:flex; gap:5px;">
            <input type="text" id="lv" placeholder="Venue">
            <input type="number" id="ldur" placeholder="Days">
        </div>
        <div style="display:flex; gap:5px;">
            <input type="text" id="lp" placeholder="Prize">
            <input type="text" id="lf" placeholder="Fee">
        </div>
        <input type="text" id="ll" placeholder="Registration Link">
        <input type="text" id="lts" placeholder="Team Size">
        <textarea id="ld" rows="2" placeholder="Paste WhatsApp info..."></textarea>
        <input type="file" id="limg" accept="image/*">
        <button onclick="saveLookout()" style="width:100%">Save Event</button>
        <button onclick="closeLookout()" class="btn-sec" style="width:100%; margin-top:10px;">Cancel</button>
    `;
}

async function saveLookout() {
    const file = document.getElementById('limg').files[0];
    let b64 = editingLookoutId ? appData.lookouts.find(x => x.id === editingLookoutId).poster : "";
    if(file) b64 = await toBase64(file);

    const data = {
        id: editingLookoutId || Date.now(), date: selectedISO,
        title: document.getElementById('lt').value, prize: document.getElementById('lp').value,
        fee: document.getElementById('lf').value, team: document.getElementById('lts').value,
        venue: document.getElementById('lv').value, duration: document.getElementById('ldur').value,
        link: document.getElementById('ll').value, desc: document.getElementById('ld').value,
        poster: b64, going: false
    };

    if(editingLookoutId) {
        const idx = appData.lookouts.findIndex(x => x.id === editingLookoutId);
        appData.lookouts[idx] = data;
    } else { appData.lookouts.push(data); }
    
    editingLookoutId = null; sync(); closeLookout(); renderSlider();
}

function editLookout(id) {
    editingLookoutId = id;
    const e = appData.lookouts.find(x => x.id === id);
    openAddLookout();
    document.getElementById('lt').value = e.title; document.getElementById('lp').value = e.prize;
    document.getElementById('lf').value = e.fee; document.getElementById('lts').value = e.team;
    document.getElementById('lv').value = e.venue; document.getElementById('ldur').value = e.duration;
    document.getElementById('ll').value = e.link; document.getElementById('ld').value = e.desc;
}

// --- HISTORY LOGGING ---
async function saveEvent(isEdit) {
    const title = document.getElementById('title').value; if(!title) return;
    const img = document.getElementById('photo').files[0];
    let b64 = isEdit ? appData.events.find(e => e.id == document.getElementById('editId').value).photo : "";
    if(img) b64 = await toBase64(img);
    
    const ev = { id: isEdit ? parseInt(document.getElementById('editId').value) : Date.now(), title, start: document.getElementById('start').value, end: document.getElementById('end').value, impact: document.getElementById('impact').value, photo: b64 };
    if(isEdit) { const i = appData.events.findIndex(e => e.id === ev.id); appData.events[i] = ev; }
    else appData.events.push(ev);
    sync(); resetForm();
}

function renderHistory() {
    document.getElementById('eventList').innerHTML = appData.events.slice().reverse().map(e => `
        <div class="card history-card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <button class="delete-btn-top" onclick="delEv(${e.id})">✕</button>
                <button class="btn-sec" style="margin-right:8px;" onclick="editEv(${e.id})">✎ Edit</button>
            </div>
            <div onclick="editEv(${e.id})">
                <strong>${e.title}</strong><br>
                <small>${e.start} to ${e.end}</small><br>
                <p style="font-size:0.85em; margin:5px 0;">${e.impact}</p>
                ${e.photo ? `<img src="${e.photo}" class="history-img" onclick="event.stopPropagation(); viewImg('${e.photo}')">` : ''}
            </div>
            <button style="width:100%; margin-top:10px; font-size:0.8em;" onclick="generateLetter(${e.id})">Generate Letter</button>
        </div>`).join('');
}

function generateLetter(id) {
    const ev = appData.events.find(e => e.id === id);
    const p = appData.profile;
    let days = [], c = new Date(ev.start), l = new Date(ev.end);
    while(c <= l) {
        const s = c.toISOString().split('T')[0];
        const isWE = (c.getDay() === 0 || c.getDay() === 6);
        if((appData.overrides[s] || (isWE ? 'holiday' : 'working')) === 'working') days.push(c.toDateString());
        c.setDate(c.getDate()+1);
    }

    const letterText = `
        Date: ${new Date().toLocaleDateString()}<br><br>
        To,<br>${p.hod || "[HOD Title]"},<br>${p.dept || "[Department]"},<br>${p.college || "[College Name]"}.<br><br>
        <b>Subject: Request for Duty Leave for event - ${ev.title}</b><br><br>
        Respected Sir/Madam,<br>
        I, <b>${p.name || "[Name]"}</b>, request duty leave for the following working days:<br>
        <ul>${days.map(d => `<li>${d}</li>`).join('')}</ul>
        due to my participation in "${ev.title}". I have attached the proof for reference.<br><br>
        Yours faithfully,<br><b>${p.name || "[Name]"}</b>
    `;
    document.getElementById('letter-output').innerHTML = letterText;
    document.getElementById('letter-container').style.display = 'block';
    document.getElementById('letter-output').style.display = 'block';
}

async function copyLetter() {
    const text = document.getElementById('letter-output').innerText;
    await navigator.clipboard.writeText(text);
    alert("Letter text copied!");
}

// --- UTILS ---
const toBase64 = file => new Promise(res => { 
    const r = new FileReader(); 
    r.readAsDataURL(file); 
    r.onload = () => res(r.result); 
});
function delEv(id) { 
    if (confirm("Delete history entry?")) { 
        appData.events = appData.events.filter(x => x.id !== id); 
        sync(); 
    } 
}
function delLookout(id) { if(confirm("Remove?")) { appData.lookouts = appData.lookouts.filter(x => x.id !== id); sync(); renderSlider(); }}
function resetForm() { ['title','start','end','impact','photo','editId'].forEach(i => document.getElementById(i).value=""); document.getElementById('formTitle').innerText="Log Past Event"; document.getElementById('editActions').style.display="none"; document.getElementById('addBtn').style.display="block"; }
function changeMonth(d) { curDate.setMonth(curDate.getMonth() + d); renderCalendar(); }
function closeSlider() { document.getElementById('eventSliderOverlay').style.display = "none"; }
function closeLookout() { document.getElementById('addLookoutModal').style.display = "none"; editingLookoutId = null;}
function toggleGoing(id) { const e = appData.lookouts.find(x => x.id === id); e.going = !e.going; sync(); renderSlider(); }
function toggleHolidayFromSlider() {
    const d = new Date(selectedISO); const isWE = (d.getDay() === 0 || d.getDay() === 6);
    const def = isWE ? 'holiday' : 'working';
    const cur = appData.overrides[selectedISO] || def;
    appData.overrides[selectedISO] = (cur === 'working' ? 'holiday' : 'working');
    if (appData.overrides[selectedISO] === def) delete appData.overrides[selectedISO];
    sync(); closeSlider();
}
function editEv(id) { 
    const e = appData.events.find(x => x.id === id);
    document.getElementById('editId').value = e.id; document.getElementById('title').value = e.title;
    document.getElementById('start').value = e.start; document.getElementById('end').value = e.end;
    document.getElementById('impact').value = e.impact; document.getElementById('formTitle').innerText = "Edit Mode";
    document.getElementById('editActions').style.display = "flex"; document.getElementById('addBtn').style.display = "none";
}
function openProfile() {
    document.getElementById('profileModal').style.display = "flex";
    document.getElementById('profContent').innerHTML = `
        <h3>Profile</h3>
        <input type="text" id="pn" value="${appData.profile.name}" placeholder="Full Name">
        <input type="text" id="pc" value="${appData.profile.college}" placeholder="College">
        <input type="text" id="pd" value="${appData.profile.dept}" placeholder="Department">
        <input type="text" id="ph" value="${appData.profile.hod}" placeholder="HOD Title">
        <button onclick="saveProf()" style="width:100%">Save</button>
    `;
}
function saveProf() {
    appData.profile = { name: document.getElementById('pn').value, college: document.getElementById('pc').value, dept: document.getElementById('pd').value, hod: document.getElementById('ph').value };
    sync(); document.getElementById('profileModal').style.display = "none";
}

async function exportJSON() {
    try {
        const fileName = `attendance_backup_${Date.now()}.json`;
        const dataStr = JSON.stringify(appData);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (err) {
        alert("Export Error: " + err.message);
    }
}

// NATIVE IMPORT: Reads the selected file
function importJSON(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const importedData = JSON.parse(event.target.result);
            if (importedData.events || importedData.lookouts) {
                appData = importedData;
                await sync();
                alert("Import successful!");
            }
        } catch (err) {
            alert("Invalid JSON file.");
        }
    };
    reader.readAsText(file);
}

window.onload = loadData;