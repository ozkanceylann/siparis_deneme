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
  musteriNotuEl = $("musteri_notu"),
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

// SİPARİŞLERİM EKRANI
const siparislerimBtn = $("siparislerimBtn"),
  siparislerimScreen = $("siparislerimScreen"),
  siparisListe = $("siparisListe"),
  filtreTarih1 = $("filtreTarih1"),
  filtreTarih2 = $("filtreTarih2"),
  filtreFirma = $("filtreFirma"),
  filtreBtn = $("filtreBtn");

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

popupClose.onclick = ()=> popup.classList.add("hidden");

// =======================================================
// GLOBAL
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

// =======================================================
// UI HELPERS
// =======================================================
function showApp(){
  loginScreen.classList.add("hidden");
  appContainer.classList.remove("hidden");
}
function showLogin(msg=""){
  loginScreen.classList.remove("hidden");
  appContainer.classList.add("hidden");
  loginMessage.textContent=msg;
  loginMessage.className="text-sm text-center text-red-400";
}
function updateUserUI(user){
  currentUserEl.textContent=user.username;
  adminBadge.classList.toggle("hidden", !user.admin);
}

function fillSelect(el, arr, placeholder="Seçiniz…"){
  el.innerHTML = `<option value="">${placeholder}</option>`;
  arr.forEach(v=>{
    el.innerHTML += `<option value="${v}">${v}</option>`;
  });
}

async function setSiparisiAlan(user){
  const users = await getAllUsers();
  const userList = users.map(u=>u.username);

  if(!user.admin){
    fillSelect(alanEl, [user.username], "");
    alanEl.value = user.username;
    alanEl.disabled = true;
  } else {
    fillSelect(alanEl, userList, "Seçiniz…");
    alanEl.disabled = false;
  }
}

// =======================================================
// LOGIN / STORAGE
// =======================================================
function saveUser(user){
  const data = {...user, exp: Date.now()+8*60*60*1000};
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
function loadUser(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return null;
    const u = JSON.parse(raw);
    if(Date.now() > u.exp){
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return u;
  }catch{
    return null;
  }
}

async function handleLogin(e){
  e.preventDefault();
  loginMessage.textContent="Giriş yapılıyor…";
  loginMessage.className="text-center text-blue-300 text-sm";

  try {
    const user = await loginUser(loginUsername.value.trim(), loginPassword.value);
    if(!user){ showLogin("Kullanıcı adı veya şifre hatalı."); return; }

    currentUser = user;
    saveUser(user);
    updateUserUI(user);
    showApp();
    setSiparisiAlan(user);
    await initApp();

  } catch {
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
    sehirEl.innerHTML += `<option value="${c.id}">${c.name}</option>`;
  });
}

async function loadDistrictsUI(cityId){
  ilceEl.disabled = true;
  ilceEl.innerHTML = `<option value="">Yükleniyor…</option>`;

  const d = await getDistricts(cityId);
  ilceEl.innerHTML = `<option value="">İlçe seçiniz…</option>`;

  d.forEach(x=>{
    ilceEl.innerHTML += `<option value="${x.id}|${x.code}|${x.name}">${x.name}</option>`;
  });

  ilceEl.disabled = false;
}

// =======================================================
// ÜRÜNLER
// =======================================================
async function loadUrunlerUI(){
  const firma = firmaEl.value;
  if(!firma) return;

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
      <span>${kg} kg — <b>${fiyat} TL</b></span>
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
  digerSelect.innerHTML = "";

  digerUrunler.forEach(u=>{
    digerSelect.innerHTML += `
      <option value="${u.id}">
        ${u.ad} — ${u.fiyat_10} TL (10 kg)
      </option>
    `;
  });

  updateDigerKgOptions();
}

function updateDigerKgOptions(){
  const id = Number(digerSelect.value);
  const u = digerUrunler.find(x=>x.id===id);
  if(!u){ digerKgOptions.innerHTML=""; return; }

  digerKgOptions.innerHTML = `
    <label class="flex items-center gap-2">
      <input type="radio" name="digerKg" value="10|${u.fiyat_10}" checked>
      10 kg — ${u.fiyat_10} TL
    </label>
    <label class="flex items-center gap-2">
      <input type="radio" name="digerKg" value="5|${u.fiyat_5}">
      5 kg — ${u.fiyat_5} TL
    </label>
  `;
}

digerSelect.onchange = updateDigerKgOptions;

