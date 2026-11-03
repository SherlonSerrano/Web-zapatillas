var api = 'api/endpoints' /* Ruta relativa a index.html */

/* Estado de la consulta actual */
var filtrosActuales = {}
var paginaActual = 1
var porPagina = 8

cargarProductos(1)

document.getElementById('form-filtros').addEventListener('submit', filtrarProductos)
document.getElementById('btn-limpiar').addEventListener('click', limpiarFiltros)
document.getElementById('por_pagina').addEventListener('change', cambiarPorPagina)

function formatearPrecio(valor) {
    return new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN'
    }).format(Number(valor))
}

function mostrarCargando() {
    document.getElementById('loading-products').classList.remove('hidden')
}

function ocultarCargando() {
    document.getElementById('loading-products').classList.add('hidden')
}

function mostrarMensajeGrid(texto) {
    ocultarCargando()
    document.getElementById('total-products').textContent = ""
    document.getElementById('paginacion').innerHTML = ""
    document.getElementById('grid-products').innerHTML =
        `<p class="col-span-full text-center text-neutral-500 py-10">${texto}</p>`
}

/* REQ 2 y 3: listado con filtros y paginación (POST) */
async function cargarProductos(pagina) {

    const erroresDiv = document.getElementById('errores-filtros')
    erroresDiv.classList.add('hidden')

    mostrarCargando()

    /* Filtros guardados + paginación */
    const cuerpo = { ...filtrosActuales, pagina: pagina, por_pagina: porPagina }

    try {
        const respuesta = await fetch(`${api}/filtrar.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cuerpo)
        })
        const resultado = await respuesta.json()

        if (!resultado.ok) {
            ocultarCargando()
            erroresDiv.innerHTML = resultado.detalles ? resultado.detalles.join('<br>') : resultado.error
            erroresDiv.classList.remove('hidden')
            return
        }

        paginaActual = resultado.paginacion.pagina_actual
        renderProducts(resultado.data, resultado.paginacion)
        renderPaginacion(resultado.paginacion)
    } catch (error) {
        mostrarMensajeGrid("No se pudieron cargar los productos.")
    }
}

/* Submit del formulario: aplica los filtros y vuelve a la página 1 */
function filtrarProductos(e) {

    e.preventDefault() /* Evita que el formulario recargue la página */

    const datos = Object.fromEntries(new FormData(e.target))
    filtrosActuales = {}

    for (const [campo, valor] of Object.entries(datos)) {
        if (valor.trim() !== '') filtrosActuales[campo] = valor.trim()
    }

    cargarProductos(1)
}

function limpiarFiltros() {
    document.getElementById('form-filtros').reset()
    filtrosActuales = {}
    cargarProductos(1)
}

function cambiarPorPagina(e) {
    porPagina = Number(e.target.value)
    cargarProductos(1)
}

function renderProducts(productos, paginacion) {

    const grid = document.getElementById('grid-products')

    ocultarCargando()
    grid.innerHTML = ""

    if (productos.length === 0) {
        mostrarMensajeGrid("No se encontraron productos con los filtros seleccionados.")
        return
    }

    /* Ej: "Mostrando 9 a 16 de 20 producto(s)" */
    const desde = (paginacion.pagina_actual - 1) * paginacion.por_pagina + 1
    const hasta = desde + productos.length - 1
    document.getElementById('total-products').textContent =
        `Mostrando ${desde} a ${hasta} de ${paginacion.total_registros} producto(s)`

    productos.forEach(item => {
        const card = document.createElement('div')
        card.className = "bg-white rounded-2xl shadow hover:shadow-xl transition p-4 flex flex-col"

        card.innerHTML = `
            <div class="bg-neutral-50 rounded-xl h-40 flex items-center justify-center mb-3 overflow-hidden">
                <img src="${item.imagen}" alt="${item.nombre}" class="max-h-36 object-contain">
            </div>
            <span class="text-[10px] font-bold uppercase text-neutral-400">${item.marca}</span>
            <h3 class="font-semibold text-sm text-neutral-800 line-clamp-2 min-h-[2.5rem]">${item.nombre}</h3>
            <p class="text-lime-600 font-black text-lg mt-1">${formatearPrecio(item.precio)}</p>
            <button
                class="mt-3 w-full bg-neutral-900 text-white text-sm font-semibold py-2 rounded-full hover:bg-lime-500 hover:text-neutral-900 transition"
                onclick="verDetalle(${item.id})">
                Ver más
            </button>
        `

        grid.appendChild(card)
    })
}

/* REQ 3: botones de paginación con la página actual resaltada */
function renderPaginacion(paginacion) {

    const nav = document.getElementById('paginacion')
    const actual = paginacion.pagina_actual
    const total = paginacion.total_paginas

    nav.innerHTML = ""

    if (total <= 1) return /* Con una sola página no hace falta paginar */

    const claseBase = "min-w-[2.5rem] px-3 py-2 rounded-full text-sm font-semibold transition"
    const claseNormal = `${claseBase} bg-white text-neutral-700 shadow hover:bg-neutral-200`
    const claseActual = `${claseBase} bg-lime-400 text-neutral-900 shadow font-black`
    const claseDeshabilitado = `${claseBase} bg-neutral-200 text-neutral-400 cursor-not-allowed`

    function crearBoton(texto, pagina, clase, deshabilitado = false) {
        const btn = document.createElement('button')
        btn.textContent = texto
        btn.className = clase
        btn.disabled = deshabilitado
        if (!deshabilitado) btn.onclick = () => cargarProductos(pagina)
        return btn
    }

    /* Anterior */
    nav.appendChild(crearBoton('« Anterior', actual - 1, claseNormal, actual === 1))
    if (actual === 1) nav.lastChild.className = claseDeshabilitado

    /* Números: se muestran todos si son pocos; si no, una ventana alrededor de la actual */
    let inicio = 1
    let fin = total
    if (total > 7) {
        inicio = Math.max(1, actual - 2)
        fin = Math.min(total, actual + 2)
    }

    if (inicio > 1) {
        nav.appendChild(crearBoton('1', 1, claseNormal))
        if (inicio > 2) nav.insertAdjacentHTML('beforeend', '<span class="text-neutral-400">…</span>')
    }

    for (let i = inicio; i <= fin; i++) {
        const btn = crearBoton(String(i), i, i === actual ? claseActual : claseNormal)
        if (i === actual) btn.setAttribute('aria-current', 'page')
        nav.appendChild(btn)
    }

    if (fin < total) {
        if (fin < total - 1) nav.insertAdjacentHTML('beforeend', '<span class="text-neutral-400">…</span>')
        nav.appendChild(crearBoton(String(total), total, claseNormal))
    }

    /* Siguiente */
    nav.appendChild(crearBoton('Siguiente »', actual + 1, claseNormal, actual === total))
    if (actual === total) nav.lastChild.className = claseDeshabilitado
}

/* Detalle de un producto (GET con id) */
async function verDetalle(id) {

    try {
        const respuesta = await fetch(`${api}/producto.php?id=${id}`)
        const resultado = await respuesta.json()

        if (!resultado.ok) throw new Error(resultado.error)

        const producto = resultado.data
        const imagenes = producto.imagenes

        const miniaturas = imagenes.length > 1
            ? `<div class="flex gap-2 mt-2">` + imagenes.map(url => `
                <img src="${url}" alt="${producto.nombre}"
                     class="h-12 w-12 object-contain bg-neutral-50 rounded-lg cursor-pointer border"
                     onclick="document.getElementById('img-principal').src='${url}'">`).join('') + `</div>`
            : ""

        document.getElementById('div_product').innerHTML = `
            <div class="grid sm:grid-cols-2 gap-4">
                <div>
                    <div class="bg-neutral-50 rounded-xl h-48 flex items-center justify-center overflow-hidden">
                        <img id="img-principal" src="${imagenes[0] || ''}" alt="${producto.nombre}" class="max-h-44 object-contain">
                    </div>
                    ${miniaturas}
                </div>
                <div>
                    <span class="inline-block text-[10px] font-bold uppercase bg-neutral-200 text-neutral-600 px-2 py-1 rounded-full">
                        ${producto.categoria}
                    </span>
                    <h3 class="font-bold text-neutral-900 mt-2">${producto.nombre}</h3>
                    <p class="text-xs text-neutral-400">${producto.marca}</p>
                    <p class="text-lime-600 font-black text-2xl mt-1">${formatearPrecio(producto.precio)}</p>
                    <p class="text-sm mt-1 ${producto.stock > 0 ? 'text-green-600' : 'text-red-600'}">
                        ${producto.stock > 0 ? 'Stock disponible: ' + producto.stock : 'Sin stock'}
                    </p>
                    <p class="text-neutral-500 text-sm mt-3">${producto.descripcion}</p>
                </div>
            </div>
        `

        document.getElementById('modal').classList.remove('hidden')
    } catch (error) {
        alert("No se pudo obtener el detalle del producto.")
    }
}

function cerrarModal() {
    document.getElementById('modal').classList.add('hidden')
}