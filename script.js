let appData = JSON.parse(localStorage.getItem('attendance_v5')) || { 
    events: [], overrides: {}, profile: { name: "", college: "", dept: "", hod: "" } 
};
let curDate = new Date();

function openProfile() {
    document.getElementById('pName').value = appData.profile.name || "";
    document.getElementById('pCollege').value = appData.profile.college || "";
    document.getElementById('pDept').value = appData.profile.dept || "";
    document.getElementById('pHod').value = appData.profile.hod || "";
    document.getElementById('profileModal').style.display = "flex";
}

function closeProfile() { document.getElementById('profileModal').style.display = "none"; }

function saveProfile() {
    appData.profile = {
        name: document.getElementById('pName').value,
        college: document.getElementById('pCollege').value,
        dept: document.getElementById('pDept').value,
        hod: document.getElementById('pHod').value
    };
    sync(); closeProfile();
}

async function saveEvent(isEdit) {
    const title = document.getElementById('title').value;
    if (!title) return alert("Title required");
    let photoBase64 = isEdit ? appData.events.find(e => e.id == document.getElementById('editId').value).photo : "";
    const file = document.getElementById('photo').files[0];
    if (file) photoBase64 = await toBase64(file);

    const entry = {
        id: isEdit ? parseInt(document.getElementById('editId').value) : Date.now(),
        title, start: document.getElementById('start').value, end: document.getElementById('end').value,
        impact: document.getElementById('impact').value, photo: photoBase64
    };
    if (isEdit) { const idx = appData.events.findIndex(e => e.id === entry.id); appData.events[idx] = entry; }
    else appData.events.push(entry);
    sync(); resetForm();
}

const toBase64 = file => new Promise((res) => {
    const r = new FileReader(); r.readAsDataURL(file); r.onload = () => res(r.result);
});

function toggleDate(dateStr) {
    const d = new Date(dateStr); const isWE = (d.getDay() === 0 || d.getDay() === 6);
    const def = isWE ? 'holiday' : 'working';
    appData.overrides[dateStr] = ((appData.overrides[dateStr] || def) === 'working' ? 'holiday' : 'working');
    if (appData.overrides[dateStr] === def) delete appData.overrides[dateStr];
    sync();
}

function renderCalendar() {
    const body = document.getElementById('calendarBody');
    const head = document.getElementById('calendarHeader');
    head.innerHTML = ['S','M','T','W','T','F','S'].map(d => `<div style="font-weight:bold;font-size:0.7em">${d}</div>`).join('');
    body.innerHTML = "";
    const y = curDate.getFullYear(), m = curDate.getMonth();
    document.getElementById('monthDisplay').innerText = new Intl.DateTimeFormat('en-US', {month:'long', year:'numeric'}).format(curDate);
    const first = new Date(y, m, 1).getDay(), total = new Date(y, m+1, 0).getDate();
    for (let i=0; i<first; i++) body.innerHTML += `<div></div>`;
    for (let d=1; d<=total; d++) {
        const s = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const isWE = (new Date(y, m, d).getDay() === 0 || new Date(y, m, d).getDay() === 6);
        const status = appData.overrides[s] || (isWE ? 'holiday' : 'working');
        body.innerHTML += `<div class="cal-day" onclick="toggleDate('${s}')" style="background:${status==='holiday'?'var(--holiday)':'var(--working)'};color:${status==='holiday'?'#dc2626':'#16a34a'}">${d}</div>`;
    }
}

function printL(id) {
    const ev = appData.events.find(e => e.id === id);
    const p = appData.profile;
    document.getElementById('outName').innerText = document.getElementById('outName2').innerText = p.name || "[NAME]";
    document.getElementById('outColl').innerText = p.college || "[COLLEGE]";
    document.getElementById('outDept').innerText = document.getElementById('outDept2').innerText = p.dept || "[DEPT]";
    document.getElementById('outHod').innerText = p.hod || "The Head of Department";
    
    let c = new Date(ev.start), l = new Date(ev.end), days = [];
    while(c <= l) {
        const s = c.toISOString().split('T')[0];
        const isWE = (c.getDay() === 0 || c.getDay() === 6);
        if((appData.overrides[s] || (isWE ? 'holiday' : 'working')) === 'working') days.push(c.toDateString());
        c.setDate(c.getDate()+1);
    }
    document.getElementById('lDate').innerText = new Date().toLocaleDateString();
    document.getElementById('lEventName').innerText = document.getElementById('lEventName2').innerText = ev.title;
    document.getElementById('lDays').innerHTML = days.map(d => `<li>${d}</li>`).join('');
    window.print();
}

function sync() { localStorage.setItem('attendance_v5', JSON.stringify(appData)); render(); renderCalendar(); }
function render() {
    document.getElementById('eventList').innerHTML = appData.events.slice().reverse().map(ev => `
        <div class="event-item">
            <div style="float:right"><button class="btn-sec" onclick="editEv(${ev.id})">Edit</button> <button class="btn-danger" onclick="delEv(${ev.id})">Del</button></div>
            <strong>${ev.title}</strong><br><small>${ev.start} to ${ev.end}</small>
            <p style="font-size:0.9em">${ev.impact}</p>
            ${ev.photo ? `<img src="${ev.photo}" class="preview-img" onclick="window.open(this.src)">` : ''}
            <button style="width:100%;margin-top:10px" onclick="printL(${ev.id})">Print Letter</button>
        </div>`).join('');
}
function editEv(id) {
    const ev = appData.events.find(e => e.id === id);
    document.getElementById('editId').value = ev.id; document.getElementById('title').value = ev.title;
    document.getElementById('start').value = ev.start; document.getElementById('end').value = ev.end;
    document.getElementById('impact').value = ev.impact; document.getElementById('formTitle').innerText = "Edit Mode";
    document.getElementById('editActions').style.display="flex"; document.getElementById('addBtn').style.display="none";
}
function resetForm() { ['title','start','end','impact','photo','editId'].forEach(k => document.getElementById(k).value=""); document.getElementById('formTitle').innerText="Log New Event"; document.getElementById('editActions').style.display="none"; document.getElementById('addBtn').style.display="block"; }
function delEv(id) { if(confirm("Delete?")) { appData.events = appData.events.filter(e => e.id !== id); sync(); } }
function changeMonth(d) { curDate.setMonth(curDate.getMonth()+d); renderCalendar(); }
function exportJSON() {
    const blob = new Blob([JSON.stringify(appData)], {type:'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'attendance_ledger.json'; a.click();
}
function importJSON(e) {
    const r = new FileReader(); r.onload = x => { appData = JSON.parse(x.target.result); sync(); }; r.readAsText(e.target.files[0]);
}
render(); renderCalendar();