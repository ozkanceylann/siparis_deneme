// =======================================================
// KISAYOL
// =======================================================
const $ = (id) => document.getElementById(id);

// =======================================================
// ELEMENTLER
// =======================================================
const adEl = $("ad_soyad"),
  telEl = $("telefon"),
  adresEl = $("adres"),
  sehirEl = $("sehir"),
  ilceEl = $("ilce"),
  firmaEl = $("firma"),
  alanEl = $("siparisi_alan"),
  cokSatanContainer = $("cokSatanContainer"),
  digerSelect = $("digerSelect"),
  digerKgOptions = $("digerKgOptions"),
  digerAdet = $("digerAdet"),
  digerEkleBtn = $("digerEkleBtn"),
  digerListeContainer = $("digerListeContainer"),
  toplamEl = $("toplam"),
  toplamHint = $("toplamHint"),
  odemeEl = $("odeme"),
  notlarEl = $("notlar"),
  sonucEl = $("sonuc"),
  musteriHint = $("musteriHint"),
  siparisNoEl = $("siparis_no"),
  btnIptal = $("btnIptal"),
  btnUcretsiz = $("btnUcretsiz");

// LOGIN
const loginScreen = $("loginScreen"),
  appContainer = $("appContainer"),
  loginForm = $("loginForm"),
  loginUsername = $("loginUsername"),
  loginPassword = $("loginPassword"),
  loginMessage = $("loginMessage"),
  currentUserEl = $("currentUser"),
  adminBadge = $("adminBadge"),
  logoutBtn = $("logoutBtn");

// POPUP
const popup = $("popup"),
  popupBox = $("popupBox"),
  popupMsg = $("popupMsg"),
  popupClose = $("popupClose");

function showPopup(msg, type="ok") {
  popupMsg.textContent = msg;
  popup.classList.remove("hidden");

  if(type === "error") {
    popupBox.style.borderColor = "#7b0e0e";
    popupBox.style.color = "#ffb4b4";
  } else {
    popupBox.style.borderColor = "#1e2e45";
    popupBox.style.color = "#e6f1ff";
  }
}

// =======================================================
// GLOBALS
// =======================================================
let cokSatanUrunler = [];
let digerUrunler = [];
let digerSecimler = [];

let manualFreeMode = false;
let autoCalcLocked = false;
let currentUser = null;
let appInitialized = false;
let lastQueried = "";

const STORAGE_KEY = "siparisUser";

const SIPARISI_ALAN_LISTESI = ["Seda","Betül","İbrahim","Ceylan","Özkan","Cennet"];

// =======================================================
// UI & HELPERS
// =======================================================
function showApp(){ loginScreen.classList.add("hidden"); appContainer.classList.remove("hidden"); }
function showLogin(msg=""){ loginScreen.classList.remove("hidden"); appContainer.classList.add("hidden"); loginMessage.textContent=msg; loginMessage.className="text-sm text-center text-red-400"; }
function updateUserUI(user){ currentUserEl.textContent=user.username; adminBadge.classList.toggle("hidden", !user.admin); }

function fillSelect(el, arr, placeholder="Seçiniz…"){
  el.innerHTML = `<option value="">${placeholder}</option>`;
  arr.forEach(v=>{
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    el.appendChild(opt);
  });
}

async function setSiparisiAlan(user){
  const users = await getAllUsers();
  const userList = users.map(u => u.username);

  if(!user.admin){
    fillSelect(alanEl, [user.username], "");
    alanEl.value = user.username;
    alanEl.disabled = true;
  } else {
    fillSelect(alanEl, userList, "Seçiniz…");
    alanEl.disabled = false;
  }
}

popupClose.onclick = ()=> popup.classList.add("hidden");

