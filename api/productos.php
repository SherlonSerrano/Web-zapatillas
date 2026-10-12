<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/config/conexion.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(["ok" => false, "error" => "Método no permitido. Use GET"]);
    exit;
}

try {
    $conexion = (new Conexion())->conectar();

    $sql = "SELECT p.id, p.nombre, p.descripcion, p.precio, p.stock, p.marca,
                   p.categoria_id, c.nombre AS categoria, i.url AS imagen
            FROM productos p
            INNER JOIN categorias c ON c.id = p.categoria_id
            LEFT JOIN imagenes i ON i.producto_id = p.id
                 AND i.id = (SELECT MIN(id) FROM imagenes WHERE producto_id = p.id)
            ORDER BY p.id";

    $productos = $conexion->query($sql)->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(["ok" => true, "data" => $productos], JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["ok" => false, "error" => "Error al obtener los productos"]);
}