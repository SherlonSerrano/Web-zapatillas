document.getElementById('menu-home').addEventListener('click', (e) => {
    e.preventDefault()
    showHome()
})

document.getElementById('menu-product').addEventListener('click', (e) => {
    e.preventDefault()
    irAProductos()
})

/* Logo del navbar y botones de la vista Inicio (los <script> dentro de un HTML inyectado
   con innerHTML no se ejecutan, por eso los enlaces se resuelven aquí con delegación de eventos) */
document.addEventListener('click', (e) => {
    const home = e.target.closest('[data-ir-home]')
    if (home) {
        e.preventDefault()
        showHome()
        return
    }

    const productos = e.target.closest('[data-ir-productos]')
    if (productos) {
        e.preventDefault()
        const marca = productos.dataset.marca
        irAProductos(marca ? { marca: marca } : null)
    }
})

showHome() /* Cargar la página de inicio al cargar la página web */

/* Va a Productos; si recibe un filtro (ej. { marca: "Nike" }) la vista lo aplica al abrirse */
function irAProductos(filtroInicial) {
    window.filtroInicial = filtroInicial || null
    showProductPage()
}

function showHome() {
    let rutaArchivo = "views/home.html"

    marcarMenuActivo('menu-home')
    limpiarScript("js_product") /* Por si el usuario viene desde productos */
    if (window.__productoVista) window.__productoVista.abort() /* Quita los listeners de la vista de productos */

    cargarVista(rutaArchivo)
}

function showProductPage() {
    let rutaArchivo = "views/view_product.html"

    marcarMenuActivo('menu-product')

    cargarVista(rutaArchivo, () => {
        limpiarScript("js_product") /* Limpiar el script de product.js si ya existe */

        const script = document.createElement('script')
        script.src = "js/product.js?v=" + Date.now() /* v=...: fuerza a cargar la versión actual */
        script.id = "js_product"

        document.body.appendChild(script) /* Agregar el script de product.js al final del body */
    })
}

/* Descarga una vista HTML y la inyecta en #div_content */
function cargarVista(ruta, alTerminar) {
    const contenedor = document.getElementById("div_content")

    fetch(ruta, { cache: 'no-store' }) /* no-store: evita usar una copia vieja de la vista */
        .then(response => {
            if (!response.ok) throw new Error("Vista no encontrada")
            return response.text()
        })
        .then(data => {
            contenedor.innerHTML = data
            window.scrollTo({ top: 0 })
            if (alTerminar) alTerminar()
        })
        .catch(() => {
            contenedor.innerHTML = `
                <p class="text-center text-neutral-500 py-16">
                    No se pudo cargar la página. Verifica que Apache esté encendido y abre el sitio desde
                    <code class="bg-neutral-200 px-1 rounded">http://localhost/…</code>.
                </p>`
        })
}

function limpiarScript(id) { /* Función para eliminar un script del DOM */
    let script = document.getElementById(id)
    if (script) {
        script.remove()
    }
}
