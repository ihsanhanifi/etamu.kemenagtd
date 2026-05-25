const API = 'https://script.google.com/macros/s/AKfycbwMV2xpMRiUEoTWVIxqIxoM8B_ngUrqqYIPI0So6vZJnCGYSnIDyRrMfg9uJ7gZicURJQ/exec';
let user = null;

// ==========================================
// MODAL SYSTEM
// ==========================================
window.openModal = function(id) { 
  document.getElementById(id).classList.remove('hidden'); 
  setTimeout(()=>document.getElementById(id).classList.add('show'), 10); 
};
window.closeModal = function(id) {
  const el=document.getElementById(id); if(!el) return;
  el.classList.remove('show'); setTimeout(()=>el.classList.add('hidden'), 200);
  const form=el.querySelector('form'); if(form) form.reset();
  const btn=el.querySelector('button[type="submit"]'); if(btn) { btn.disabled=false; btn.innerHTML='Simpan'; }
};

document.addEventListener('click', e => {
  // Tutup modal/lightbox hanya jika yang diklik adalah overlay/background (bukan isi modal)
  const overlayClasses = ['modal', 'action-modal', 'lightbox'];
  
  overlayClasses.forEach(cls => {
    if (e.target.classList.contains(cls) && e.target.classList.contains('show')) {
      if (cls === 'lightbox') {
        closeLightbox();
      } else {
        closeModal(e.target.id);
      }
    }
  });
});

// ==========================================
// LOADER
// ==========================================
window.loader = {
  show: msg => { 
    const el=document.getElementById('globalLoader'); 
    document.getElementById('loaderText').textContent=msg||'Memproses...'; 
    el.style.display='flex'; 
    setTimeout(()=>el.classList.add('show'), 10); 
  },
  hide: delay => setTimeout(()=>{ 
    const el=document.getElementById('globalLoader'); 
    el.classList.remove('show'); 
    setTimeout(()=>el.style.display='none', 300); 
  }, delay||800)
};

// ==========================================
// INIT & SIDEBAR LOGIC
// ==========================================
window.addEventListener('DOMContentLoaded', ()=>{ 
  document.getElementById('globalLoader').style.display='none'; 
  document.getElementById('globalLoader').classList.remove('show'); 
  document.querySelectorAll('.modal, .lightbox').forEach(el=>{ el.classList.remove('show'); el.classList.add('hidden'); }); 
});

// FIX: Tambahkan logika untuk menutup sidebar saat klik di luar area menu
document.addEventListener('click', e => {
    const sb = document.getElementById('sidebar');
    const btn = document.querySelector('.mobile-toggle');
    // Jika sidebar terbuka, dan klik terjadi DI LUAR sidebar DAN tombol toggle
    if (sb && sb.classList.contains('open') && !sb.contains(e.target) && (!btn || !btn.contains(e.target))) {
        sb.classList.remove('open');
    }
});

// ==========================================
// AUTH (LOGIN)
// ==========================================
async function doLogin(e) {
  e.preventDefault(); loader.show('Memverifikasi kredensial...');
  try {
    const res = await fetchAPI('login', {username:document.getElementById('uUser').value.trim(), password:document.getElementById('uPass').value});
    if(res.success) {
      user=res.user; 
      document.getElementById('loginPage').classList.add('hidden'); 
      document.getElementById('dashPage').classList.remove('hidden');
      document.getElementById('roleBadge').textContent=`${user.role.toUpperCase()} | ${user.seksiId}`;
      if(user.role!=='superadmin') { document.getElementById('menuUser').style.display='none'; document.getElementById('menuSatker').style.display='none'; }
      await loadMaster(); showPage('overview');
    } else showActionModal('info', 'Login Gagal', res.message);
  } catch{ showActionModal('info', 'Error', 'Gagal koneksi server'); }
  finally { loader.hide(1000); }
}

function logout() { user=null; location.reload(); }
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }
function togglePass() { 
  const i=document.getElementById('uPass'), ic=document.getElementById('eyeIcon'); 
  if(i.type==='password'){i.type='text'; ic.classList.replace('fa-eye','fa-eye-slash');}
  else{i.type='password'; ic.classList.replace('fa-eye-slash','fa-eye');} 
}

// ==========================================
// NAVIGATION
// ==========================================
function showPage(id, el) {
  document.querySelectorAll('.page').forEach(p=>p.classList.add('hidden')); 
  document.querySelectorAll('.menu-item').forEach(m=>m.classList.remove('active'));
  document.getElementById(`pg-${id}`).classList.remove('hidden'); if(el) el.classList.add('active');
  if(window.innerWidth<=900) document.getElementById('sidebar').classList.remove('open');
  
  const titles={overview:'Dashboard', guests:'Data Tamu', reports:'Laporan', users:'Kelola User', satkers:'Kelola Satker'};
  document.getElementById('pageTitle').textContent=titles[id]||'';
  if(id==='overview') loadStats(); if(id==='guests') loadGuests(); if(id==='users') loadUsers(); if(id==='satkers') loadSatkers();
}