// =======================================================
// DİĞER ÜRÜN EKLEME
// =======================================================
digerEkleBtn.onclick = (e)=>{
  e.preventDefault();
  const id = Number(digerSelect.value);
  const u = digerUrunler.find(x=>x.id===id);
  if(!u) return;

  const kgRadio = document.querySelector('input[name="digerKg"]:checked');
  if(!kgRadio) return;

  const [kg,fiyat] = kgRadio.value.split("|").map(Number);
  const adet = Number(digerAdet.value || 1);

  digerSecimler.push({
    id: u.id,
    ad: u.ad,
    kg,
    adet,
    fiyat,
    toplam: fiyat * adet
  });

  renderDigerListe();
  autoRecalc();
};

function renderDigerListe(){
  digerListeContainer.innerHTML = "";
  digerSecimler.forEach((x,i)=>{
    digerListeContainer.innerHTML += `
      <div class="diger-item">
        <div>${x.ad}</div>
        <div>${x.kg} kg</div>
        <div>x${x.adet}</div>
        <div>${x.toplam} TL</div>
        <button class="remove-btn" data-index="${i}">Sil</button>
      </div>
    `;
  });

  document.querySelectorAll(".remove-btn").forEach(b=>{
    b.onclick = ()=>{
      const i = Number(b.dataset.index);
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

    const adetEl=document.querySelector(
      `.kg-adet[data-id="${id}"][data-kg="${kg}"]`
    );
    const adet = Number(adetEl.value || 1);

    const u = cokSatanUrunler.find(x=>x.id==id);
    const fiyat = kg === 10 ? u.fiyat_10 : u.fiyat_5;

    total += fiyat * adet;
  });

  digerSecimler.forEach(x=> total += x.toplam);

  return total;
}

function autoRecalc(){
  if(autoCalcLocked) return;
  toplamEl.value = hesaplaToplam();
  toplamHint.textContent = "Otomatik hesaplandı.";
}

// =======================================================
// ÜCRETSİZ / DEĞİŞİM
// =======================================================
btnUcretsiz.onclick = ()=>{
  manualFreeMode = !manualFreeMode;

  if(manualFreeMode){
    toplamEl.value = 0;
    odemeEl.disabled = true;
    autoCalcLocked = true;
    btnUcretsiz.textContent = "Ücretli Yap";
  } else {
    odemeEl.disabled = false;
    autoCalcLocked = false;
    btnUcretsiz.textContent = "Ücretsiz / Değişim";
    autoRecalc();
  }
};

// =======================================================
// TELEFON LOOKUP
// =======================================================
async function handleTelLookup(){
  let raw = telEl.value.replace(/\D/g,"").slice(0,10);
  telEl.value = raw;

  if(raw.length !== 10){
    musteriHint.textContent = "";
    return;
  }

  if(raw === lastQueried) return;
  lastQueried = raw;

  musteriHint.textContent = "Müşteri sorgulanıyor…";

  try{
    const m = await findMusteriByTel(raw);
    if(!m){
      musteriHint.textContent="Bu numara kayıtlı değil.";
      return;
    }

    adEl.value = m.ad_soyad || "";
    adresEl.value = m.adres || "";

    if(m.firma){
      firmaEl.value = m.firma;
      await loadUrunlerUI();
    }

    if(m.sehir){
      const cityOpt = [...sehirEl.options]
        .find(o=>o.textContent===m.sehir);
      if(cityOpt){
        sehirEl.value = cityOpt.value;
        await loadDistrictsUI(cityOpt.value);

        const ilOpt = [...ilceEl.options]
          .find(o=>o.textContent===m.ilce);
        if(ilOpt) ilceEl.value = ilOpt.value;
      }
    }

    musteriHint.textContent="Müşteri bilgileri yüklendi.";

  }catch{
    musteriHint.textContent="Sorgu hatası.";
  }
}
telEl.addEventListener("input", handleTelLookup);

// =======================================================
// SİPARİŞ FORMU SUBMIT
// =======================================================
$("form").onsubmit = async (e)=>{
  e.preventDefault();

  // **********************
  // YENİ ÖZELLİK: ÜRÜN ZORUNLU
  // **********************
  const seciliUrunSayisi =
    document.querySelectorAll(".kg-check:checked").length +
    digerSecimler.length;

  if(seciliUrunSayisi === 0){
    showPopup("Lütfen en az 1 ürün seçin.", "error");
    return;
  }

  sonucEl.textContent="Gönderiliyor…";

  const siparisNo = siparisNoEl.value.trim() || null;
  const sehirAd = sehirEl.options[sehirEl.selectedIndex]?.textContent || "";
  const sehirKodu = sehirEl.value || null;
  const ilceAd = ilceEl.value ? ilceEl.value.split("|")[2] : "";
  const ilceKodu = ilceEl.value ? ilceEl.value.split("|")[1] : null;

  const secilen=[];

  // Çok satan ürünler
  document.querySelectorAll(".kg-check:checked").forEach(chk=>{
    const id = chk.dataset.id;
    const kg = Number(chk.dataset.kg);

    const adetEl = document.querySelector(
      `.kg-adet[data-id="${id}"][data-kg="${kg}"]`
    );
    const adet = Number(adetEl.value || 1);

    const u = cokSatanUrunler.find(x=>x.id==id);
    const fiyat = kg===10 ? u.fiyat_10 : u.fiyat_5;

    secilen.push({
      id: u.id,
      ad: u.ad,
      kg,
      kargo_kg: kg===10 ? u.kargo_kg_10 : u.kargo_kg_5,
      fiyat: manualFreeMode ? 0 : fiyat,
      adet,
      kargo_adet: adet, // ******** YENİ ********
      toplam: manualFreeMode ? 0 : fiyat * adet
    });
  });

  // Diğer ürünler
  digerSecimler.forEach(x=>{
    const u = digerUrunler.find(item=>item.id===x.id);

    secilen.push({
      id: x.id,
      ad: x.ad,
      kg: x.kg,
      kargo_kg: x.kg===10 ? u.kargo_kg_10 : u.kargo_kg_5,
      fiyat: manualFreeMode ? 0 : x.fiyat,
      adet: x.adet,
      kargo_adet: x.adet, // ******** YENİ ********
      toplam: manualFreeMode ? 0 : x.toplam
    });
  });

  const urunBilgisiMetni = secilen
    .map(u=>`${u.ad} ${u.kg} kg ${u.adet} adet`)
    .join("\n");

  const kayit={
    siparis_no: siparisNo,
    musteri_tel: telEl.value,
    musteri_ad_soyad: adEl.value,
    musteri_adres: adresEl.value,
    sehir: sehirAd,
    ilce: ilceAd,
    sehir_kodu: sehirKodu,
    ilce_kodu: ilceKodu,
    firma: firmaEl.value,
    siparis_alan: alanEl.value,
    urun_bilgisi: urunBilgisiMetni,
    secilen_urunler: JSON.stringify(secilen),
    toplam_tutar: manualFreeMode ? 0 : Number(toplamEl.value),
    odeme_turu: manualFreeMode ? null : odemeEl.value,
    notlar: notlarEl.value,
    musteri_notu: musteriNotuEl.value || ""
  };

  try {
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
// SİPARİŞLERİM EKRANI
// =======================================================
siparislerimBtn.onclick = async () => {
  appContainer.classList.add("hidden");
  siparislerimScreen.classList.remove("hidden");

  const rows = await getUserOrders(currentUser.username);
  renderSiparisList(rows);
};

filtreBtn.onclick = async () => {
  const t1 = filtreTarih1.value || null;
  const t2 = filtreTarih2.value || null;
  const firma = filtreFirma.value || null;

  const rows = await getUserOrders(currentUser.username, t1, t2, firma);
  renderSiparisList(rows);
};

function renderSiparisList(rows){
  siparisListe.innerHTML = "";

  if(!rows.length){
    siparisListe.innerHTML = "<div class='text-sm'>Kayıt bulunamadı</div>";
    return;
  }

  rows.forEach(r=>{
    const box=document.createElement("div");
    box.className="product-box";

    box.innerHTML = `
      <div class="text-lg font-bold">#${r.siparis_no}</div>
      <div>${r.musteri_ad_soyad}</div>
      <div>${r.firma}</div>
      <div class="text-sm text-slate-300">${r.created_at}</div>
      <div class="mt-2"><b>Kargo Kodu:</b> ${r.kargo_kodu || "-"}</div>
    `;

    siparisListe.appendChild(box);
  });
}

// =======================================================
// İPTAL
// =======================================================
btnIptal.onclick = async ()=>{
  const no = siparisNoEl.value.trim();
  if(!no){
    showPopup("Önce sipariş no gir.","error");
    return;
  }

  const neden = prompt("İptal nedeni:");
  if(neden===null) return;

  await sendCancelToN8N(no, neden, currentUser.username);
  showPopup("İptal bilgisi gönderildi.","ok");
};

// =======================================================
// INIT
// =======================================================
async function initApp(){
  if(appInitialized) return;
  appInitialized = true;

  fillSelect(firmaEl, ["Tasdipli","Esin","Queen"], "Firma seçiniz…");
  fillSelect(filtreFirma, ["Tasdipli","Esin","Queen"], "Firma seçiniz…");

  await loadCities();
  setSiparisiAlan(currentUser);

  ilceEl.disabled = true;
  ilceEl.innerHTML = `<option value="">Önce şehir seçiniz…</option>`;
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

// AUTO LOGIN
(function(){
  const saved = loadUser();
  if(saved){
    currentUser=saved;
    updateUserUI(saved);
    showApp();
    setSiparisiAlan(saved);
    initApp();
  } else {
    showLogin();
  }
})();
