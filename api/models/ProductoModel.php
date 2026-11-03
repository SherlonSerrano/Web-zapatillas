<?php
require_once __DIR__ . '/../config/conexion.php';

class ProductoModel {

    private $db;

    private const SELECT_BASE = "SELECT p.id, p.nombre, p.descripcion, p.precio, p.stock, p.marca,
                p.categoria_id, c.nombre AS categoria, i.url AS imagen
            FROM productos p
            INNER JOIN categorias c ON c.id = p.categoria_id
            LEFT JOIN imagenes i ON i.producto_id = p.id
                 AND i.id = (SELECT MIN(id) FROM imagenes WHERE producto_id = p.id)";

    public function __construct() {
        $this->db = (new Conexion())->conectar();
        $this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $this->db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    }

    /* Listado completo */
    public function listar() {
        return $this->db->query(self::SELECT_BASE . " ORDER BY p.id")->fetchAll();
    }

    /* Detalle por id: devuelve el producto con todas sus imágenes, o null si no existe */
    public function obtenerPorId($id) {
        $sql = "SELECT p.id, p.nombre, p.descripcion, p.precio, p.stock, p.marca,
                       p.categoria_id, c.nombre AS categoria, i.url AS imagen
                FROM productos p
                INNER JOIN categorias c ON c.id = p.categoria_id
                LEFT JOIN imagenes i ON i.producto_id = p.id
                WHERE p.id = :id";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        $filas = $stmt->fetchAll();

        if (!$filas) {
            return null;
        }

        $producto = $filas[0];
        unset($producto['imagen']);
        $producto['imagenes'] = array_values(array_filter(array_column($filas, 'imagen')));

        return $producto;
    }

    /* Filtros + paginación: devuelve ["data" => [...], "total" => N] */
    public function filtrar(array $filtros, int $pagina, int $porPagina) {
        [$where, $params] = $this->construirWhere($filtros);

        // 1) Total de registros que cumplen los filtros
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM productos p" . $where);
        $stmt->execute($params);
        $total = (int) $stmt->fetchColumn();

        // 2) Página solicitada
        $sql = self::SELECT_BASE . $where . " ORDER BY p.id LIMIT :limite OFFSET :offset";
        $stmt = $this->db->prepare($sql);

        foreach ($params as $clave => $valor) {
            $stmt->bindValue($clave, $valor);
        }
        // LIMIT y OFFSET deben enlazarse como enteros
        $stmt->bindValue(':limite', $porPagina, PDO::PARAM_INT);
        $stmt->bindValue(':offset', ($pagina - 1) * $porPagina, PDO::PARAM_INT);
        $stmt->execute();

        return ["data" => $stmt->fetchAll(), "total" => $total];
    }

    /* Agrega solo las condiciones de los filtros que llegaron */
    private function construirWhere(array $f) {
        $cond = [];
        $params = [];

        if (isset($f['nombre'])) {
            $cond[] = "p.nombre LIKE :nombre";
            $params[':nombre'] = '%' . addcslashes($f['nombre'], '%_\\') . '%';
        }
        if (isset($f['marca'])) {
            $cond[] = "p.marca = :marca";
            $params[':marca'] = $f['marca'];
        }
        if (isset($f['categoria_id'])) {
            $cond[] = "p.categoria_id = :categoria_id";
            $params[':categoria_id'] = $f['categoria_id'];
        }
        if (isset($f['precio_min'])) {
            $cond[] = "p.precio >= :precio_min";
            $params[':precio_min'] = $f['precio_min'];
        }
        if (isset($f['precio_max'])) {
            $cond[] = "p.precio <= :precio_max";
            $params[':precio_max'] = $f['precio_max'];
        }
        if (isset($f['stock_min'])) {
            $cond[] = "p.stock >= :stock_min";
            $params[':stock_min'] = $f['stock_min'];
        }

        $where = $cond ? " WHERE " . implode(" AND ", $cond) : "";
        return [$where, $params];
    }
}