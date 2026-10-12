<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/config/conexion.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(["ok" => false, "error" => "Método no permitido. Use GET"]);
    exit;
}

// Validar el id: entero positivo
$id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT, ["options" => ["min_range" => 1]]);

if ($id === null || $id === false) {
    http_response_code(400);
    echo json_encode(["ok" => false, "error" => "El parámetro id es obligatorio y debe ser un entero positivo"]);
    exit;
}

try {
    $conexion = (new Conexion())->conectar();

    $sql = "SELECT p.id, p.nombre, p.descripcion, p.precio, p.stock, p.marca,
                   p.categoria_id, c.nombre AS categoria, i.url AS imagen
            FROM productos p
            INNER JOIN categorias c ON c.id = p.categoria_id
            LEFT JOIN imagenes i ON i.producto_id = p.id
            WHERE p.id = :id";

    $stmt = $conexion->prepare($sql);
    $stmt->execute([':id' => $id]);
    $filas = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (!$filas) {
        http_response_code(404);
        echo json_encode(["ok" => false, "error" => "Producto no encontrado"]);
        exit;
    }

    // Un producto, con todas sus imágenes en un arreglo
    $producto = $filas[0];
    unset($producto['imagen']);
    $producto['imagenes'] = array_values(array_filter(array_column($filas, 'imagen')));

    echo json_encode(["ok" => true, "data" => $producto], JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["ok" => false, "error" => "Error al obtener el producto"]);
}