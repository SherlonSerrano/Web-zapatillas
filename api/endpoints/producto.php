<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../controllers/ProductoController.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    header('Allow: GET');
    echo json_encode(["ok" => false, "error" => "Método no permitido. Use GET"]);
    exit;
}

(new ProductoController())->detalle($_GET['id'] ?? null);