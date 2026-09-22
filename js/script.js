document.getElementById('menu-home').addEventListener('click', (e) => {
    e.preventDefault()
    showHome()
})

document.getElementById('menu-product').addEventListener('click', (e) => {
    e.preventDefault()
    showProductPage()
})

showHome() /* Cargar la página de inicio al cargar la página web */

function showHome() {
    let rutaArchivo = "views/home.html"

    marcarMenuActivo('menu-home')
    limpiarScript("js_product") /* Por si el usuario viene desde productos */

    fetch(rutaArchivo)
        .then(response => response.text())
        .then(data => {
            document.getElementById("div_content").innerHTML = data
        })
}

function showProductPage() {
    let rutaArchivo = "views/view_product.html"

    marcarMenuActivo('menu-product')

    fetch(rutaArchivo)
        .then(response => response.text())
        .then(data => {
            document.getElementById("div_content").innerHTML = data

            limpiarScript("js_product") /* Limpiar el script de product.js si ya existe */

            const script = document.createElement('script')
            script.src = "js/product.js"
            script.id = "js_product"

            document.body.appendChild(script) /* Agregar el script de product.js al final del body */
        })
}

function limpiarScript(id) { /* Función para eliminar un script del DOM */
    let script = document.getElementById(id)
    if (script) {
        script.remove()
    }
}
