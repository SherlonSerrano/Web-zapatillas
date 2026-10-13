/* Vista "Productos" (REQ 4): consume los servicios PHP del contrato
   GET  api/productos.php        -> listado
   GET  api/producto.php?id=N    -> detalle (modal)
   POST api/filtrar.php          -> filtros en JSON, sin recargar la página */

(() => {
    'use strict'

    /* Si la vista se vuelve a cargar, se quitan los listeners de la carga anterior */
    if (window.__productoVista) window.__productoVista.abort()
    const vista = new AbortController()
    window.__productoVista = vista
    const { signal } = vista

    /* ---------- Configuración ---------- */
    const API = 'api' /* Ruta relativa a index.html: http://localhost/webzapatillas/api */
    const MONEDA = '$'
    const USAR_FAKESTORE = true /* true = modo prueba con FakeStoreAPI (sin PHP ni base de datos). Dejar en false al entregar */
    const FAKESTORE = 'https://fakestoreapi.com'
    const STOCK_BAJO = 5 /* a partir de aquí se avisa "Últimas unidades" */
    const TITULO_MODAL = 'Detalle del producto'
    const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
        "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 150'>" +
        "<rect width='200' height='150' fill='#f5f5f5'/>" +
        "<text x='100' y='90' font-size='52' text-anchor='middle'>👟</text></svg>")

    const ETIQUETAS_FILTRO = {
        nombre: 'Nombre',
        marca: 'Marca',
        categoria_id: 'Categoría',
        precio_min: 'Precio mín.',
        precio_max: 'Precio máx.',
        stock_min: 'Stock mín.'
    }

    /* ---------- Elementos del DOM ---------- */
    const $ = (id) => document.getElementById(id)
    const form = $('form-filtros')
    const grid = $('grid-products')
    const totalEl = $('total-products')
    const chipsEl = $('chips-filtros')
    const erroresEl = $('errores-filtros')
    const ordenEl = $('orden')
    const modal = $('modal')
    const detalleEl = $('div_product')
    const btnToggle = $('btn-toggle-filtros')

    /* ---------- Estado ---------- */
    let catalogo = []          /* listado completo (sirve para llenar selects y mostrar "X de Y") */
    let actuales = []          /* productos que se están mostrando */
    let filtrosActivos = {}    /* filtros del último POST exitoso */
    let ctrlPeticion = null    /* para cancelar una búsqueda si llega otra */
    let ultimaAccion = null    /* lo que hace el botón "Reintentar" */
    let solicitudDetalle = 0   /* evita pintar un detalle viejo si se abrió otro después */
    let focoPrevio = null

    /* ---------- Utilidades ---------- */
    function esc(valor) { /* escapa texto de la API antes de ponerlo en innerHTML */
        return String(valor ?? '').replace(/[&<>"']/g, (c) => (
            { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
        ))
    }

    const formatoPrecio = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    function formatearPrecio(valor) {
        return MONEDA + formatoPrecio.format(Number(valor))
    }

    /* Llama a la API y devuelve { ok, status, json }. Lanza error si la respuesta no es JSON */
    async function pedir(ruta, opciones = {}) {
        if (USAR_FAKESTORE) return pedirFakeStore(ruta, opciones)

        const respuesta = await fetch(`${API}/${ruta}`, opciones)
        const json = await respuesta.json().catch((err) => {
            if (err.name === 'AbortError') throw err
            return null
        })
        if (!json) throw new Error('El servidor no devolvió JSON')
        return { ok: respuesta.ok && json.ok !== false, status: respuesta.status, json }
    }

    /* ---------- Modo prueba: FakeStoreAPI imitando el contrato de los servicios PHP ---------- */
    let cacheFake = null

    async function productosFake(signal) {
        if (!cacheFake) {
            const r = await fetch(`${FAKESTORE}/products`, { signal })
            if (!r.ok) throw new Error('FakeStoreAPI no respondió')
            const lista = await r.json()
            const cats = [...new Set(lista.map((p) => p.category))].sort()
            cacheFake = lista.map((p) => ({
                id: p.id,
                nombre: p.title,
                descripcion: p.description,
                precio: Number(p.price).toFixed(2),
                stock: String(p.rating ? p.rating.count : 0),
                marca: p.title.split(/[\s-]+/)[0],        /* FakeStore no tiene marca: se usa la 1.ª palabra */
                categoria_id: String(cats.indexOf(p.category) + 1),
                categoria: p.category,
                imagen: p.image
            }))
        }
        return cacheFake
    }

    async function pedirFakeStore(ruta, opciones) {
        const res = (status, json) => ({ ok: status < 400, status, json })
        const todos = await productosFake(opciones.signal)

        if (ruta === 'productos.php') return res(200, { ok: true, data: todos })

        if (ruta.startsWith('producto.php')) {
            const id = new URLSearchParams(ruta.split('?')[1]).get('id')
            if (!/^[1-9]\d*$/.test(id || '')) {
                return res(400, { ok: false, error: 'El parámetro id es obligatorio y debe ser un entero positivo' })
            }
            const prod = todos.find((x) => String(x.id) === id)
            if (!prod) return res(404, { ok: false, error: 'Producto no encontrado' })
            const { imagen, ...resto } = prod
            return res(200, { ok: true, data: { ...resto, imagenes: [imagen] } })
        }

        if (ruta === 'filtrar.php') { /* misma validación y respuestas que filtrar.php */
            const f = JSON.parse(opciones.body || '{}')
            const errores = []
            const num = (v) => (v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : NaN)

            let min = null, max = null
            if (f.precio_min !== undefined) {
                min = num(f.precio_min)
                if (Number.isNaN(min) || min < 0) { errores.push('precio_min debe ser un número mayor o igual a 0'); min = null }
            }
            if (f.precio_max !== undefined) {
                max = num(f.precio_max)
                if (Number.isNaN(max) || max < 0) { errores.push('precio_max debe ser un número mayor o igual a 0'); max = null }
            }
            if (min !== null && max !== null && min > max) errores.push('precio_min no puede ser mayor que precio_max')
            if (f.stock_min !== undefined && !/^\d+$/.test(String(f.stock_min))) errores.push('stock_min debe ser un entero mayor o igual a 0')
            if (f.categoria_id !== undefined && !/^[1-9]\d*$/.test(String(f.categoria_id))) errores.push('categoria_id debe ser un entero positivo')

            if (errores.length) return res(422, { ok: false, error: 'Parámetros inválidos', detalles: errores })

            const data = todos.filter((p) =>
                (!f.nombre || p.nombre.toLowerCase().includes(String(f.nombre).toLowerCase())) &&
                (!f.marca || p.marca.toLowerCase() === String(f.marca).toLowerCase()) &&
                (!f.categoria_id || p.categoria_id === String(f.categoria_id)) &&
                (min === null || Number(p.precio) >= min) &&
                (max === null || Number(p.precio) <= max) &&
                (f.stock_min === undefined || Number(p.stock) >= Number(f.stock_min)))

            return res(200, { ok: true, total: data.length, data })
        }

        return res(404, { ok: false, error: 'Servicio no encontrado' })
    }

    function nuevaPeticion() {
        if (ctrlPeticion) ctrlPeticion.abort()
        ctrlPeticion = new AbortController()
        return ctrlPeticion
    }

    /* ---------- Estados visuales de la cuadrícula ---------- */
    function mostrarSkeleton() {
        totalEl.textContent = 'Buscando…'
        grid.setAttribute('aria-busy', 'true')
        grid.innerHTML = Array.from({ length: 8 }, () => `
            <div class="bg-white rounded-2xl p-4 shadow-sm">
                <div class="skeleton h-44 rounded-xl mb-3"></div>
                <div class="skeleton h-3 w-1/3 rounded mb-2"></div>
                <div class="skeleton h-4 w-4/5 rounded mb-3"></div>
                <div class="skeleton h-6 w-1/3 rounded mb-4"></div>
                <div class="skeleton h-9 rounded-full"></div>
            </div>`).join('')
    }

    function mensajeGrid(icono, titulo, texto, accion, etiquetaAccion) {
        grid.removeAttribute('aria-busy')
        totalEl.textContent = ''
        grid.innerHTML = `
            <div class="col-span-full text-center py-14 fade-up">
                <div class="text-5xl mb-3" aria-hidden="true">${icono}</div>
                <h3 class="font-bold text-neutral-800">${esc(titulo)}</h3>
                <p class="text-neutral-500 text-sm mt-1">${esc(texto)}</p>
                <button type="button" data-accion="${accion}"
                    class="mt-4 px-5 py-2 rounded-full bg-neutral-900 text-white text-sm font-semibold hover:bg-lime-500 hover:text-neutral-900 transition">
                    ${esc(etiquetaAccion)}
                </button>
            </div>`
    }

    function mostrarErroresFiltros(lista) {
        erroresEl.innerHTML = '<ul class="list-disc pl-5">' +
            lista.map((m) => `<li>${esc(m)}</li>`).join('') + '</ul>'
        erroresEl.classList.remove('hidden')
    }

    function ocultarErroresFiltros() {
        erroresEl.classList.add('hidden')
        erroresEl.innerHTML = ''
    }

    /* ---------- REQ 1: listado completo (GET) ---------- */
    async function getListProduct() {
        ultimaAccion = getListProduct
        mostrarSkeleton()
        const ctrl = nuevaPeticion()

        try {
            const { ok, json } = await pedir('productos.php', { signal: ctrl.signal })
            if (!ok) throw new Error(json.error)

            catalogo = json.data
            filtrosActivos = {}
            poblarSelects()
            renderChips()
            mostrarProductos(json.data)
        } catch (error) {
            if (error.name === 'AbortError') return
            mensajeGrid('⚠️', 'No se pudieron cargar los productos',
                'Revisa que Apache y MySQL estén encendidos e inténtalo de nuevo.', 'reintentar', 'Reintentar')
        }
    }

    /* Marca y categoría se llenan con los datos de la API, así no quedan fijos en el HTML */
    function poblarSelects() {
        const selMarca = $('marca')
        const selCategoria = $('categoria_id')
        const marcaActual = selMarca.value
        const categoriaActual = selCategoria.value

        const marcas = [...new Set(catalogo.map((p) => p.marca))]
            .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))

        const categorias = new Map()
        catalogo.forEach((p) => categorias.set(String(p.categoria_id), p.categoria))

        selMarca.innerHTML = '<option value="">Todas</option>' +
            marcas.map((m) => `<option value="${esc(m)}">${esc(m)}</option>`).join('')

        selCategoria.innerHTML = '<option value="">Todas</option>' +
            [...categorias.entries()]
                .sort((a, b) => Number(a[0]) - Number(b[0]))
                .map(([id, nombre]) => `<option value="${esc(id)}">${esc(nombre)}</option>`).join('')

        selMarca.value = marcaActual
        selCategoria.value = categoriaActual
    }

    /* ---------- REQ 3 + 4.1: filtrado (POST) sin recargar la página ---------- */
    function leerFiltros() {
        /* Enviar solo los filtros que tengan valor */
        const filtros = {}
        for (const [campo, valor] of new FormData(form)) {
            if (String(valor).trim() !== '') filtros[campo] = String(valor).trim()
        }
        return filtros
    }

    async function filtrarProductos(e) {
        e.preventDefault() /* Evita que el formulario recargue la página */

        ocultarErroresFiltros()
        const filtros = leerFiltros()
        ultimaAccion = () => filtrarProductos(new Event('submit'))

        mostrarSkeleton()
        const ctrl = nuevaPeticion()

        try {
            const { ok, status, json } = await pedir('filtrar.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(filtros),
                signal: ctrl.signal
            })

            if (!ok) {
                if (status === 422) { /* validación: se muestran los detalles y se conserva el resultado anterior */
                    mostrarErroresFiltros(json.detalles || [json.error])
                    renderGrid()
                    return
                }
                throw new Error(json.error)
            }

            filtrosActivos = filtros
            renderChips()
            mostrarProductos(json.data)

            /* En celular, se cierra el panel al ver los resultados */
            if (window.matchMedia('(max-width: 767px)').matches) cambiarPanelFiltros(false)
        } catch (error) {
            if (error.name === 'AbortError') return
            mensajeGrid('⚠️', 'No se pudo realizar el filtrado',
                'Hubo un problema al contactar con el servidor.', 'reintentar', 'Reintentar')
        }
    }

    function limpiarFiltros() {
        form.reset()
        ocultarErroresFiltros()
        getListProduct()
    }

    function cambiarPanelFiltros(abrir) {
        form.classList.toggle('hidden', !abrir)
        btnToggle.setAttribute('aria-expanded', String(abrir))
    }

    /* Chips con los filtros aplicados; la "×" quita ese filtro y vuelve a consultar */
    function renderChips() {
        chipsEl.innerHTML = Object.entries(filtrosActivos).map(([campo, valor]) => {
            let texto = valor
            if (campo === 'categoria_id') {
                const prod = catalogo.find((p) => String(p.categoria_id) === String(valor))
                texto = prod ? prod.categoria : valor
            } else if (campo === 'precio_min' || campo === 'precio_max') {
                texto = MONEDA + valor
            }
            const etiqueta = ETIQUETAS_FILTRO[campo] || campo
            return `
                <span class="inline-flex items-center gap-1 bg-lime-100 text-lime-900 text-xs font-semibold pl-3 pr-1 py-1 rounded-full">
                    ${esc(etiqueta)}: ${esc(texto)}
                    <button type="button" data-quitar="${esc(campo)}" aria-label="Quitar filtro ${esc(etiqueta)}"
                        class="w-5 h-5 rounded-full hover:bg-lime-300 leading-none">&times;</button>
                </span>`
        }).join('')
    }

    /* ---------- Pintar productos ---------- */
    function mostrarProductos(productos) {
        actuales = productos
        renderGrid()
    }

    function ordenar(productos) {
        const lista = [...productos]
        switch (ordenEl.value) {
            case 'precio_asc': return lista.sort((a, b) => a.precio - b.precio)
            case 'precio_desc': return lista.sort((a, b) => b.precio - a.precio)
            case 'nombre': return lista.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
            case 'stock_desc': return lista.sort((a, b) => b.stock - a.stock)
            default: return lista
        }
    }

    function insigniaStock(stock) {
        if (stock <= 0) {
            return '<span class="absolute top-2 left-2 text-[10px] font-bold bg-red-100 text-red-700 px-2 py-1 rounded-full">Agotado</span>'
        }
        if (stock <= STOCK_BAJO) {
            return `<span class="absolute top-2 left-2 text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-full">Últimas ${stock} unidades</span>`
        }
        return ''
    }

    function renderGrid() {
        grid.removeAttribute('aria-busy')

        if (actuales.length === 0) {
            mensajeGrid('🔍', 'No encontramos productos',
                'Prueba cambiando o quitando algunos filtros.', 'limpiar', 'Limpiar filtros')
            totalEl.textContent = '0 producto(s)'
            return
        }

        const hayFiltros = Object.keys(filtrosActivos).length > 0
        totalEl.textContent = hayFiltros && catalogo.length
            ? `${actuales.length} de ${catalogo.length} producto(s)`
            : `${actuales.length} producto(s)`

        grid.innerHTML = ordenar(actuales).map((item) => `
            <article data-id="${esc(item.id)}"
                class="fade-up group bg-white rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition duration-200 p-4 flex flex-col cursor-pointer">
                <div class="relative bg-neutral-50 rounded-xl h-44 flex items-center justify-center overflow-hidden mb-3">
                    ${insigniaStock(Number(item.stock))}
                    <img src="${esc(item.imagen || PLACEHOLDER)}" alt="${esc(item.nombre)}" loading="lazy"
                        class="max-h-40 max-w-full object-contain group-hover:scale-105 transition duration-300">
                </div>
                <span class="text-[10px] font-bold uppercase tracking-wide text-neutral-400 truncate">
                    ${esc(item.marca)} · ${esc(item.categoria)}
                </span>
                <h3 class="font-semibold text-sm text-neutral-800 line-clamp-2 min-h-[2.5rem]">${esc(item.nombre)}</h3>
                <p class="text-lime-600 font-black text-lg mt-1">${formatearPrecio(item.precio)}</p>
                <button type="button"
                    class="mt-3 w-full bg-neutral-900 text-white text-sm font-semibold py-2 rounded-full group-hover:bg-lime-500 group-hover:text-neutral-900 transition">
                    Ver detalle
                </button>
            </article>`).join('')
    }

    /* ---------- REQ 2: detalle de un producto (GET con id) en el modal ---------- */
    function abrirModal() {
        modal.classList.remove('hidden')
        document.body.classList.add('overflow-hidden')
        modal.querySelector('button[data-cerrar]').focus()
    }

    function cerrarModal() {
        solicitudDetalle++ /* invalida respuestas pendientes */
        modal.classList.add('hidden')
        document.body.classList.remove('overflow-hidden')
        if (focoPrevio && document.contains(focoPrevio)) focoPrevio.focus()
    }

    async function verDetalle(id) {
        const solicitud = ++solicitudDetalle

        $('modal-titulo').textContent = TITULO_MODAL
        detalleEl.innerHTML = `
            <div class="grid sm:grid-cols-2 gap-6">
                <div class="skeleton h-64 rounded-xl"></div>
                <div class="space-y-3">
                    <div class="skeleton h-4 w-1/3 rounded"></div>
                    <div class="skeleton h-6 w-4/5 rounded"></div>
                    <div class="skeleton h-8 w-1/3 rounded"></div>
                    <div class="skeleton h-16 rounded"></div>
                </div>
            </div>`
        abrirModal()

        try {
            const { ok, status, json } = await pedir(`producto.php?id=${encodeURIComponent(id)}`)
            if (solicitud !== solicitudDetalle) return /* el usuario cerró o abrió otro producto */

            if (!ok) {
                throw new Error(status === 404 ? 'Este producto ya no está disponible.' : json.error)
            }
            pintarDetalle(json.data)
        } catch (error) {
            if (solicitud !== solicitudDetalle) return
            detalleEl.innerHTML = `
                <div class="text-center py-10">
                    <div class="text-4xl mb-2" aria-hidden="true">⚠️</div>
                    <p class="text-neutral-600">${esc(error.message || 'No se pudo obtener el detalle del producto.')}</p>
                </div>`
        }
    }

    function pintarDetalle(producto) {
        const imagenes = producto.imagenes && producto.imagenes.length ? producto.imagenes : [PLACEHOLDER]
        const stock = Number(producto.stock)

        const miniaturas = imagenes.length > 1
            ? '<div class="flex gap-2 mt-3">' + imagenes.map((url, i) => `
                <button type="button" data-miniatura="${esc(url)}" aria-label="Ver imagen ${i + 1}"
                    class="h-14 w-14 bg-neutral-50 rounded-lg border-2 ${i === 0 ? 'border-lime-400' : 'border-transparent'} p-1">
                    <img src="${esc(url)}" alt="" class="h-full w-full object-contain">
                </button>`).join('') + '</div>'
            : ''

        let estadoStock
        if (stock <= 0) {
            estadoStock = '<span class="text-red-600 font-semibold">Sin stock</span>'
        } else if (stock <= STOCK_BAJO) {
            estadoStock = `<span class="text-amber-600 font-semibold">Quedan pocas unidades (${stock})</span>`
        } else {
            estadoStock = `<span class="text-green-600 font-semibold">En stock (${stock} disponibles)</span>`
        }

        $('modal-titulo').textContent = producto.nombre

        detalleEl.innerHTML = `
            <div class="grid sm:grid-cols-2 gap-6">
                <div>
                    <div class="bg-neutral-50 rounded-xl h-64 flex items-center justify-center overflow-hidden">
                        <img id="img-principal" src="${esc(imagenes[0])}" alt="${esc(producto.nombre)}" class="max-h-60 max-w-full object-contain">
                    </div>
                    ${miniaturas}
                </div>
                <div>
                    <span class="inline-block text-[10px] font-bold uppercase bg-neutral-200 text-neutral-600 px-2 py-1 rounded-full">
                        ${esc(producto.categoria)}
                    </span>
                    <h3 class="font-black text-xl text-neutral-900 mt-2">${esc(producto.nombre)}</h3>
                    <p class="text-sm text-neutral-400">${esc(producto.marca)}</p>
                    <p class="text-lime-600 font-black text-3xl mt-2">${formatearPrecio(producto.precio)}</p>
                    <p class="text-sm mt-1">${estadoStock}</p>
                    <p class="text-neutral-600 text-sm mt-4 leading-relaxed">${esc(producto.descripcion)}</p>
                </div>
            </div>`
    }

    /* ---------- Eventos ---------- */
    form.addEventListener('submit', filtrarProductos, { signal })
    $('btn-limpiar').addEventListener('click', limpiarFiltros, { signal })
    btnToggle.addEventListener('click', () => cambiarPanelFiltros(form.classList.contains('hidden')), { signal })
    ordenEl.addEventListener('change', () => { if (actuales.length) renderGrid() }, { signal })

    /* Cuadrícula: abrir detalle, reintentar y limpiar (delegación de eventos) */
    grid.addEventListener('click', (e) => {
        const accion = e.target.closest('[data-accion]')
        if (accion) {
            if (accion.dataset.accion === 'limpiar') limpiarFiltros()
            else if (ultimaAccion) ultimaAccion()
            return
        }

        const tarjeta = e.target.closest('article[data-id]')
        if (tarjeta) {
            focoPrevio = tarjeta.querySelector('button')
            verDetalle(tarjeta.dataset.id)
        }
    }, { signal })

    /* Si una imagen falla, se muestra el placeholder en lugar del ícono roto */
    grid.addEventListener('error', (e) => {
        const img = e.target
        if (img.tagName === 'IMG' && !img.dataset.fallback) {
            img.dataset.fallback = '1'
            img.src = PLACEHOLDER
        }
    }, { capture: true, signal })

    chipsEl.addEventListener('click', (e) => {
        const quitar = e.target.closest('[data-quitar]')
        if (!quitar) return
        const campo = form.elements[quitar.dataset.quitar]
        if (campo) campo.value = ''
        form.requestSubmit()
    }, { signal })

    /* Modal: botones de cerrar, clic en el fondo, miniaturas y teclado */
    modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.closest('[data-cerrar]')) {
            cerrarModal()
            return
        }

        const miniatura = e.target.closest('[data-miniatura]')
        if (miniatura) {
            $('img-principal').src = miniatura.dataset.miniatura
            detalleEl.querySelectorAll('[data-miniatura]').forEach((b) => {
                const activa = b === miniatura
                b.classList.toggle('border-lime-400', activa)
                b.classList.toggle('border-transparent', !activa)
            })
        }
    }, { signal })

    document.addEventListener('keydown', (e) => {
        if (modal.classList.contains('hidden')) return

        if (e.key === 'Escape') {
            cerrarModal()
        } else if (e.key === 'Tab') { /* mantiene el foco dentro del modal */
            const enfocables = [...modal.querySelectorAll('button')].filter((el) => el.offsetParent !== null)
            if (!enfocables.length) return
            const primero = enfocables[0]
            const ultimo = enfocables[enfocables.length - 1]
            if (e.shiftKey && document.activeElement === primero) {
                e.preventDefault()
                ultimo.focus()
            } else if (!e.shiftKey && document.activeElement === ultimo) {
                e.preventDefault()
                primero.focus()
            }
        }
    }, { signal })

    /* Al salir de la vista, se libera el scroll del body y se cancela cualquier petición pendiente */
    signal.addEventListener('abort', () => {
        document.body.classList.remove('overflow-hidden')
        if (ctrlPeticion) ctrlPeticion.abort()
    })

    /* ---------- Inicio ---------- */
    async function iniciar() {
        await getListProduct()

        /* Si se llegó desde un acceso rápido del inicio (ej. marca Nike), se aplica ese filtro */
        const inicial = window.filtroInicial
        window.filtroInicial = null
        if (inicial && catalogo.length) {
            Object.entries(inicial).forEach(([campo, valor]) => {
                if (form.elements[campo]) form.elements[campo].value = valor
            })
            cambiarPanelFiltros(true)
            form.requestSubmit()
        }
    }

    iniciar()
})()
