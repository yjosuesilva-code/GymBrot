-- ESPECIALIDADES: catálogo (8 registros)
INSERT INTO especialidades (id_especialidad, nombre) VALUES
(1, 'Entrenamiento funcional'),
(2, 'Musculación'),
(3, 'Cardio y resistencia'),
(4, 'Nutrición deportiva'),
(5, 'Yoga y movilidad'),
(6, 'CrossFit'),
(7, 'Rehabilitación física'),
(8, 'Entrenamiento de fuerza');

SELECT setval(pg_get_serial_sequence('especialidades', 'id_especialidad'), (SELECT MAX(id_especialidad) FROM especialidades));