// ==========================================
// DATA LOADERS
// ==========================================
async function loadMaster() {
  const [sek] = await Promise.all([fetchAPI('getSeksi')]);
  const s1=document.getElementById('fSeksi'), s2=document.getElementById('nuSeksi');
  s1.innerHTML='<option value="">Semua Seksi</option>'; 
  s2.innerHTML='<option value="ALL">Semua Seksi</option>';
  sek.data.forEach(s => { 
    s1.innerHTML+=`<option value="${s.kode}">${s.nama}</option>`; 
    s2.innerHTML+=`<option value="${s.kode}">${s.nama}</option>`; 
  });
}

async function loadStats() {
  const today=new Date().toISOString().split('T')[0];
  const res=await fetchAPI('getGuests', {filterDate:today, role:user.role, seksiId:user.seksiId});
  const d=res.data;

  document.getElementById('statBox').innerHTML=`
    <div class="stat-card"><div class="stat-icon" style="background:#eff6ff;color:#1d4ed8;"><i class="fas fa-users"></i></div><div><h3>${d.length}</h3><p>Total Hari Ini</p></div></div>
    <div class="stat-card"><div class="stat-icon"><i class="fas fa-user-check"></i></div><div><h3>${d.filter(g=>g.status==='CHECKED_IN').length}</h3><p>Sedang Bertamu</p></div></div>
    <div class="stat-card"><div class="stat-icon" style="background:#fff7ed;color:#d97706;"><i class="fas fa-building"></i></div><div><h3>${d.filter(g=>g.jenis==='instansi').length}</h3><p>Dari Instansi</p></div></div>
  `;

  document.getElementById('tblRecent').innerHTML=d.slice(0,8).map(g=>`
    <tr><td>${new Date(g.waktuIn).toLocaleTimeString()}</td><td>${g.nama}</td><td>${g.instansi}</td><td>${g.tujuanSeksi}</td>
    <td><span class="badge ${g.status==='CHECKED_IN'?'badge-in':'badge-out'}">${g.status}</span></td></tr>
  `).join('') || '<tr><td colspan="5" style="text-align:center; padding:20px;">Belum ada data</td></tr>';
}

