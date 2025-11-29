// ===== Supabase REST ayarları =====
const SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "YOUR-ANON-KEY";
const SB_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};

// Genel fetch
async function sbFetch(tableOrView, { query = "", select = "" } = {}) {
  const q = [];
  if (query) q.push(query);
  if (select) q.push(`select=${encodeURIComponent(select)}`);
  const url = `${SUPABASE_URL}/rest/v1/${tableOrView}?${q.join("&")}`;
  const r = await fetch(url, { headers: SB_HEADERS });
  if (!r.ok) throw new Error("Supabase error");
  return r.json();
}

// ===== Auth (plaintext) =====
async function loginUser(username, password) {
  const rows = await sbFetch("users", {
    query: `username=eq.${encodeURIComponent(username)}&password=eq.${encodeURIComponent(password)}&select=*`,
  });
  if (!rows.length) return null;
  const u = rows[0];
  return { id: u.id, username: u.username, admin: !!u.admin };
}

// ===== Şehir / İlçe =====
async function getCities() {
  return sbFetch("sehir", { query: "select=id,name&order=name.asc" });
}
async function getDistricts(cityId) {
  return sbFetch("ilce", {
    query: `city_id=eq.${cityId}&select=id,code,name&order=name.asc`,
  });
}

// ===== Ürünler (firma bazlı) =====
async function getUrunler(firma) {
  return sbFetch("urunler", {
    query: `firma=eq.${encodeURIComponent(firma)}&aktif=is.true&select=id,ad,fiyat_10,fiyat_5,cok_satan&order=ad.asc`,
  });
}

// ===== Müşteri bul (telefon) =====
async function findMusteriByTel(tel10) {
  const rows = await sbFetch("musteriler", {
    query: `musteri_tel=eq.${encodeURIComponent(tel10)}&select=*`,
  });
  return rows[0] || null;
}

// ===== Sipariş INSERT/UPDATE (N8N karar verir) =====
async function insertFormSiparis(payload) {
  // Burada direkt Supabase'e kayıt da atabilirsin (opsiyonel)
  // ama senin akışında N8N karar veriyor, o yüzden webhook:
  const url = "https://n8n.ozkanceylan.uk/webhook/form_siparis";
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error("N8N gönderim hatası");
  return r.json().catch(() => ({}));
}

// ===== Sipariş İptal =====
async function sendCancelToN8N(siparis_no, neden, iptal_eden) {
  const url = "https://n8n.ozkanceylan.uk/webhook/form_siparis_iptal";
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ siparis_no, neden, iptal_eden }),
  });
}
