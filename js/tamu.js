// ============================================
// KONFIGURASI API (GANTI DENGAN URL APPS SCRIPT ANDA)
// ============================================
const API = 'https://script.google.com/macros/s/AKfycbwMV2xpMRiUEoTWVIxqIxoM8B_ngUrqqYIPI0So6vZJnCGYSnIDyRrMfg9uJ7gZicURJQ/exec';
let locationData = null;
let cameraStream = null;
document.addEventListener('DOMContentLoaded', () => {
loadMasterData();
requestLocation();
setupAutocomplete();
});
async function loadMasterData() {
try {
const [instRes, sekRes, nameRes] = await Promise.all([
fetchAPI('getInstansi'),
fetchAPI('getSeksi'),
fetchAPI('getGuestNameList')
]);
if(instRes.success) {
  const sel = document.getElementById('instansi');
  sel.innerHTML = '<option value="">-- Pilih Instansi --</option>' + 
    instRes.data.map(i => `<option value="${i.nama}">${i.nama}</option>`).join('');
}
if(sekRes.success) {
  const sel = document.getElementById('tujuanSeksi');
  sel.innerHTML = '<option value="">-- Pilih Tujuan --</option>' + 
    sekRes.data.map(s => `<option value="${s.kode}">${s.nama}</option>`).join('');
}
window.guestNames = nameRes.success ? nameRes.data : [];
} catch(e) { console.error('Gagal load master data', e); }
}
function requestLocation() {
const box = document.getElementById('locationStatus');
if(!navigator.geolocation) { box.className='status-box error'; box.innerHTML='Browser tidak mendukung GPS'; return; }
navigator.geolocation.getCurrentPosition(
pos => {
locationData = {lat: pos.coords.latitude, lng: pos.coords.longitude};
box.className='status-box success';
box.innerHTML = `<i class="fas fa-check-circle"></i> Lokasi terdeteksi (${locationData.lat.toFixed(4)}, ${locationData.lng.toFixed(4)})`;
},
() => { box.className='status-box error'; box.innerHTML='<i class="fas fa-exclamation-triangle"></i> Gagal akses GPS. Pastikan izin diberikan.'; },
{enableHighAccuracy:true, timeout:8000}
);
}
function setJenis(val, el) {
document.getElementById('jenis').value = val;
document.querySelectorAll('.radio-opt').forEach(o => o.classList.remove('active'));
el.classList.add('active');
document.getElementById('instansiGroup').classList.toggle('hidden', val === 'umum');
}
function setupAutocomplete() {
const inp = document.getElementById('nama');
const list = document.getElementById('acList');
inp.addEventListener('input', () => {
const q = inp.value.toLowerCase();
list.style.display = q.length < 2 ? 'none' : 'block';
list.innerHTML = '';
if(q.length >= 2) {
window.guestNames.filter(g => g.nama.toLowerCase().includes(q)).slice(0,5).forEach(g => {
const div = document.createElement('div');
div.className='ac-item'; div.textContent=g.nama;
div.onclick = () => { inp.value=g.nama; document.getElementById('noTelp').value=g.telp||''; list.style.display='none'; };
list.appendChild(div);
});
}
});
document.addEventListener('click', e => { if(!e.target.closest('.autocomplete')) list.style.display='none'; });
}
async function initCamera() {
try {
cameraStream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'}});
document.getElementById('vid').srcObject = cameraStream;
document.getElementById('vid').classList.remove('hidden');
document.getElementById('btnCam').classList.add('hidden');
document.getElementById('btnCap').classList.remove('hidden');
} catch { alert('Kamera tidak dapat diakses. Izinkan akses kamera di browser.'); }
}
function capturePhoto() {
const v = document.getElementById('vid');
const c = document.getElementById('can');
c.width = v.videoWidth; c.height = v.videoHeight;
c.getContext('2d').drawImage(v,0,0);
document.getElementById('fotoSelfie').value = c.toDataURL('image/jpeg', 0.6);
cameraStream.getTracks().forEach(t => t.stop());
v.classList.add('hidden'); c.style.display='block';
document.getElementById('btnCap').classList.add('hidden');
document.getElementById('btnRetake').classList.remove('hidden');
}
function retakePhoto() {
document.getElementById('can').style.display='none';
document.getElementById('fotoSelfie').value = '';
document.getElementById('btnRetake').classList.add('hidden');
initCamera();
}
async function submitGuest(e) {
e.preventDefault();
const btn = document.getElementById('btnSubmit');
btn.classList.add('loading'); // Tampilkan loading
const payload = {
action: 'registerGuest',
nama: document.getElementById('nama').value.trim(),
jenis: document.getElementById('jenis').value,
instansi: document.getElementById('instansi').value,
tujuanSeksi: document.getElementById('tujuanSeksi').value,
noTelp: document.getElementById('noTelp').value.trim(),
fotoSelfie: document.getElementById('fotoSelfie').value,
lokasiLat: locationData?.lat || 0,
lokasiLng: locationData?.lng || 0,
alamatLokasi: document.getElementById('locationStatus').innerText
};
try {
const res = await fetchAPI('registerGuest', payload);
if(res.success) {
document.getElementById('formArea').classList.add('hidden');
document.getElementById('successArea').classList.remove('hidden');
document.getElementById('succMsg').textContent = `Selamat datang, ${res.nama}`;
document.getElementById('succTime').textContent = `Waktu: ${new Date(res.waktu).toLocaleString('id-ID')}`;
} else {
alert(res.message);
}
} catch(err) {
alert('Gagal menyimpan data. Periksa koneksi internet.');
console.error(err);
} finally {
btn.classList.remove('loading'); // Hapus loading
}
}
function resetForm() {
document.getElementById('guestForm').reset();
document.getElementById('formArea').classList.remove('hidden');
document.getElementById('successArea').classList.add('hidden');
document.getElementById('can').style.display='none';
document.getElementById('btnCam').classList.remove('hidden');
}
// === API HELPER (FIX CORS & NO-CORS ISSUE) ===
async function fetchAPI(action, payload = {}) {
const body = JSON.stringify({action, ...payload});
const res = await fetch(API, {
method: 'POST',
headers: {'Content-Type': 'text/plain;charset=utf-8'},
body: body,
redirect: 'follow'
});
return await res.json();
}