async function loadGuests() {
  const res=await fetchAPI('getGuests', {
    filterDate:document.getElementById('fDate').value, 
    filterSeksi:document.getElementById('fSeksi').value, 
    filterStatus:document.getElementById('fStatus').value, 
    role:user.role, 
    seksiId:user.seksiId
  });
  let list=res.data;
  let q=document.getElementById('fSearch').value.toLowerCase(); 
  if(q) list=list.filter(g=>g.nama.toLowerCase().includes(q));

  document.getElementById('tblAll').innerHTML=list.map(g=>{
    const foto=g.foto && g.foto!=='-' ? `<img src="${g.foto}" class="photo-thumb" onclick="openPhoto('${g.foto}')" loading="lazy">` : `<div class="no-photo"><i class="fas fa-user"></i></div>`;
    return `<tr>
      <td>${foto}</td><td style="font-family:monospace; color:#666;">${g.id}</td><td style="font-weight:500;">${g.nama}</td>
      <td>${g.tujuanSeksi}</td><td style="font-size:0.8rem;">${new Date(g.waktuIn).toLocaleString()}</td>
      <td><span class="badge ${g.status==='CHECKED_IN'?'badge-in':'badge-out'}">${g.status}</span></td>
      <td>${g.status==='CHECKED_IN'?`<button class="btn btn-warning btn-sm" onclick="confirmCheckout('${g.id}','${g.nama}')"><i class="fas fa-sign-out-alt"></i> Out</button>`:'-'}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="7" style="text-align:center; padding:20px;">Data tidak ditemukan</td></tr>';
}

async function confirmCheckout(id, nama) { 
  showActionModal('confirm', 'Checkout', `Proses checkout untuk ${nama}?`, async()=>{ 
    const r=await fetchAPI('checkout', {id}); 
    if(r.success){showActionModal('info','Berhasil',r.message); loadGuests(); loadStats();} 
    else showActionModal('info','Gagal',r.message);  
  }); 
}

// ==========================================
// ACTION MODAL SYSTEM
// ==========================================
function showActionModal(type, title, msg, onConfirm) {
  const m=document.getElementById('actionModal'); 
  m.querySelector('.modal-content-box').style.pointerEvents='auto';
  document.getElementById('amTitle').textContent=title; 
  document.getElementById('amMsg').textContent=msg;
  const ic=document.getElementById('amIcon'); 
  ic.className=`modal-icon ${type==='confirm'?'warn':'info'}`; 
  ic.innerHTML=type==='confirm'?'<i class="fas fa-exclamation"></i>':'<i class="fas fa-check-circle"></i>';
  document.getElementById('amConfirm').classList.toggle('hidden', type!=='confirm'); 
  document.getElementById('amOk').classList.toggle('hidden', type==='confirm');
  document.getElementById('amConfirm').onclick=()=>{ closeModal('actionModal'); if(onConfirm) onConfirm(); };
  document.getElementById('amOk').onclick=()=> closeModal('actionModal');
  m.classList.remove('hidden'); 
  setTimeout(()=>m.classList.add('show'), 10);
}

// ==========================================
// USER & SATKER MANAGEMENT
// ==========================================
async function addUser(e) {
  e.preventDefault(); 
  const btn=document.getElementById('btnSaveUser'); 
  btn.disabled=true; 
  btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
  try {
    const res=await fetchAPI('addUser', {
      nama:document.getElementById('nuNama').value, 
      username:document.getElementById('nuUser').value, 
      password:document.getElementById('nuPass').value, 
      role:document.getElementById('nuRole').value, 
      seksiId:document.getElementById('nuSeksi').value
    });
    if(res.success) { 
      closeModal('userModal'); 
      showActionModal('info','Berhasil','User berhasil ditambahkan.'); 
      loadUsers(); 
    } else showActionModal('info','Gagal',res.message);
  } catch{ showActionModal('info','Error','Gagal koneksi'); }
  finally { btn.disabled=false; btn.innerHTML='Simpan'; }
}

function confirmDeleteUser(id, nama) { 
  showActionModal('confirm', 'Hapus User', `Yakin hapus user "${nama}"?`, async()=>{ 
    const r=await fetchAPI('deleteUser', {userId:id}); 
    if(r.success){showActionModal('info','Berhasil','User dihapus.'); loadUsers();} 
    else showActionModal('info','Gagal',r.message) ; 
  }); 
}

async function loadUsers() {
  const res=await fetchAPI('getUsers');
  document.getElementById('tblUsers').innerHTML=res.data.map(u=>`
    <tr><td>${u.id}</td><td>${u.nama}</td>
    <td><span class="badge" style="background:#f1f5f9; color:var(--primary);">${u.role}</span></td>
    <td>${u.seksiId}</td>
    <td>${u.id!=='U001'?`<button class="btn btn-danger btn-sm" onclick="confirmDeleteUser('${u.id}','${u.nama}')"><i class="fas fa-trash"></i></button>`:'<span style="color:#aaa; font-size:0.7rem;">Protected</span>'}</td></tr>
  `).join('');
}

async function genReport(type) {
  const out=document.getElementById('reportOut'); 
  out.innerHTML='<p style="color:var(--primary);"><i class="fas fa-spinner fa-spin"></i> Memuat...</p>';
  const res=await fetchAPI('generateReport', {role:user.role, seksiId:user.seksiId}), s=res.stats;
  out.innerHTML=`
    <h2 style="text-align:center;">Laporan Tamu ${type}</h2>
    <div class="stats" style="margin:20px 0;">
      <div class="stat-card"><h3>${s.total}</h3><p>Total</p></div>
      <div class="stat-card"><h3>${s.byStatus?.CHECKED_IN||0}</h3><p>Check-In</p></div>
      <div class="stat-card"><h3>${s.byStatus?.CHECKED_OUT||0}</h3><p>Check-Out</p></div>
    </div>
    <table><thead><tr><th>Nama</th><th>Tujuan</th><th>Waktu</th><th>Status</th></tr></thead>
    <tbody>${res.data.map(g=>`<tr><td>${g.nama}</td><td>${g.tujuanSeksi}</td><td>${new Date(g.waktuIn).toLocaleString()}</td><td>${g.status}</td></tr>`).join('')}</tbody></table>
  `;
}

async function loadSatkers() {
  const res=await fetchAPI('getSatker');
  document.getElementById('tblSatkers').innerHTML=res.data.map(s=>`
    <tr><td>${s.id}</td><td>${s.nama}</td><td>${s.tipe}</td>
    <td><button class="btn btn-sm" onclick="alert('${s.qrData}')">Lihat</button></td></tr>
  `).join('') || '<tr><td colspan="4" style="text-align:center; padding:20px;">Belum ada data</td></tr>';
}

async function addSatker(e) {
  e.preventDefault();
  const res=await fetchAPI('addSatker', {nama:document.getElementById('nsNama').value, tipe:document.getElementById('nsTipe').value});
  if(res.success) {
    document.getElementById('qrOut').innerHTML=`<div id="qrTarget"></div><p style="font-size:0.8rem; word-break:break-all; margin-top:10px;">${res.qrData}</p>`;
    new QRCode(document.getElementById('qrTarget'), {text:res.qrData, width:150, height:150, colorDark:"#1a5f38", colorLight:"#ffffff"});
    closeModal('satkerModal'); 
    showActionModal('info','Berhasil','Satker & QR berhasil dibuat.'); 
    loadSatkers();
  }
}

function openPhoto(src) { document.getElementById('lbImg').src=src; document.getElementById('photoLightbox').classList.remove('hidden'); setTimeout(()=>document.getElementById('photoLightbox').classList.add('show'), 10); }
function closeLightbox() { const el=document.getElementById('photoLightbox'); el.classList.remove('show'); setTimeout(()=>el.classList.add('hidden'), 200); }

async function fetchAPI(action, payload={}) {
  const res=await fetch(API, {method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify({action, ...payload}), redirect:'follow'});
  return await res.json();
}
