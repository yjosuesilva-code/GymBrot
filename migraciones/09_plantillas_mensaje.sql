-- PLANTILLAS_MENSAJE: id_gimnasio NULL = plantilla del sistema (10 registros)
INSERT INTO plantillas_mensaje (id_plantilla, id_gimnasio, nombre, tipo, asunto, cuerpo_html, cuerpo_texto, variables_disponibles, activa) VALUES
(1, NULL, 'Bienvenida', 'EMAIL', 'Bienvenido a {gimnasio}', '<p>Hola {nombre}, te damos la bienvenida a {gimnasio}.</p>', 'Hola {nombre}, te damos la bienvenida a {gimnasio}.', '{nombre},{gimnasio}', TRUE),
(2, NULL, 'Recordatorio de vencimiento', 'EMAIL', 'Tu membresía vence pronto', '<p>{nombre}, tu plan {plan} vence el {fecha_vencimiento}.</p>', '{nombre}, tu plan {plan} vence el {fecha_vencimiento}.', '{nombre},{plan},{fecha_vencimiento}', TRUE),
(3, NULL, 'Confirmación de cita', 'SMS', NULL, NULL, 'Hola {nombre}, tu cita es el {fecha} a las {hora} con {instructor}.', '{nombre},{fecha},{hora},{instructor}', TRUE),
(4, NULL, 'Pago recibido', 'EMAIL', 'Recibimos tu pago', '<p>{nombre}, recibimos tu pago de {valor}. ¡Gracias!</p>', '{nombre}, recibimos tu pago de {valor}. ¡Gracias!', '{nombre},{valor}', TRUE),
(5, NULL, 'Feliz cumpleaños', 'SMS', NULL, NULL, '¡Feliz cumpleaños, {nombre}! Hoy tu entrada es con un invitado.', '{nombre}', FALSE),
(6, 1, 'Promoción Iron Gym Valledupar', 'EMAIL', 'Trae a un amigo y gana un mes', '<p>{nombre}, refiere a un amigo y recibe un mes gratis.</p>', '{nombre}, refiere a un amigo y recibe un mes gratis.', '{nombre}', TRUE),
(7, 2, 'Promoción Titan Fit', 'EMAIL', 'Trae a un amigo y gana un mes', '<p>{nombre}, refiere a un amigo y recibe un mes gratis.</p>', '{nombre}, refiere a un amigo y recibe un mes gratis.', '{nombre}', TRUE),
(8, 3, 'Promoción Pulso Gym', 'EMAIL', 'Trae a un amigo y gana un mes', '<p>{nombre}, refiere a un amigo y recibe un mes gratis.</p>', '{nombre}, refiere a un amigo y recibe un mes gratis.', '{nombre}', TRUE),
(9, 4, 'Promoción Cuerpo Activo', 'EMAIL', 'Trae a un amigo y gana un mes', '<p>{nombre}, refiere a un amigo y recibe un mes gratis.</p>', '{nombre}, refiere a un amigo y recibe un mes gratis.', '{nombre}', TRUE),
(10, 5, 'Promoción Zona Fit', 'EMAIL', 'Trae a un amigo y gana un mes', '<p>{nombre}, refiere a un amigo y recibe un mes gratis.</p>', '{nombre}, refiere a un amigo y recibe un mes gratis.', '{nombre}', FALSE);

SELECT setval(pg_get_serial_sequence('plantillas_mensaje', 'id_plantilla'), (SELECT MAX(id_plantilla) FROM plantillas_mensaje));
