-- GIMNASIOS: tenants (5 registros)
INSERT INTO gimnasios (id_gimnasio, slug, nombre, ciudad, telefono, plan_software, estado, fecha_registro, vence_suscripcion) VALUES
(1, 'iron-gym-valledupar', 'Iron Gym Valledupar', 'Valledupar', '3001234567', 'PRO', 'ACTIVO', '2025-01-15', '2027-01-15'),
(2, 'titan-fit', 'Titan Fit', 'Valledupar', '3012345678', 'BASICO', 'ACTIVO', '2025-03-01', '2026-12-01'),
(3, 'pulso-gym', 'Pulso Gym', 'Aguachica', '3023456789', 'PREMIUM', 'ACTIVO', '2025-04-10', '2027-04-10'),
(4, 'cuerpo-activo', 'Cuerpo Activo', 'Santa Marta', '3034567890', 'PRO', 'ACTIVO', '2025-05-20', '2026-11-20'),
(5, 'zona-fit', 'Zona Fit', 'Barranquilla', '3045678901', 'BASICO', 'SUSPENDIDO', '2025-06-01', '2026-09-30');

SELECT setval(pg_get_serial_sequence('gimnasios', 'id_gimnasio'), (SELECT MAX(id_gimnasio) FROM gimnasios));
