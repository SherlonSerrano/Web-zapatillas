var api = 'https://fakestoreapi.com'

renderFilters() /* Renderiza los botones de categoría */
getListProduct() /* Carga inicial de productos */

async function getListProduct() {

    let rutaServicio = `${api}/products`

    document.getElementById('loading-products').classList.remove('hidden')

    const respuesta = await fetch(rutaServicio)
    const productos = await respuesta.json()

    renderProducts(productos)
}

function renderProducts(productos) {

    const grid = document.getElementById('grid-products')
    const loading = document.getElementById('loading-products')

    grid.innerHTML = ""
    loading.classList.add('hidden')

    productos.forEach(item => {
        const card = document.createElement('div')
        card.className = "bg-white rounded-2xl shadow hover:shadow-xl transition p-4 flex flex-col"

        card.innerHTML = `
            <div class="bg-neutral-50 rounded-xl h-40 flex items-center justify-center mb-3 overflow-hidden">
                <img src="${item.image}" alt="${item.title}" class="max-h-36 object-contain">
            </div>
            <h3 class="font-semibold text-sm text-neutral-800 line-clamp-2 min-h-[2.5rem]">${item.title}</h3>
            <p class="text-lime-600 font-black text-lg mt-1">$${item.price}</p>
            <button
                class="mt-3 w-full bg-neutral-900 text-white text-sm font-semibold py-2 rounded-full hover:bg-lime-500 hover:text-neutral-900 transition"
                onclick="verDetalle(${item.id})">
                Ver más
            </button>
        `

        grid.appendChild(card)
    })
}

async function getListCategories() {

    let rutaServicio = `${api}/products/categories`

    const respuesta = await fetch(rutaServicio)
    const categorias = await respuesta.json()

    return categorias
}

async function renderFilters() {

    const categorias = await getListCategories()
    const contenedor = document.getElementById('div_filtros')

    const btnTodos = document.createElement('button')
    btnTodos.textContent = "TODOS"
    btnTodos.className = "btn-filtro bg-lime-400 text-neutral-900 text-xs font-bold px-4 py-2 rounded-full"
    btnTodos.dataset.cat = "__all__"
    btnTodos.onclick = () => {
        marcarFiltroActivo("__all__")
        getListProduct()
    }
    contenedor.appendChild(btnTodos)

    categorias.forEach(item => {
        const btn = document.createElement('button')
        btn.textContent = item.toUpperCase()
        btn.dataset.cat = item
        btn.className = "btn-filtro bg-neutral-200 text-neutral-700 text-xs font-bold px-4 py-2 rounded-full hover:bg-neutral-300"
        btn.onclick = () => FilterCategory(item)
        contenedor.appendChild(btn)
    })
}

async function FilterCategory(cat) {

    const catEncode = encodeURIComponent(cat)
    let rutaServicio = `${api}/products/category/${catEncode}`

    document.getElementById('loading-products').classList.remove('hidden')

    const respuesta = await fetch(rutaServicio)
    const productos = await respuesta.json()

    renderProducts(productos)
    marcarFiltroActivo(cat)
}

function marcarFiltroActivo(cat) {
    document.querySelectorAll('.btn-filtro').forEach(b => {
        b.classList.remove('bg-lime-400', 'text-neutral-900')
        b.classList.add('bg-neutral-200', 'text-neutral-700')
    })
    const activo = document.querySelector(`[data-cat="${cat}"]`)
    if (activo) {
        activo.classList.add('bg-lime-400', 'text-neutral-900')
        activo.classList.remove('bg-neutral-200', 'text-neutral-700')
    }
}

async function verDetalle(id) {

    let rutaServicio = `${api}/products/${id}`

    const respuesta = await fetch(rutaServicio)
    const producto = await respuesta.json()

    const estrellas = "★".repeat(Math.round(producto.rating?.rate || 0)) +
                       "☆".repeat(5 - Math.round(producto.rating?.rate || 0))

    document.getElementById('div_product').innerHTML = `
        <div class="grid sm:grid-cols-2 gap-4">
            <div class="bg-neutral-50 rounded-xl h-48 flex items-center justify-center overflow-hidden">
                <img src="${producto.image}" alt="${producto.title}" class="max-h-44 object-contain">
            </div>
            <div>
                <span class="inline-block text-[10px] font-bold uppercase bg-neutral-200 text-neutral-600 px-2 py-1 rounded-full">
                    ${producto.category}
                </span>
                <h3 class="font-bold text-neutral-900 mt-2">${producto.title}</h3>
                <p class="text-lime-600 font-black text-2xl mt-1">$${producto.price}</p>
                <p class="text-yellow-500 text-sm mt-1">${estrellas} <span class="text-neutral-400">(${producto.rating?.count || 0})</span></p>
                <p class="text-neutral-500 text-sm mt-3">${producto.description}</p>
            </div>
        </div>
    `

    document.getElementById('modal').classList.remove('hidden')
}

function cerrarModal() {
    document.getElementById('modal').classList.add('hidden')
}
