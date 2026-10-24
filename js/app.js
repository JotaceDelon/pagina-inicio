"use strict";
const KEY = "mi-espacio-preferences-v2";
const NOTES_KEY = "mi-espacio-notes-v1";
const LEGACY_KEY = "mi-espacio-v1";
const $ = id => document.getElementById(id);
const engines = { brave: "https://search.brave.com/search?q=", google: "https://www.google.com/search?q=", duckduckgo: "https://duckduckgo.com/?q=" };
let state;
const normalize = value => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const allLinks = () => state.categorias.flatMap(c => c.enlaces);
const announce = message => { $("status").textContent = message; };
function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state.preferences)); return true; }
    catch { announce("No se han podido guardar las preferencias en este navegador."); return false; }
}
function validUrl(value) {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("Solo se permiten direcciones http o https.");
    return url.href;
}
function validate(data) {
    if (!data || !Array.isArray(data.categorias) || data.categorias.length > 100) throw new Error("El archivo no contiene categorías válidas.");
    let total = 0;
    const text = (value, max) => typeof value === "string" && value.trim() && value.length <= max;
    const categorias = data.categorias.map(c => {
        if (!text(c.nombre, 80) || !Array.isArray(c.enlaces)) throw new Error("Hay una categoría inválida.");
        return { nombre: c.nombre.trim(), icono: typeof c.icono === "string" ? c.icono.slice(0, 12) : "📁", enlaces: c.enlaces.map(l => {
            if (++total > 2000 || !text(l.nombre, 120)) throw new Error("Hay enlaces inválidos o demasiados enlaces.");
            return { nombre: l.nombre.trim(), url: validUrl(l.url), icono: typeof l.icono === "string" ? l.icono.slice(0, 12) : "" };
        }) };
    });
    const p = data.preferences || {};
    return { categorias, preferences: { theme: ["dark", "light", "auto"].includes(p.theme) ? p.theme : "dark", accent: ["violet", "blue", "mint", "rose"].includes(p.accent) ? p.accent : "violet", engine: Object.hasOwn(engines, p.engine) ? p.engine : "brave" } };
}
function applyPreferences() {
    const p = state.preferences;
    document.documentElement.dataset.theme = p.theme === "auto" ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark") : p.theme;
    document.documentElement.dataset.accent = p.accent;
    $("theme").value = p.theme; $("accent").value = p.accent; updateEnginePicker();
}
function updateEnginePicker() {
    for (const engine of Object.keys(engines)) {
        const selected = state.preferences.engine === engine;
        $("engine-" + engine).setAttribute("aria-checked", String(selected));
        $("engine-" + engine).tabIndex = selected ? 0 : -1;
    }
    const names = { brave: "Brave", google: "Google", duckduckgo: "DuckDuckGo" };
    $("web-search").placeholder = "Buscar con " + names[state.preferences.engine] + "…";
}
function initEnginePicker() {
    const choices = Object.keys(engines);
    choices.forEach((engine, index) => {
        const choose = () => { state.preferences.engine = engine; updateEnginePicker(); save(); };
        $("engine-" + engine).onclick = choose;
        $("engine-" + engine).onkeydown = event => {
            let next;
            if (["ArrowRight", "ArrowDown"].includes(event.key)) next = (index + 1) % choices.length;
            else if (["ArrowLeft", "ArrowUp"].includes(event.key)) next = (index + choices.length - 1) % choices.length;
            else if (event.key === "Home") next = 0;
            else if (event.key === "End") next = choices.length - 1;
            else return;
            event.preventDefault();
            $("engine-" + choices[next]).onclick();
            $("engine-" + choices[next]).focus();
        };
    });
}
function el(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
}
function linkNode(link) {
    const a = el("a", "link"); a.href = link.url;
    if (link.icono) a.append(el("span", "icon", link.icono));
    else {
        const img = el("img", "icon"); img.alt = ""; img.loading = "lazy";
        img.src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(new URL(link.url).hostname)}&sz=64`;
        img.onerror = () => img.replaceWith(el("span", "icon", "🔗")); a.append(img);
    }
    a.append(el("span", "link-name", link.nombre)); return a;
}
function render() {
    $("categories").replaceChildren();
    const query = normalize($("search").value.trim());
    let visible = 0;
    state.categorias.forEach(category => {
        const matching = category.enlaces.filter(link => normalize(`${category.nombre} ${link.nombre} ${link.url}`).includes(query));
        if (!matching.length) return;
        visible += matching.length;
        const section = el("section", "category"), header = el("div", "category-header");
        header.append(el("span", "", category.icono || "📁"), el("h2", "", category.nombre), el("span", "count", matching.length));
        const links = el("div", "links");
        matching.forEach(link => links.append(linkNode(link)));
        section.append(header, links);
        $("categories").append(section);
    });
    $("link-count").textContent = `${visible} ${visible === 1 ? "enlace" : "enlaces"}`;
    $("empty").hidden = visible > 0;
}
function initNotes() {
    const notes = $("quick-notes"), status = $("notes-status");
    try { notes.value = (localStorage.getItem(NOTES_KEY) || "").slice(0, 10000); }
    catch { status.textContent = "El almacenamiento no está disponible. Tus notas no se conservarán al cerrar."; }
    notes.oninput = () => {
        try {
            localStorage.setItem(NOTES_KEY, notes.value);
            status.textContent = "Notas guardadas en este navegador.";
        } catch { status.textContent = "No se han podido guardar. Copia tus notas antes de cerrar la página."; }
    };
}
async function init() {
    function tick() { const now = new Date(); $("clock").textContent = now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }); $("date").textContent = now.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" }); }
    tick(); setInterval(tick, 1000);
    try {
        const response = await fetch("data/links.json", { cache: "no-store" });
        if (!response.ok) throw new Error("JSON no disponible");
        state = validate(await response.json());
        try {
            const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || "null");
            const preferences = JSON.parse(localStorage.getItem(KEY) || "null") || legacy?.preferences;
            if (preferences) state.preferences = validate({ categorias: [], preferences }).preferences;
        } catch { announce("No se han podido recuperar las preferencias anteriores."); }
        applyPreferences(); render();
    } catch { $("categories").textContent = "No se pudieron cargar los enlaces del JSON publicado. Recarga la página."; return; }
    $("search").oninput = render;
    $("web-form").onsubmit = event => { event.preventDefault(); const query = $("web-search").value.trim(); if (query) location.href = engines[state.preferences.engine] + encodeURIComponent(query); };
    for (const [id, key] of [["theme", "theme"], ["accent", "accent"]]) $(id).onchange = () => { state.preferences[key] = $(id).value; applyPreferences(); save(); };
    initEnginePicker();
    initNotes();
    matchMedia("(prefers-color-scheme: light)").addEventListener("change", applyPreferences);
    $("settings-open").onclick = () => $("settings-dialog").showModal();
    document.querySelectorAll("[data-close]").forEach(b => b.onclick = () => $(b.dataset.close).close());
    document.addEventListener("keydown", event => {
        if (document.querySelector("dialog[open]")) return;
        const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); $("web-search").focus(); }
        else if (event.key === "/" && !typing) { event.preventDefault(); $("search").focus(); }
        else if (event.key === "Escape" && document.activeElement === $("search")) { $("search").value = ""; render(); }
    });
}
document.addEventListener("DOMContentLoaded", init);