// =======================================================
// LOGIN / STORAGE
// =======================================================
function saveUser(user){ const data={...user, exp: Date.now()+8*60*60*1000}; localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
function loadUser(){ try{ const raw=localStorage.getItem(STORAGE_KEY); if(!raw) return null; const u=JSON.parse(raw); if(Date.now()>u.exp){ localStorage.removeItem(STORAGE_KEY); return null;} return u; }catch{return null;} }

async function handleLogin(e){
  e.preventDefault();
  loginMessage.textContent="Giriş yapılıyor…";
  loginMessage.className="text-center text-blue-300 text-sm";

  try{
    const user = await loginUser(loginUsername.value.trim(), loginPassword.value);
    if(!user){ showLogin("Kullanıcı adı veya şifre hatalı."); return; }

    currentUser=user;
    saveUser(user);
    updateUserUI(user);
    showApp();
    setSiparisiAlan(user);
    await initApp();

  }catch{
    showLogin("Giriş hatası.");
  }
}

// =======================================================
// ŞEHİR / İLÇE
// =======================================================
async function loadCities(){
  const cities = await getCities();
  sehirEl.innerHTML = `<option value="">Şehir seçiniz…</option>`;
  cities.forEach(c=>{
    const opt=document.createElement("option");
    opt.value=c.id; 
    opt.textContent=c.name;
    sehirEl.appendChild(opt);
  });
}

async function loadDistrictsUI(cityId){
  ilceEl.disabled = true;
  ilceEl.innerHTML = `<option value="">Yükleniyor…</option>`;
  const d = await getDistricts(cityId);
  ilceEl.innerHTML = `<option value="">İlçe seçiniz…</option>`;
  d.forEach(x=>{
    const o=document.createElement("option");
    o.value=`${x.id}|${x.code}|${x.name}`;
    o.textContent=x.name;
    ilceEl.appendChild(o);
  });
  ilceEl.disabled=false;
}

// =======================================================
// ÜRÜNLER
// =======================================================
async function loadUrunlerUI(){
  const firma = firmaEl.value; if(!firma) return;
  const items = await getUrunler(firma);

  cokSatanUrunler = items.filter(u=>u.cok_satan);
  digerUrunler = items.filter(u=>!u.cok_satan);

  renderCokSatan();
  renderDigerDropdown();
  autoRecalc();
}

function renderCokSatan(){
  cokSatanContainer.innerHTML="";
  cokSatanUrunler.forEach(u=>{
    const box=document.createElement("div");
    box.className="product-box";
    box.innerHTML=`<div class="product-title">${u.ad}</div>`;
    box.appendChild(renderKgRow(u,10,u.fiyat_10));
    box.appendChild(renderKgRow(u,5,u.fiyat_5));
    cokSatanContainer.appendChild(box);
  });
}

function renderKgRow(u,kg,fiyat){
  const line=document.createElement("div");
  line.className="product-line";
  line.innerHTML=`
    <label class="flex items-center gap-2">
      <input type="checkbox" class="kg-check" data-id="${u.id}" data-kg="${kg}">
      <span class="text-sm">${kg} kg — <b>${fiyat} TL</b></span>
    </label>
    <div class="flex items-center gap-2">
      <span class="text-xs">Adet:</span>
      <input type="number" value="1" min="1"
             class="kg-adet"
             data-id="${u.id}"
             data-kg="${kg}">
    </div>
  `;
  return line;
}

function renderDigerDropdown(){
  digerSelect.innerHTML="";
  digerUrunler.forEach(u=>{
    const opt=document.createElement("option");
    opt.value=u.id; 
    opt.textContent=u.ad;
    digerSelect.appendChild(opt);
  });
  updateDigerKgOptions();
}

function updateDigerKgOptions(){
  const id=Number(digerSelect.value);
  const u=digerUrunler.find(x=>x.id===id);
  if(!u){ digerKgOptions.innerHTML=""; return; }
  digerKgOptions.innerHTML=`
    <label class="flex items-center gap-2">
      <input type="radio" name="digerKg" value="10|${u.fiyat_10}" checked>
      <span>10 kg — ${u.fiyat_10} TL</span>
    </label>
    <label class="flex items-center gap-2">
      <input type="radio" name="digerKg" value="5|${u.fiyat_5}">
      <span>5 kg — ${u.fiyat_5} TL</span>
    </label>
  `;
}

digerSelect.onchange=updateDigerKgOptions;

digerEkleBtn.onclick = (e)=>{
  e.preventDefault();
  const id=Number(digerSelect.value);
  const u=digerUrunler.find(x=>x.id===id);
  if(!u) return;

  const kgRadio=document.querySelector('input[name="digerKg"]:checked');
  if(!kgRadio) return;

  const [kg,fiyat]=kgRadio.value.split("|").map(Number);
  const adet=Number(digerAdet.value||1);

  digerSecimler.push({
    id:u.id, ad:u.ad, kg, adet,
    fiyat, toplam:fiyat*adet
  });

  renderDigerListe();
  autoRecalc();
};

function renderDigerListe(){
  digerListeContainer.innerHTML="";
  digerSecimler.forEach((x,i)=>{
    const row=document.createElement("div");
    row.className="diger-item";
    row.innerHTML=`
      <div>${x.ad}</div>
      <div>${x.kg} kg</div>
      <div>x${x.adet}</div>
      <div>${x.toplam} TL</div>
      <button type="button" class="remove-btn" data-index="${i}">Sil</button>
    `;
    digerListeContainer.appendChild(row);
  });

  document.querySelectorAll(".remove-btn").forEach(b=>{
    b.onclick=()=>{
      const i=Number(b.dataset.index);
      digerSecimler.splice(i,1);
      renderDigerListe();
      autoRecalc();
    };
  });
}

// =======================================================
// TOPLAM
// =======================================================
function hesaplaToplam(){
  if(manualFreeMode) return 0;
  let total=0;

  document.querySelectorAll(".kg-check:checked").forEach(chk=>{
    const id=chk.dataset.id;
    const kg=Number(chk.dataset.kg);
    const adetEl=document.querySelector(`.kg-adet[data-id="${id}"][data-kg="${kg}"]`);
    const adet=Number(adetEl.value||1);
    const u=cokSatanUrunler.find(x=>x.id==id);
    const fiyat = kg===10 ? u.fiyat_10 : u.fiyat_5;
    total += fiyat*adet;
  });

  digerSecimler.forEach(x=> total+=x.toplam);

  return total;
}

function autoRecalc(){
  if(autoCalcLocked) return;
  toplamEl.value = hesaplaToplam();
  toplamHint.textContent="Otomatik hesaplandı.";
}

// =======================================================
// ÜCRETSİZ / DEĞİŞİM
// =======================================================
btnUcretsiz.onclick = ()=>{
  manualFreeMode = !manualFreeMode;

  if(manualFreeMode){
    toplamEl.value=0;
    odemeEl.disabled=true;
    autoCalcLocked = true;
    btnUcretsiz.textContent="Ücretli Yap";
  }else{
    odemeEl.disabled=false;
    autoCalcLocked=false;
    btnUcretsiz.textContent="Ücretsiz / Değişim";
    autoRecalc();
  }
};

// =======================================================
// TELEFON LOOKUP
// =======================================================
async function handleTelLookup(){
  let raw=telEl.value.replace(/\D/g,"").slice(0,10);
  telEl.value=raw;

  if(raw.length!==10){
    musteriHint.textContent="";
    return;
  }
  if(raw===lastQueried) return;
  lastQueried=raw;

  musteriHint.textContent="Müşteri sorgulanıyor…";

  try{
    const m = await findMusteriByTel(raw);
    if(!m){
      musteriHint.textContent="Bu numara kayıtlı değil.";
      return;
    }

    adEl.value = m.ad_soyad || "";
    adresEl.value = m.adres || "";

    if(m.firma){
      firmaEl.value=m.firma;
      await loadUrunlerUI();
    }

    if(m.sehir){
      const cityOpt=[...sehirEl.options].find(o=>o.textContent===m.sehir);
      if(cityOpt){
        sehirEl.value=cityOpt.value;
        await loadDistrictsUI(cityOpt.value);

        const ilOpt=[...ilceEl.options].find(o=>o.textContent===m.ilce);
        if(ilOpt) ilceEl.value=ilOpt.value;
      }
    }

    musteriHint.textContent="Müşteri bilgileri yüklendi.";

  }catch(err){
    musteriHint.textContent="Sorgu hatası.";
  }
}
telEl.addEventListener("input", handleTelLookup);

// =======================================================
// SUBMIT (N8N)
// =======================================================
$("form").onsubmit = async (e)=>{
  e.preventDefault();
  sonucEl.textContent="Gönderiliyor…";

  // --- ŞEHİR AYRI ---
  const sehirId = sehirEl.value;
  const sehirAd = sehirEl.options[sehirEl.selectedIndex]?.textContent || "";

  // --- İLÇE AYRI ---
  let ilceId = "";
  let ilceKod = "";
  let ilceAd = "";

  if (ilceEl.value) {
    const [id, code, name] = ilceEl.value.split("|");
    ilceId = id;
    ilceKod = code;
    ilceAd = name;
  }

  const siparisNo = siparisNoEl.value.trim() || null;

  const secilen=[];

  // ÇOK SATANLAR
  document.querySelectorAll(".kg-check:checked").forEach(chk=>{
    const id=chk.dataset.id;
    const kg=Number(chk.dataset.kg);
    const adetEl=document.querySelector(`.kg-adet[data-id="${id}"][data-kg="${kg}"]`);
    const adet=Number(adetEl.value||1);
    const u=cokSatanUrunler.find(x=>x.id==id);
    const fiyat = kg===10 ? u.fiyat_10 : u.fiyat_5;

    secilen.push({
      id:u.id, 
      ad:u.ad, 
      kg,
      fiyat: manualFreeMode?0:fiyat,
      adet, 
      toplam: manualFreeMode?0:fiyat*adet
    });
  });

  // DİĞERLERİ
  digerSecimler.forEach(x=>{
    secilen.push({
      id:x.id, 
      ad:x.ad, 
      kg:x.kg,
      fiyat: manualFreeMode?0:x.fiyat,
      adet:x.adet, 
      toplam: manualFreeMode?0:x.toplam
    });
  });

  // 🔥 JSON.stringify KALDIRILDI → Gerçek JSON array gidiyor
  const kayit={
    siparis_no:siparisNo,
    musteri_tel:telEl.value,
    musteri_ad_soyad:adEl.value,
    musteri_adres:adresEl.value,

    sehir_id: sehirId,
    sehir: sehirAd,

    ilce_id: ilceId,
    ilce_kod: ilceKod,
    ilce: ilceAd,

    firma:firmaEl.value,
    siparis_alan:alanEl.value,

    secilen_urunler: secilen,

    toplam_tutar:manualFreeMode?0:Number(toplamEl.value),
    odeme_turu:manualFreeMode?null:odemeEl.value,
    notlar:notlarEl.value
  };

  try{
    await insertFormSiparis(kayit);
    sonucEl.className="text-sm text-emerald-400";
    sonucEl.textContent="Gönderildi.";
    autoCalcLocked=false;
  }catch{
    sonucEl.className="text-sm text-red-400";
    sonucEl.textContent="Gönderim hatası.";
  }
};

// =======================================================
// SİPARİŞ NO YÜKLEME
// =======================================================
siparisNoEl.onblur = loadSiparisByNo;
siparisNoEl.addEventListener("keydown",(e)=>{
  if(e.key==="Enter"){ e.preventDefault(); loadSiparisByNo(); }
});

// (Kalan loadSiparisByNo fonksiyonu aynı şekilde devam ediyor…)


// =======================================================
// INIT
// =======================================================
async function initApp(){
  if(appInitialized) return;
  appInitialized=true;

  fillSelect(firmaEl, ["Tasdipli","Esin","Queen"], "Firma seçiniz…");

  setSiparisiAlan(currentUser);
  await loadCities();

  ilceEl.disabled=true;
  ilceEl.innerHTML=`<option value="">Önce şehir seçiniz…</option>`;
}

// =======================================================
// EVENTLER
// =======================================================
loginForm.onsubmit = handleLogin;
logoutBtn.onclick = ()=>{ localStorage.removeItem(STORAGE_KEY); location.reload(); };

sehirEl.onchange = (e)=>{
  if(!e.target.value){
    ilceEl.disabled=true;
    ilceEl.innerHTML=`<option value="">Önce şehir seçiniz…</option>`;
    return;
  }
  loadDistrictsUI(e.target.value);
};

firmaEl.onchange = loadUrunlerUI;

document.addEventListener("input", (e)=>{
  if(e.target.classList.contains("kg-check") ||
     e.target.classList.contains("kg-adet")){
    autoRecalc();
  }
});

toplamEl.oninput = ()=>{ autoCalcLocked=true; };

// Auto login
(function(){
  const saved=loadUser();
  if(saved){
    currentUser=saved;
    updateUserUI(saved);
    showApp();
    setSiparisiAlan(saved);
    initApp();
  }else{
    showLogin();
  }
})();
