<?php
class Conexion {
    private $host = "localhost";
    private $db = "sneakhub_db";
    private $user = "root";
    private $password = "";

    public function conectar() {
        try {
            $conexion = new PDO(
                "mysql:host=$this->host;dbname=$this->db;charset=utf8mb4",
                $this->user,
                $this->password,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, 
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
                ]
            );
            return $conexion;
        } catch (PDOException $error) {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8'); // Sin esto, tildes y ñ de los nombres o descripciones pueden salir mal en el JSON.
            echo json_encode(["ok" => false, "error" => "Error de conexión a la base de datos"]);
            exit;
        }
    }
}
?>