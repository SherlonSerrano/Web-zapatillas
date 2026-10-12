-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 12-10-2026 a las 22:05:13
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `sneakhub_db`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `categorias`
--

CREATE TABLE `categorias` (
  `id` int(10) UNSIGNED NOT NULL,
  `nombre` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `categorias`
--

INSERT INTO `categorias` (`id`, `nombre`) VALUES
(3, 'Básquet'),
(4, 'Casual y lifestyle'),
(5, 'Clásicos y colección'),
(2, 'Running y deportivas'),
(1, 'Zapatillas urbanas');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `imagenes`
--

CREATE TABLE `imagenes` (
  `id` int(10) UNSIGNED NOT NULL,
  `producto_id` int(10) UNSIGNED NOT NULL,
  `url` varchar(500) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `imagenes`
--

INSERT INTO `imagenes` (`id`, `producto_id`, `url`) VALUES
(1, 1, 'img/productos/nike-air-force-1-07.jpg'),
(2, 2, 'img/productos/nike-dunk-low-retro.jpg'),
(3, 3, 'img/productos/adidas-supernova-running-3.jpg'),
(4, 4, 'img/productos/adidas-ultraboost-5.jpg'),
(5, 5, 'img/productos/nike-gt-hustle-academy.jpg'),
(6, 6, 'img/productos/nike-giannis-immortality-4.jpg'),
(7, 7, 'img/productos/converse-chuck-taylor-all-star-low.jpg'),
(8, 8, 'img/productos/adidas-samba-og.jpg'),
(9, 9, 'img/productos/air-jordan-1-retro-high-og.jpg'),
(10, 10, 'img/productos/new-balance-550.jpg');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `productos`
--

CREATE TABLE `productos` (
  `id` int(10) UNSIGNED NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `precio` decimal(10,2) NOT NULL DEFAULT 0.00,
  `stock` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `marca` varchar(80) NOT NULL,
  `categoria_id` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `productos`
--

INSERT INTO `productos` (`id`, `nombre`, `descripcion`, `precio`, `stock`, `marca`, `categoria_id`) VALUES
(1, 'Nike Air Force 1 07', 'Zapatillas urbanas Nike Air Force 1 07, modelo clásico para uso diario.', 549.90, 8, 'Nike', 1),
(2, 'Nike Dunk Low Retro', 'Zapatillas Nike Dunk Low Retro de perfil bajo y estilo urbano.', 549.90, 6, 'Nike', 1),
(3, 'adidas Supernova Running 3', 'Zapatillas adidas para carreras diarias y entrenamiento.', 459.00, 7, 'adidas', 2),
(4, 'adidas Ultraboost 5', 'Zapatillas adidas de running con amortiguación BOOST.', 649.00, 5, 'adidas', 2),
(5, 'Nike G.T. Hustle Academy', 'Zapatillas Nike diseñadas para jugar básquet y entrenar en cancha.', 429.90, 4, 'Nike', 3),
(6, 'Nike Giannis Immortality 4', 'Zapatillas Nike de básquet inspiradas en el estilo de juego de Giannis.', 379.90, 4, 'Nike', 3),
(7, 'Converse Chuck Taylor All Star Caña Baja', 'Zapatillas clásicas Converse de lona y caña baja.', 259.90, 10, 'Converse', 4),
(8, 'adidas Samba OG', 'Zapatillas adidas Samba OG de inspiración clásica y estilo lifestyle.', 429.00, 5, 'adidas', 4),
(9, 'Air Jordan 1 Retro High OG', 'Zapatillas Jordan de caña alta con diseño icónico inspirado en el básquet.', 819.90, 3, 'Jordan', 5),
(10, 'New Balance 550', 'Zapatillas New Balance 550 de inspiración deportiva retro y perfil bajo.', 499.90, 4, 'New Balance', 5);

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `categorias`
--
ALTER TABLE `categorias`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nombre` (`nombre`);

--
-- Indices de la tabla `imagenes`
--
ALTER TABLE `imagenes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_imagenes_producto` (`producto_id`);

--
-- Indices de la tabla `productos`
--
ALTER TABLE `productos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_productos_nombre` (`nombre`),
  ADD KEY `idx_productos_marca` (`marca`),
  ADD KEY `idx_productos_categoria` (`categoria_id`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `categorias`
--
ALTER TABLE `categorias`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `imagenes`
--
ALTER TABLE `imagenes`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de la tabla `productos`
--
ALTER TABLE `productos`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `imagenes`
--
ALTER TABLE `imagenes`
  ADD CONSTRAINT `fk_imagenes_productos` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `productos`
--
ALTER TABLE `productos`
  ADD CONSTRAINT `fk_productos_categorias` FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id`) ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
