-- SQL compatible MySQL / MariaDB
-- Crea la tabla users y luego los índices (ejecutar todo junto en phpMyAdmin -> SQL)

DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `apodo` VARCHAR(100) NOT NULL,
  `contrasena_hash` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `nombre` VARCHAR(150) DEFAULT NULL,
  `apellido` VARCHAR(150) DEFAULT NULL,
  `fecha_nacimiento` DATE DEFAULT NULL,
  `carrera` VARCHAR(150) DEFAULT NULL,
  `descripcion_personal` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crear índices (ahora las columnas existen)
CREATE INDEX `idx_users_apodo` ON `users` (`apodo`);
CREATE INDEX `idx_users_email` ON `users` (`email`);
