"use strict";
// Fixed city coordinates: the widget never requests device location.
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast?latitude=37.7796&longitude=-3.7849&current=temperature_2m,apparent_temperature,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Europe%2FMadrid&forecast_days=1";
const WEATHER_KEY = "mi-espacio-weather-jaen-v1";
const WEATHER_FRESH = 30 * 60 * 1000;
const WEATHER_MAX_AGE = 3 * 60 * 60 * 1000;
let weatherBusy = false;
function weatherDescription(code, isDay) {
    if (code === 0) return [isDay ? "☀️" : "🌙", "Despejado"];
    if (code === 1) return [isDay ? "🌤️" : "🌙", "Poco nuboso"];
    if (code === 2) return ["⛅", "Parcialmente nuboso"];
    if (code === 3) return ["☁️", "Cubierto"];
    if ([45, 48].includes(code)) return ["🌫️", "Niebla"];
    if ([51, 53, 55].includes(code)) return ["🌦️", "Llovizna"];
    if ([56, 57, 66, 67].includes(code)) return ["🌧️", "Precipitación helada"];
    if ([61, 63, 65].includes(code)) return ["🌧️", "Lluvia"];
    if ([71, 73, 75, 77, 85, 86].includes(code)) return ["🌨️", "Nieve"];
    if ([80, 81, 82].includes(code)) return ["🌦️", "Chubascos"];
    if ([95, 96, 97, 99].includes(code)) return ["⛈️", "Tormenta"];
    return ["🌡️", "Condiciones no disponibles"];
}
function parseWeather(data) {
    const c = data?.current, d = data?.daily;
    if (!Number.isFinite(c?.temperature_2m) || !Number.isInteger(c?.weather_code) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(c?.time)) throw new Error("Respuesta meteorológica incompleta");
    const number = n => Number.isFinite(n) ? n : null;
    return { temp: c.temperature_2m, feels: number(c.apparent_temperature), code: c.weather_code, isDay: c.is_day === 1, time: c.time, min: number(d?.temperature_2m_min?.[0]), max: number(d?.temperature_2m_max?.[0]), rain: number(d?.precipitation_probability_max?.[0]) };
}
function readWeatherCache() {
    try {
        const cache = JSON.parse(localStorage.getItem(WEATHER_KEY));
        const age = Date.now() - cache?.savedAt;
        const w = cache?.weather;
        if (!Number.isFinite(age) || age < 0 || age > WEATHER_MAX_AGE || !Number.isFinite(w?.temp) || !Number.isInteger(w?.code) || typeof w?.time !== "string") return null;
        return cache;
    } catch { return null; }
}
function renderWeather(weather, outdated = false) {
    const node = id => document.getElementById(id);
    const [icon, description] = weatherDescription(weather.code, weather.isDay);
    node("weather-icon").textContent = icon;
    node("weather-temp").textContent = `${Math.round(weather.temp)} °C`;
    node("weather-summary").textContent = description;
    const value = n => Number.isFinite(n) ? Math.round(n) : "—";
    node("weather-details").textContent = `Mín ${value(weather.min)}° · Máx ${value(weather.max)}° · Lluvia ${value(weather.rain)} %`;
    const time = weather.time.slice(11, 16);
    node("weather-updated").textContent = `${outdated ? "Guardado" : "Datos de"} ${time}`;
    node("weather").title = `${description} en Jaén. Sensación: ${value(weather.feels)} °C. Datos del ${weather.time.replace("T", " a las ")} (hora de Jaén).${outdated ? " Pendiente de actualizar." : ""}`;
}
async function loadWeather(force = false) {
    if (weatherBusy) return;
    const node = id => document.getElementById(id);
    const cache = readWeatherCache();
    if (!force && cache && Date.now() - cache.savedAt < WEATHER_FRESH) {
        renderWeather(cache.weather); node("weather").setAttribute("aria-busy", "false"); return;
    }
    weatherBusy = true; node("weather-refresh").disabled = true; node("weather").setAttribute("aria-busy", "true");
    if (cache) renderWeather(cache.weather, true);
    try {
        const response = await fetch(WEATHER_URL, { signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error("Servicio meteorológico no disponible");
        const weather = parseWeather(await response.json());
        renderWeather(weather);
        try { localStorage.setItem(WEATHER_KEY, JSON.stringify({ savedAt: Date.now(), weather })); } catch { /* Weather works without browser storage. */ }
    } catch {
        if (cache) { renderWeather(cache.weather, true); node("weather-updated").textContent = `Sin actualizar · ${cache.weather.time.slice(11, 16)}`; }
        else {
            node("weather-icon").textContent = "☁️"; node("weather-temp").textContent = "—";
            node("weather-summary").textContent = "No se pudo cargar el tiempo";
            node("weather-details").textContent = "Pulsa ↻ para reintentar"; node("weather-updated").textContent = "Sin conexión al servicio";
        }
    } finally { weatherBusy = false; node("weather-refresh").disabled = false; node("weather").setAttribute("aria-busy", "false"); }
}
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("weather-refresh").onclick = () => loadWeather(true);
    loadWeather();
    setInterval(() => { if (!document.hidden) loadWeather(); }, 15 * 60 * 1000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) loadWeather(); });
});
