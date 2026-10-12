var api = 'api' /* Ruta relativa a index.html: http://localhost/webzapatillas/api */

getListProduct()

document.getElementById('form-filtros').addEventListener('submit', filtrarProductos)
document.getElementById('btn-limpiar').addEventListener('click', limpiarFiltros)

function formatearPrecio(valor) {
    return '$' + Number(valor).toFixed(2)
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
    document.getElementById('grid-products').innerHTML =
        `<p class="col-span-full text-center text-neutral-500 py-10">${texto}</p>`
}

/* REQ 1: listado completo (GET) */
async function getListProduct() {

    mostrarCargando()

    try {
        const respuesta = await fetch(`${api}/productos.php`)
        const resultado = await respuesta.json()

        if (!resultado.ok) throw new Error(resultado.error)

        renderProducts(resultado.data)
    } catch (error) {
        mostrarMensajeGrid("No se pudieron cargar los productos.")
    }
}

/* REQ 3 + 4.1: filtrado (POST) sin recargar la página */
async function filtrarProductos(e) {

    e.preventDefault() /* Evita que el formulario recargue la página */

    const erroresDiv = document.getElementById('errores-filtros')
    erroresDiv.classList.add('hidden')

    /* Enviar solo los filtros que tengan valor */
    const datos = Object.fromEntries(new FormData(e.target))
    const filtros = {}
    for (const [campo, valor] of Object.entries(datos)) {
        if (valor.trim() !== '') filtros[campo] = valor.trim()
    }

    mostrarCargando()

    try {
        const respuesta = await fetch(`${api}/filtrar.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(filtros)
        })
        const resultado = await respuesta.json()

        if (!resultado.ok) {
            ocultarCargando()
            const detalles = resultado.detalles ? resultado.detalles.join('<br>') : resultado.error
            erroresDiv.innerHTML = detalles
            erroresDiv.classList.remove('hidden')
            return
        }

        renderProducts(resultado.data)
    } catch (error) {
        mostrarMensajeGrid("No se pudo realizar el filtrado.")
    }
}

function limpiarFiltros() {
    document.getElementById('form-filtros').reset()
    document.getElementById('errores-filtros').classList.add('hidden')
    getListProduct()
}

function renderProducts(productos) {

    const grid = document.getElementById('grid-products')

    ocultarCargando()
    grid.innerHTML = ""

    document.getElementById('total-products').textContent =
        `${productos.length} producto(s) encontrado(s)`

    if (productos.length === 0) {
        mostrarMensajeGrid("No se encontraron productos con los filtros seleccionados.")
        return
    }

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

/* REQ 2: detalle de un producto (GET con id) */
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