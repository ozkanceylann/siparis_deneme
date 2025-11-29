// =======================================================
// SHORTCUT
// =======================================================
const $ = (id) => document.getElementById(id);

// =======================================================
// ELEMENTS
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
  digerContainer = $("digerContainer"),
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

// =======================================================
// GLOBALS
// =======================================================
let cokSatanUrunler = [];
let digerUrunler = [];

let digerSecimler = []; // diğer ürünler listesi
let selectedKgRadio = null;

let manualFreeMode = false;
let autoCalcLocked = false;
let currentUser = null;
let appInitialized = false;

const STORAGE_KEY = "siparisUser";

const SIPARISI_ALAN_LISTESI = [
  "Seda",
  "Betül",
  "İbrahim",
  "Ceylan",
  "Özkan",
  "Cennet",
];

// =======================================================
// LOGIN UI
// =======================================================
function showApp() {
  loginScreen.classList.add("hidden");
  appContainer.classList.remove("hidden");
}

function showLogin(msg = "") {
  loginScreen.classList.remove("hidden");
  appContainer.classList.add("hidden");
  loginMessage.textContent = msg;
  loginMessage.className = "text-sm text-center text-red-400";
}

function updateUserUI(user) {
  currentUserEl.textContent = user.username;
  adminBadge.classList.toggle("hidden", !user.admin);
}

// =======================================================
// LOCAL STORAGE LOGIN
// =======================================================
function saveUser(user) {
  const data = { ...user, exp: Date.now() + 8 * 60 * 60 * 1000 };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
function loadUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const u = JSON.parse(raw);
    if (Date.now() > u.exp) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return u;
  } catch {
    return null;
  }
}

// =======================================================
// HANDLE LOGIN
// =======================================================
async function handleLogin(e) {
  e.preventDefault();

  loginMessage.textContent = "Giriş yapılıyor…";
  loginMessage.className = "text-center text-blue-300 text-sm";

  try {
    const user = await loginUser(
      loginUsername.value.trim(),
      loginPassword.value
    );

    if (!user) {
      showLogin("Kullanıcı adı ya da şifre hatalı.");
      return;
    }

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
// Siparişi Alan Ayarla
// =======================================================
function setSiparisiAlan(user) {
  if (!user.admin) {
    fillSelect(alanEl, [user.username], "");
    alanEl.disabled = true;
  } else {
    fillSelect(alanEl, SIPARISI_ALAN_LISTESI, "Seçiniz…");
    alanEl.disabled = false;
  }
}

// =======================================================
// FILL SELECT
// =======================================================
function fillSelect(el, arr, placeholder = "Seçiniz…") {
  el.innerHTML = `<option value="">${placeholder}</option>`;
  arr.forEach((v) => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    el.appendChild(opt);
  });
}

// =======================================================
// ŞEHİR / İLÇE
// =======================================================
async function loadCities() {
  const cities = await getCities();

  sehirEl.innerHTML = `<option value="">Şehir seçiniz…</option>`;
  cities.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    sehirEl.appendChild(opt);
  });
}

async function loadDistrictsUI(cityId) {
  ilceEl.disabled = true;
  ilceEl.innerHTML = `<option value="">Yükleniyor…</option>`;

  const d = await getDistricts(cityId);

  ilceEl.innerHTML = `<option value="">İlçe seçiniz…</option>`;
  d.forEach((x) => {
    const o = document.createElement("option");
    o.value = `${x.id}|${x.code}|${x.name}`;
    o.textContent = x.name;
    ilceEl.appendChild(o);
  });

  ilceEl.disabled = false;
}

// =======================================================
// ÜRÜNLERİ ÇEK – ÇOK SATAN + DİĞER
// =======================================================
async function loadUrunlerUI() {
  const firma = firmaEl.value;
  if (!firma) return;

  const items = await getUrunler(firma);

  cokSatanUrunler = items.filter((u) => u.cok_satan);
  digerUrunler = items.filter((u) => !u.cok_satan);

  renderCokSatan();
  renderDigerDropdown();
  autoRecalc();
}

// =======================================================
// ÇOK SATAN ÜRÜNLER
// =======================================================
function renderCokSatan() {
  cokSatanContainer.innerHTML = "";

  cokSatanUrunler.forEach((u) => {
    const box = document.createElement("div");
    box.className = "product-box";

    box.innerHTML = `
      <div class="product-title">${u.ad}</div>
    `;

    box.appendChild(renderKgRow(u, 10, u.fiyat_10));
    box.appendChild(renderKgRow(u, 5, u.fiyat_5));

    cokSatanContainer.appendChild(box);
  });
}

