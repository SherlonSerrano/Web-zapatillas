<?php
require_once __DIR__ . '/../models/ProductoModel.php';

class ProductoController {

    private const POR_PAGINA_DEFECTO = 8;
    private const POR_PAGINA_MAX = 50;

    /* GET: listado completo */
    public function listar() {
        try {
            $modelo = new ProductoModel();
            $this->responder(200, ["ok" => true, "data" => $modelo->listar()]);
        } catch (Throwable $e) {
            error_log($e->getMessage());
            $this->responder(500, ["ok" => false, "error" => "Error al obtener los productos"]);
        }
    }

    /* GET: detalle por id */
    public function detalle($id) {
        $id = filter_var($id, FILTER_VALIDATE_INT, ["options" => ["min_range" => 1]]);

        if ($id === false) {
            $this->responder(400, [
                "ok" => false,
                "error" => "El parámetro id es obligatorio y debe ser un entero positivo"
            ]);
        }

        try {
            $modelo = new ProductoModel();
            $producto = $modelo->obtenerPorId($id);

            if ($producto === null) {
                $this->responder(404, ["ok" => false, "error" => "Producto no encontrado"]);
            }

            $this->responder(200, ["ok" => true, "data" => $producto]);
        } catch (Throwable $e) {
            error_log($e->getMessage());
            $this->responder(500, ["ok" => false, "error" => "Error al obtener el producto"]);
        }
    }

    /* POST: filtros + paginación */
    public function filtrar($entrada) {
        $errores = [];
        $filtros = [];

        // nombre (búsqueda parcial)
        $nombre = $this->texto($entrada, 'nombre', $errores);
        if ($nombre !== '') {
            if (mb_strlen($nombre) > 150) {
                $errores[] = "nombre no puede superar 150 caracteres";
            } else {
                $filtros['nombre'] = $nombre;
            }
        }

        // marca
        $marca = $this->texto($entrada, 'marca', $errores);
        if ($marca !== '') {
            if (mb_strlen($marca) > 80) {
                $errores[] = "marca no puede superar 80 caracteres";
            } else {
                $filtros['marca'] = $marca;
            }
        }

        // categoria_id
        $categoria = $this->texto($entrada, 'categoria_id', $errores);
        if ($categoria !== '') {
            $valor = filter_var($categoria, FILTER_VALIDATE_INT, ["options" => ["min_range" => 1]]);
            if ($valor === false) {
                $errores[] = "categoria_id debe ser un entero positivo";
            } else {
                $filtros['categoria_id'] = $valor;
            }
        }

        // rango de precios
        $precioMin = $this->texto($entrada, 'precio_min', $errores);
        if ($precioMin !== '') {
            $valor = filter_var($precioMin, FILTER_VALIDATE_FLOAT);
            if ($valor === false || $valor < 0) {
                $errores[] = "precio_min debe ser un número mayor o igual a 0";
            } else {
                $filtros['precio_min'] = $valor;
            }
        }

        $precioMax = $this->texto($entrada, 'precio_max', $errores);
        if ($precioMax !== '') {
            $valor = filter_var($precioMax, FILTER_VALIDATE_FLOAT);
            if ($valor === false || $valor < 0) {
                $errores[] = "precio_max debe ser un número mayor o igual a 0";
            } else {
                $filtros['precio_max'] = $valor;
            }
        }

        if (isset($filtros['precio_min'], $filtros['precio_max'])
            && $filtros['precio_min'] > $filtros['precio_max']) {
            $errores[] = "precio_min no puede ser mayor que precio_max";
        }

        // stock_min
        $stockMin = $this->texto($entrada, 'stock_min', $errores);
        if ($stockMin !== '') {
            $valor = filter_var($stockMin, FILTER_VALIDATE_INT, ["options" => ["min_range" => 0]]);
            if ($valor === false) {
                $errores[] = "stock_min debe ser un entero mayor o igual a 0";
            } else {
                $filtros['stock_min'] = $valor;
            }
        }

        // paginación
        $pagina = 1;
        $porPagina = self::POR_PAGINA_DEFECTO;

        $textoPagina = $this->texto($entrada, 'pagina', $errores);
        if ($textoPagina !== '') {
            $valor = filter_var($textoPagina, FILTER_VALIDATE_INT, ["options" => ["min_range" => 1]]);
            if ($valor === false) {
                $errores[] = "pagina debe ser un entero mayor o igual a 1";
            } else {
                $pagina = $valor;
            }
        }

        $textoPorPagina = $this->texto($entrada, 'por_pagina', $errores);
        if ($textoPorPagina !== '') {
            $valor = filter_var($textoPorPagina, FILTER_VALIDATE_INT, [
                "options" => ["min_range" => 1, "max_range" => self::POR_PAGINA_MAX]
            ]);
            if ($valor === false) {
                $errores[] = "por_pagina debe ser un entero entre 1 y " . self::POR_PAGINA_MAX;
            } else {
                $porPagina = $valor;
            }
        }

        if ($errores) {
            $this->responder(422, ["ok" => false, "error" => "Parámetros inválidos", "detalles" => $errores]);
        }

        try {
            $modelo = new ProductoModel();
            $resultado = $modelo->filtrar($filtros, $pagina, $porPagina);

            $this->responder(200, [
                "ok" => true,
                "data" => $resultado['data'],
                "paginacion" => [
                    "pagina_actual"   => $pagina,
                    "por_pagina"      => $porPagina,
                    "total_registros" => $resultado['total'],
                    "total_paginas"   => (int) ceil($resultado['total'] / $porPagina)
                ]
            ]);
        } catch (Throwable $e) {
            error_log($e->getMessage());
            $this->responder(500, ["ok" => false, "error" => "Error al filtrar los productos"]);
        }
    }

    /* Devuelve el valor como texto limpio, o '' si no se envió */
    private function texto($entrada, $campo, &$errores) {
        if (!isset($entrada[$campo])) {
            return '';
        }
        if (!is_scalar($entrada[$campo])) {
            $errores[] = "El campo $campo tiene un formato inválido";
            return '';
        }
        return trim((string) $entrada[$campo]);
    }

    private function responder(int $codigo, array $cuerpo) {
        http_response_code($codigo);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($cuerpo, JSON_UNESCAPED_UNICODE);
        exit;
    }
}