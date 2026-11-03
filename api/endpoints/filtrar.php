<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../controllers/ProductoController.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    echo json_encode(["ok" => false, "error" => "Método no permitido. Use POST"]);
    exit;
}

// Entrada: JSON o, si no hay, form-data
$entrada = json_decode(file_get_contents('php://input'), true);
if (!is_array($entrada)) {
    $entrada = $_POST;
}

(new ProductoController())->filtrar($entrada);