function renderKgRow(u, kg, fiyat) {
  const line = document.createElement("div");
  line.className = "product-line";

  line.innerHTML = `
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

// =======================================================
// DİĞER ÜRÜNLER – DROPDOWN + RADIO KG + ADET + EKLE
// =======================================================
function renderDigerDropdown() {
  digerSelect.innerHTML = "";

  digerUrunler.forEach((u) => {
    const opt = document.createElement("option");
    opt.value = u.id;
    opt.textContent = u.ad;
    digerSelect.appendChild(opt);
  });

  updateDigerKgOptions();
}

function updateDigerKgOptions() {
  const id = Number(digerSelect.value);
  const u = digerUrunler.find((x) => x.id === id);
  if (!u) return;

  digerKgOptions.innerHTML = `
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

digerSelect.onchange = updateDigerKgOptions;

// =======================================================
// EKLE BUTONU
// =======================================================
digerEkleBtn.onclick = () => {
  const id = Number(digerSelect.value);
  const u = digerUrunler.find((x) => x.id === id);
  if (!u) return;

  const kgRadio = document.querySelector('input[name="digerKg"]:checked');
  if (!kgRadio) return;

  const [kg, fiyat] = kgRadio.value.split("|").map(Number);
  const adet = Number(digerAdet.value || 1);

  digerSecimler.push({
    id: u.id,
    ad: u.ad,
    kg,
    adet,
    fiyat,
    toplam: fiyat * adet,
  });

  renderDigerListe();
  autoRecalc();
};

// =======================================================
// DİĞER ÜRÜNLER LİSTESİ
// =======================================================
function renderDigerListe() {
  digerListeContainer.innerHTML = "";

  digerSecimler.forEach((x, i) => {
    const row = document.createElement("div");
    row.className = "diger-item";

    row.innerHTML = `
      <div>${x.ad}</div>
      <div>${x.kg} kg</div>
      <div>x${x.adet}</div>
      <div>${x.toplam} TL</div>
      <div class="remove-btn" data-index="${i}">Sil</div>
    `;

    digerListeContainer.appendChild(row);
  });

  // Sil butonu
  document.querySelectorAll(".remove-btn").forEach((b) => {
    b.onclick = () => {
      const i = Number(b.dataset.index);
      digerSecimler.splice(i, 1);
      renderDigerListe();
      autoRecalc();
    };
  });
}

// =======================================================
// TOPLAM HESABI
// =======================================================
function hesaplaToplam() {
  if (manualFreeMode) return 0;

  let total = 0;

  // Çok satan ürünler
  document.querySelectorAll(".kg-check:checked").forEach((chk) => {
    const id = chk.dataset.id;
    const kg = Number(chk.dataset.kg);

    const adetEl = document.querySelector(
      `.kg-adet[data-id="${id}"][data-kg="${kg}"]`
    );
    const adet = Number(adetEl.value || 1);

    const u = [...cokSatanUrunler].find((x) => x.id == id);
    if (!u) return;

    const fiyat = kg === 10 ? u.fiyat_10 : u.fiyat_5;
    total += fiyat * adet;
  });

  // Diğer ürünler
  digerSecimler.forEach((x) => {
    total += x.toplam;
  });

  return total;
}

function autoRecalc() {
  if (autoCalcLocked) return;
  toplamEl.value = hesaplaToplam();
  toplamHint.textContent = "Otomatik hesaplandı.";
}

// =======================================================
// ÜCRETSİZ – DEĞİŞİM
// =======================================================
btnUcretsiz.onclick = () => {
  manualFreeMode = !manualFreeMode;

  if (manualFreeMode) {
    toplamEl.value = 0;
    odemeEl.disabled = true;
    btnUcretsiz.textContent = "Ücretli Yap";
  } else {
    odemeEl.disabled = false;
    btnUcretsiz.textContent = "Ücretsiz / Değişim";
    autoRecalc();
  }
};

// =======================================================
// FORM SUBMIT
// =======================================================
$("form").onsubmit = async (e) => {
  e.preventDefault();
  sonucEl.textContent = "Gönderiliyor…";

  const siparisNo = siparisNoEl.value.trim() || null;

  const sehirAd =
    sehirEl.options[sehirEl.selectedIndex]?.textContent || "";
  const ilceAd = ilceEl.value ? ilceEl.value.split("|")[2] : "";

  const secilen = [];

  // Çok satan ürünler
  document.querySelectorAll(".kg-check:checked").forEach((chk) => {
    const id = chk.dataset.id;
    const kg = Number(chk.dataset.kg);

    const adetEl = document.querySelector(
      `.kg-adet[data-id="${id}"][data-kg="${kg}"]`
    );
    const adet = Number(adetEl.value || 1);

    const u = [...cokSatanUrunler].find((x) => x.id == id);
    const fiyat = kg === 10 ? u.fiyat_10 : u.fiyat_5;

    secilen.push({
      id: u.id,
      ad: u.ad,
      kg,
      fiyat: manualFreeMode ? 0 : fiyat,
      adet,
      toplam: manualFreeMode ? 0 : fiyat * adet,
    });
  });

  // Diğer ürünler
  digerSecimler.forEach((x) => {
    secilen.push({
      id: x.id,
      ad: x.ad,
      kg: x.kg,
      fiyat: manualFreeMode ? 0 : x.fiyat,
      adet: x.adet,
      toplam: manualFreeMode ? 0 : x.toplam,
    });
  });

  const kayit = {
    siparis_no: siparisNo,
    musteri_tel: telEl.value,
    musteri_ad_soyad: adEl.value,
    musteri_adres: adresEl.value,
    sehir: sehirAd,
    ilce: ilceAd,
    firma: firmaEl.value,
    siparis_alan: alanEl.value,
    secilen_urunler: JSON.stringify(secilen),
    toplam_tutar: manualFreeMode ? 0 : Number(toplamEl.value),
    odeme_turu: manualFreeMode ? null : odemeEl.value,
    notlar: notlarEl.value,
  };

  try {
    await insertFormSiparis(kayit);

    sonucEl.className = "text-sm text-emerald-400";
    sonucEl.textContent = "Gönderildi (N8N işliyor).";

    autoCalcLocked = false;
  } catch {
    sonucEl.className = "text-sm text-red-400";
    sonucEl.textContent = "Gönderim hatası.";
  }
};

// =======================================================
// SİPARİŞ NO ENTER
// =======================================================
siparisNoEl.onblur = loadSiparisByNo;

siparisNoEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    loadSiparisByNo();
  }
});

