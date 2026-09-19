document.addEventListener("DOMContentLoaded", () => {

    iniciarReloj();
    cargarEnlaces();
    iniciarBuscador();
    iniciarBuscadorWeb();

});


/* ================================
   RELOJ Y FECHA
   ================================ */

function iniciarReloj() {

    actualizarReloj();

    setInterval(actualizarReloj, 1000);
}


function actualizarReloj() {

    const ahora = new Date();

    const hora = ahora.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit"
    });

    const fecha = ahora.toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long"
    });


    document.getElementById("clock").textContent = hora;

    document.getElementById("date").textContent =
        capitalizar(fecha);
}


function capitalizar(texto) {

    return texto.charAt(0).toUpperCase() + texto.slice(1);

}


/* ================================
   CARGAR ENLACES
   ================================ */

async function cargarEnlaces() {

    try {

        const respuesta = await fetch("data/links.json");

        if (!respuesta.ok) {
            throw new Error(`Error HTTP: ${respuesta.status}`);
        }

        const datos = await respuesta.json();

        mostrarCategorias(datos.categorias);

    } catch (error) {

        console.error("Error cargando los enlaces:", error);

    }

}


/* ================================
   MOSTRAR CATEGORÍAS
   ================================ */

function mostrarCategorias(categorias) {

    const contenedor = document.getElementById("categories");

    contenedor.innerHTML = "";

    categorias.forEach(categoria => {

        const seccion = crearCategoria(categoria);

        contenedor.appendChild(seccion);

    });

}


/* ================================
   CREAR CATEGORÍA
   ================================ */

function crearCategoria(categoria) {

    const seccion = document.createElement("section");

    seccion.classList.add("category");


    const cabecera = document.createElement("div");

    cabecera.classList.add("category-header");


    const icono = document.createElement("span");

    icono.classList.add("category-icon");

    icono.textContent = categoria.icono || "📁";


    const titulo = document.createElement("h2");

    titulo.textContent = categoria.nombre;


    cabecera.appendChild(icono);
    cabecera.appendChild(titulo);


    const enlaces = document.createElement("div");

    enlaces.classList.add("links");


    categoria.enlaces.forEach(enlace => {

        enlaces.appendChild(crearEnlace(enlace));

    });


    seccion.appendChild(cabecera);

    seccion.appendChild(enlaces);


    return seccion;
}


/* ================================
   CREAR ENLACE
   ================================ */

function crearEnlace(enlace) {

    const elemento = document.createElement("a");

    elemento.classList.add("link");

    elemento.href = enlace.url;

    elemento.target = "_blank";

    elemento.rel = "noopener noreferrer";


    const icono = document.createElement("img");

    icono.classList.add("link-icon");


    if (enlace.icono) {

        icono.style.display = "none";

        const emoji = document.createElement("span");

        emoji.classList.add("link-icon-fallback");

        emoji.textContent = enlace.icono;

        elemento.appendChild(emoji);

    } else {

        const dominio = new URL(enlace.url).hostname;

        icono.src =
            `https://www.google.com/s2/favicons?domain=${dominio}&sz=64`;

        icono.alt = "";

        icono.onerror = () => {

            icono.style.display = "none";

            const fallback = document.createElement("span");

            fallback.classList.add("link-icon-fallback");

            fallback.textContent = "🔗";

            elemento.prepend(fallback);

        };

        elemento.appendChild(icono);

    }


    const nombre = document.createElement("span");

    nombre.classList.add("link-name");

    nombre.textContent = enlace.nombre;


    elemento.appendChild(nombre);


    return elemento;
}


/* ================================
   BUSCADOR
   ================================ */

function iniciarBuscador() {

    const buscador = document.getElementById("search");

    buscador.addEventListener("input", () => {

        const texto = normalizarTexto(buscador.value);

        const categorias = document.querySelectorAll(".category");


        categorias.forEach(categoria => {

            const enlaces = categoria.querySelectorAll(".link");

            let tieneResultados = false;


            enlaces.forEach(enlace => {

                const nombre = normalizarTexto(
                    enlace.querySelector(".link-name").textContent
                );


                if (nombre.includes(texto)) {

                    enlace.style.display = "flex";

                    tieneResultados = true;

                } else {

                    enlace.style.display = "none";

                }

            });


            categoria.style.display =
                tieneResultados ? "block" : "none";

        });

    });

}


function normalizarTexto(texto) {

    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

}

function iniciarBuscadorWeb() {
    const buscador = document.getElementById("web-search");

    buscador.addEventListener("keydown", evento => {
        if (evento.key === "Enter") {
            const texto = buscador.value.trim();

            if (!texto) {
                return;
            }

            window.location.href =
                `https://search.brave.com/search?q=${encodeURIComponent(texto)}`;
        }
    });

    document.addEventListener("keydown", evento => {
        if (
            evento.ctrlKey &&
            evento.key.toLowerCase() === "k" &&
            document.activeElement !== buscador
        ) {
            evento.preventDefault();
            buscador.focus();
        }
    });
}