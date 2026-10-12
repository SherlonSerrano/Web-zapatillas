<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/config/conexion.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["ok" => false, "error" => "Método no permitido. Use POST"]);
    exit;
}

// Entrada: JSON o, si no hay, form-data
$entrada = json_decode(file_get_contents('php://input'), true);
if (!is_array($entrada)) {
    $entrada = $_POST;
}

$errores = [];
$where   = [];
$params  = [];

// Devuelve el valor como texto limpio, o '' si no se envió
function campo($entrada, $nombre, &$errores) {
    if (!isset($entrada[$nombre])) return '';
    if (!is_scalar($entrada[$nombre])) {
        $errores[] = "El campo $nombre tiene un formato inválido";
        return '';
    }
    return trim((string)$entrada[$nombre]);
}

// nombre (búsqueda parcial)
$nombre = campo($entrada, 'nombre', $errores);
if ($nombre !== '') {
    if (mb_strlen($nombre) > 150) {
        $errores[] = "nombre no puede superar 150 caracteres";
    } else {
        $where[] = "p.nombre LIKE :nombre";
        $params[':nombre'] = '%' . addcslashes($nombre, '%_') . '%';
    }
}

// marca (coincidencia exacta)
$marca = campo($entrada, 'marca', $errores);
if ($marca !== '') {
    if (mb_strlen($marca) > 80) {
        $errores[] = "marca no puede superar 80 caracteres";
    } else {
        $where[] = "p.marca = :marca";
        $params[':marca'] = $marca;
    }
}

// categoria_id (entero positivo)
$categoria = campo($entrada, 'categoria_id', $errores);
if ($categoria !== '') {
    $valor = filter_var($categoria, FILTER_VALIDATE_INT, ["options" => ["min_range" => 1]]);
    if ($valor === false) {
        $errores[] = "categoria_id debe ser un entero positivo";
    } else {
        $where[] = "p.categoria_id = :categoria_id";
        $params[':categoria_id'] = $valor;
    }
}

// precio_min y precio_max (números >= 0)
$precioMin = campo($entrada, 'precio_min', $errores);
$precioMax = campo($entrada, 'precio_max', $errores);
$min = $max = null;

if ($precioMin !== '') {
    $min = filter_var($precioMin, FILTER_VALIDATE_FLOAT);
    if ($min === false || $min < 0) {
        $errores[] = "precio_min debe ser un número mayor o igual a 0";
        $min = null;
    } else {
        $where[] = "p.precio >= :precio_min";
        $params[':precio_min'] = $min;
    }
}
if ($precioMax !== '') {
    $max = filter_var($precioMax, FILTER_VALIDATE_FLOAT);
    if ($max === false || $max < 0) {
        $errores[] = "precio_max debe ser un número mayor o igual a 0";
        $max = null;
    } else {
        $where[] = "p.precio <= :precio_max";
        $params[':precio_max'] = $max;
    }
}
if ($min !== null && $max !== null && $min > $max) {
    $errores[] = "precio_min no puede ser mayor que precio_max";
}

// stock_min (entero >= 0)
$stockMin = campo($entrada, 'stock_min', $errores);
if ($stockMin !== '') {
    $valor = filter_var($stockMin, FILTER_VALIDATE_INT, ["options" => ["min_range" => 0]]);
    if ($valor === false) {
        $errores[] = "stock_min debe ser un entero mayor o igual a 0";
    } else {
        $where[] = "p.stock >= :stock_min";
        $params[':stock_min'] = $valor;
    }
}

if ($errores) {
    http_response_code(422);
    echo json_encode(["ok" => false, "error" => "Parámetros inválidos", "detalles" => $errores], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $conexion = (new Conexion())->conectar();

    $sql = "SELECT p.id, p.nombre, p.descripcion, p.precio, p.stock, p.marca,
                   p.categoria_id, c.nombre AS categoria, i.url AS imagen
            FROM productos p
            INNER JOIN categorias c ON c.id = p.categoria_id
            LEFT JOIN imagenes i ON i.producto_id = p.id
                 AND i.id = (SELECT MIN(id) FROM imagenes WHERE producto_id = p.id)";

    if ($where) {
        $sql .= " WHERE " . implode(" AND ", $where);
    }
    $sql .= " ORDER BY p.id";

    $stmt = $conexion->prepare($sql);
    $stmt->execute($params);
    $productos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(["ok" => true, "total" => count($productos), "data" => $productos], JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["ok" => false, "error" => "Error al filtrar los productos"]);
}