// =======================================================
// SİPARİŞ NO → SİPARİŞ YÜKLEME
// =======================================================
async function loadSiparisByNo() {
  const no = siparisNoEl.value.trim();
  if (!no) return;

  try {
    const rows = await sbFetch("tum_siparisler", {
      query: `siparis_no=eq.${no}&select=*`,
    });

    if (!rows.length) {
      alert("Sipariş bulunamadı.");
      return;
    }

    const d = rows[0];

    if (!currentUser.admin && d.siparis_alan !== currentUser.username) {
      alert("Bu sipariş size ait değildir.");
      return;
    }

    telEl.value = d.musteri_tel || "";
    adEl.value = d.ad_soyad || "";
    adresEl.value = d.adres || "";
    toplamEl.value = d.toplam_tutar || "";
    odemeEl.value = d.odeme_turu || "Nakit";
    notlarEl.value = d.notlar || "";
  } catch {
    alert("Sipariş alınamadı.");
  }
}

// =======================================================
// SİPARİŞ İPTAL
// =======================================================
btnIptal.onclick = async () => {
  const no = siparisNoEl.value.trim();
  if (!no) return alert("Önce sipariş no gir.");

  const neden = prompt("İptal nedeni:");
  if (neden === null) return;

  await sendCancelToN8N(no, neden, currentUser.username);
  alert("İptal bilgisi gönderildi.");
};

// =======================================================
// INIT
// =======================================================
async function initApp() {
  if (appInitialized) return;
  appInitialized = true;

  fillSelect(firmaEl, ["Tasdipli", "Esin", "Queen"], "Firma seçiniz…");
  setSiparisiAlan(currentUser);
  await loadCities();
}

// =======================================================
// EVENTS
// =======================================================
loginForm.onsubmit = handleLogin;

logoutBtn.onclick = () => {
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
};

sehirEl.onchange = (e) => {
  if (!e.target.value) {
    ilceEl.disabled = true;
    ilceEl.innerHTML = `<option value="">Önce şehir seçiniz…</option>`;
    return;
  }
  loadDistrictsUI(e.target.value);
};

document.addEventListener("input", (e) => {
  if (
    e.target.classList.contains("kg-check") ||
    e.target.classList.contains("kg-adet")
  ) {
    autoRecalc();
  }
});

toplamEl.oninput = () => {
  autoCalcLocked = true;
};

// =======================================================
// AUTO LOGIN
// =======================================================
(function () {
  const saved = loadUser();
  if (saved) {
    currentUser = saved;
    updateUserUI(saved);
    showApp();
    setSiparisiAlan(saved);
    initApp();
  } else {
    showLogin();
  }
})();
