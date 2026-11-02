// ---------- Date (salvate în browser, fără server) ----------
const LS = { produse: "ab_produse", comenzi: "ab_comenzi" };
const $ = (s) => document.querySelector(s);
const citeste = (k, def) => { try { return JSON.parse(localStorage.getItem(k)) || def; } catch { return def; } };
const salveaza = () => {
    try {
        localStorage.setItem(LS.produse, JSON.stringify(produse));
        localStorage.setItem(LS.comenzi, JSON.stringify(comenzi));
    } catch { alert("Memoria browserului este plină. Folosește fotografii mai mici."); }
};

// Imagine de rezervă (cămașă desenată simplu) în culori de bej/maro
function placeholder(culoare) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400">
    <rect width="300" height="400" fill="#e8dcc8"/>
    <path d="M95 90 L125 75 Q150 100 175 75 L205 90 L245 135 L215 160 L200 145 V320 H100 V145 L85 160 L55 135 Z" fill="${culoare}"/>
  </svg>`;
    return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

let produse = citeste(LS.produse, null) || [
    { id: 1, nume: "Cămașă din in", categorie: "Cămăși", pret: 289, stoc: 12, img: placeholder("#f6f0e6") },
    { id: 2, nume: "Rochie midi", categorie: "Rochii", pret: 459, stoc: 6, img: placeholder("#8b6b4a") },
    { id: 3, nume: "Pantaloni drepți", categorie: "Pantaloni", pret: 329, stoc: 3, img: placeholder("#cdb89a") },
    { id: 4, nume: "Pulover tricotat", categorie: "Pulovere", pret: 369, stoc: 9, img: placeholder("#4a3426") },
    { id: 5, nume: "Cămașă în dungi", categorie: "Cămăși", pret: 259, stoc: 0, img: placeholder("#d9c7a8") },
    { id: 6, nume: "Rochie de seară", categorie: "Rochii", pret: 599, stoc: 4, img: placeholder("#6b4f38") },
];
let comenzi = citeste(LS.comenzi, []);
let albumCurent = "Toate";
let lbLista = [], lbIndex = 0;

const lei = (n) => n.toFixed(2).replace(/\.00$/, "") + " lei";
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ---------- Navigare ----------
document.querySelectorAll("#tabs button").forEach((b) => {
    b.onclick = () => {
        document.querySelectorAll("#tabs button, .panel").forEach((e) => e.classList.remove("active"));
        b.classList.add("active");
        $("#" + b.dataset.tab).classList.add("active");
    };
});

// ---------- Galerie / albume ----------
function deseneazaGalerie() {
    const albume = ["Toate", ...new Set(produse.map((p) => p.categorie))];
    if (!albume.includes(albumCurent)) albumCurent = "Toate";
    $("#albume").innerHTML = albume
        .map((a) => `<button class="chip ${a === albumCurent ? "active" : ""}" data-a="${esc(a)}">${esc(a)}</button>`)
        .join("");
    document.querySelectorAll(".chip").forEach((c) => (c.onclick = () => { albumCurent = c.dataset.a; deseneazaGalerie(); }));

    lbLista = produse.filter((p) => albumCurent === "Toate" || p.categorie === albumCurent);
    $("#grid").innerHTML = lbLista.length
        ? lbLista.map((p, i) => `
        <div class="card" data-i="${i}">
          <img src="${p.img}" alt="${esc(p.nume)}" loading="lazy">
          <div class="info"><span>${esc(p.nume)}</span><span>${lei(p.pret)}</span></div>
          <small class="${p.stoc === 0 ? "epuizat" : ""}">${p.stoc === 0 ? "Epuizat" : p.stoc + " în stoc"}</small>
        </div>`).join("")
        : `<p class="empty">Albumul este gol. Adaugă produse din tab-ul Inventar.</p>`;
    document.querySelectorAll(".card").forEach((c) => (c.onclick = () => deschideLb(+c.dataset.i)));
}

function deschideLb(i) {
    lbIndex = (i + lbList().length) % lbList().length;
    const p = lbList()[lbIndex];
    $("#lbImg").src = p.img;
    $("#lbImg").alt = p.nume;
    $("#lbCap").textContent = `${p.nume} – ${lei(p.pret)} (${lbIndex + 1}/${lbList().length})`;
    $("#lightbox").hidden = false;
}
const lbList = () => lbLista;
$("#prev").onclick = () => deschideLb(lbIndex - 1);
$("#next").onclick = () => deschideLb(lbIndex + 1);
$("#close").onclick = () => ($("#lightbox").hidden = true);
document.addEventListener("keydown", (e) => {
    if ($("#lightbox").hidden) return;
    if (e.key === "Escape") $("#lightbox").hidden = true;
    if (e.key === "ArrowLeft") deschideLb(lbIndex - 1);
    if (e.key === "ArrowRight") deschideLb(lbIndex + 1);
});

// ---------- Inventar ----------
// Micșorează fotografia încărcată, ca să încapă în memoria browserului
function citesteFoto(fisier) {
    return new Promise((ok) => {
        if (!fisier) return ok(null);
        const img = new Image();
        img.onload = () => {
            const s = Math.min(1, 600 / img.width);
            const c = document.createElement("canvas");
            c.width = img.width * s; c.height = img.height * s;
            c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
            ok(c.toDataURL("image/jpeg", 0.8));
        };
        img.src = URL.createObjectURL(fisier);
    });
}

$("#formProdus").onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const foto = await citesteFoto(f.get("foto"));
    produse.push({
        id: Date.now(),
        nume: f.get("nume").trim(),
        categorie: f.get("categorie").trim(),
        pret: +f.get("pret"),
        stoc: +f.get("stoc"),
        img: foto || placeholder("#cdb89a"),
    });
    e.target.reset();
    actualizeaza();
};

function deseneazaInventar() {
    $("#tabelProduse").innerHTML =
        `<tr><th></th><th>Produs</th><th>Album</th><th>Preț</th><th>Stoc</th><th></th></tr>` +
        produse.map((p) => `
      <tr>
        <td><img src="${p.img}" alt=""></td>
        <td>${esc(p.nume)}</td>
        <td>${esc(p.categorie)}</td>
        <td>${lei(p.pret)}</td>
        <td><input type="number" min="0" value="${p.stoc}" data-stoc="${p.id}" class="${p.stoc <= 3 ? "low" : ""}"></td>
        <td><button class="link" data-sterge="${p.id}">Șterge</button></td>
      </tr>`).join("");
    document.querySelectorAll("[data-stoc]").forEach((i) => (i.onchange = () => {
        produse.find((p) => p.id == i.dataset.stoc).stoc = Math.max(0, +i.value);
        actualizeaza();
    }));
    document.querySelectorAll("[data-sterge]").forEach((b) => (b.onclick = () => {
        if (confirm("Ștergi produsul?")) {
            produse = produse.filter((p) => p.id != b.dataset.sterge);
            actualizeaza();
        }
    }));
}

// ---------- Comenzi ----------
const STARI = ["Nouă", "Livrată", "Anulată"];

$("#formComanda").onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const p = produse.find((x) => x.id == f.get("produs"));
    const cant = +f.get("cantitate");
    if (!p || cant > p.stoc) return alert(`Stoc insuficient (disponibil: ${p ? p.stoc : 0}).`);
    p.stoc -= cant;
    comenzi.push({
        id: Date.now(), client: f.get("client").trim(), produsId: p.id, produs: p.nume,
        cantitate: cant, total: cant * p.pret, stare: "Nouă", data: new Date().toLocaleDateString("ro-RO"),
    });
    e.target.reset();
    e.target.cantitate.value = 1;
    actualizeaza();
};

function deseneazaComenzi() {
    $("#formComanda select").innerHTML = produse
        .filter((p) => p.stoc > 0)
        .map((p) => `<option value="${p.id}">${esc(p.nume)} – ${lei(p.pret)} (${p.stoc} buc.)</option>`).join("");

    $("#tabelComenzi").innerHTML =
        `<tr><th>Data</th><th>Client</th><th>Produs</th><th>Cant.</th><th>Total</th><th>Stare</th></tr>` +
        (comenzi.length ? comenzi.slice().reverse().map((c) => `
      <tr>
        <td>${c.data}</td><td>${esc(c.client)}</td><td>${esc(c.produs)}</td>
        <td>${c.cantitate}</td><td>${lei(c.total)}</td>
        <td><select data-stare="${c.id}">${STARI.map((s) => `<option ${s === c.stare ? "selected" : ""}>${s}</option>`).join("")}</select></td>
      </tr>`).join("") : `<tr><td colspan="6" class="empty">Nicio comandă încă.</td></tr>`);

    document.querySelectorAll("[data-stare]").forEach((s) => (s.onchange = () => {
        const c = comenzi.find((x) => x.id == s.dataset.stare);
        const p = produse.find((x) => x.id == c.produsId);
        // anulare = produsele revin în stoc; reactivare = se scad din nou
        if (s.value === "Anulată" && c.stare !== "Anulată" && p) p.stoc += c.cantitate;
        if (c.stare === "Anulată" && s.value !== "Anulată" && p) p.stoc = Math.max(0, p.stoc - c.cantitate);
        c.stare = s.value;
        actualizeaza();
    }));
}

// ---------- Rapoarte ----------
function randuriRaport() {
    const valide = comenzi.filter((c) => c.stare !== "Anulată");
    return produse.map((p) => {
        const v = valide.filter((c) => c.produsId === p.id);
        return { nume: p.nume, vandute: v.reduce((s, c) => s + c.cantitate, 0), venit: v.reduce((s, c) => s + c.total, 0), stoc: p.stoc };
    }).sort((a, b) => b.venit - a.venit);
}

function deseneazaRapoarte() {
    const r = randuriRaport();
    const venit = r.reduce((s, x) => s + x.venit, 0);
    const buc = r.reduce((s, x) => s + x.vandute, 0);
    const valoareStoc = produse.reduce((s, p) => s + p.stoc * p.pret, 0);
    const putine = produse.filter((p) => p.stoc <= 3).length;
    $("#cifre").innerHTML = [
        ["Venit total", lei(venit)], ["Bucăți vândute", buc],
        ["Valoare stoc", lei(valoareStoc)], ["Stoc redus (≤ 3)", putine],
    ].map(([t, v]) => `<div class="stat"><b>${v}</b>${t}</div>`).join("");
    $("#tabelRaport").innerHTML =
        `<tr><th>Produs</th><th>Vândute</th><th>Venit</th><th>Stoc rămas</th></tr>` +
        r.map((x) => `<tr><td>${esc(x.nume)}</td><td>${x.vandute}</td><td>${lei(x.venit)}</td><td class="${x.stoc <= 3 ? "low" : ""}">${x.stoc}</td></tr>`).join("");
}

$("#btnCsv").onclick = () => {
    const linii = ["Produs;Vandute;Venit;Stoc", ...randuriRaport().map((x) => `${x.nume};${x.vandute};${x.venit};${x.stoc}`)];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + linii.join("\n")], { type: "text/csv" }));
    a.download = "raport-vanzari.csv";
    a.click();
};

// ---------- Pornire ----------
function actualizeaza() {
    salveaza();
    deseneazaGalerie();
    deseneazaInventar();
    deseneazaComenzi();
    deseneazaRapoarte();
}
actualizeaza();
