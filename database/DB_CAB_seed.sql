/* =====================================================================
   DB_CAB — Seed de inserciones iniciales
   ===================================================================== */

USE DB_CAB;
GO
SET NOCOUNT ON;

/* ========================
   1) CATÁLOGOS BASE
   ======================== */
-- Departamentos
IF NOT EXISTS (SELECT 1 FROM cab.departamentos WHERE id_departamento=1)
  INSERT INTO cab.departamentos (id_departamento,nombre) VALUES (1,'Guatemala');
IF NOT EXISTS (SELECT 1 FROM cab.departamentos WHERE id_departamento=2)
  INSERT INTO cab.departamentos (id_departamento,nombre) VALUES (2,'Sacatepéquez');

-- Municipios
IF NOT EXISTS (SELECT 1 FROM cab.municipios WHERE id_departamento=1 AND nombre='Guatemala')
  INSERT INTO cab.municipios (id_departamento,nombre) VALUES (1,'Guatemala');
IF NOT EXISTS (SELECT 1 FROM cab.municipios WHERE id_departamento=1 AND nombre='Mixco')
  INSERT INTO cab.municipios (id_departamento,nombre) VALUES (1,'Mixco');
IF NOT EXISTS (SELECT 1 FROM cab.municipios WHERE id_departamento=2 AND nombre='Antigua Guatemala')
  INSERT INTO cab.municipios (id_departamento,nombre) VALUES (2,'Antigua Guatemala');

DECLARE @munGuatemala INT = (SELECT id_municipio FROM cab.municipios WHERE id_departamento=1 AND nombre='Guatemala');
DECLARE @munMixco    INT = (SELECT id_municipio FROM cab.municipios WHERE id_departamento=1 AND nombre='Mixco');
DECLARE @munAntigua  INT = (SELECT id_municipio FROM cab.municipios WHERE id_departamento=2 AND nombre='Antigua Guatemala');

-- Comunidades
IF NOT EXISTS (SELECT 1 FROM cab.comunidades WHERE id_municipio=@munGuatemala AND nombre='Zona 1')
  INSERT INTO cab.comunidades (id_municipio,nombre,area) VALUES (@munGuatemala,'Zona 1','Urbana');
IF NOT EXISTS (SELECT 1 FROM cab.comunidades WHERE id_municipio=@munMixco AND nombre='San Cristóbal')
  INSERT INTO cab.comunidades (id_municipio,nombre,area) VALUES (@munMixco,'San Cristóbal','Urbana');
IF NOT EXISTS (SELECT 1 FROM cab.comunidades WHERE id_municipio=@munAntigua AND nombre='Centro Histórico')
  INSERT INTO cab.comunidades (id_municipio,nombre,area) VALUES (@munAntigua,'Centro Histórico','Urbana');

-- Grupos focales
IF NOT EXISTS (SELECT 1 FROM cab.grupos_focales WHERE nombre='Embarazadas')
  INSERT INTO cab.grupos_focales (nombre) VALUES ('Embarazadas');
IF NOT EXISTS (SELECT 1 FROM cab.grupos_focales WHERE nombre='Menor de 6 meses')
  INSERT INTO cab.grupos_focales (nombre) VALUES ('Menor de 6 meses');
IF NOT EXISTS (SELECT 1 FROM cab.grupos_focales WHERE nombre='6 a 24 meses')
  INSERT INTO cab.grupos_focales (nombre) VALUES ('6 a 24 meses');

DECLARE @gfMenor6 TINYINT = (SELECT id_grupo_focal FROM cab.grupos_focales WHERE nombre='Menor de 6 meses');

-- Categorías
IF NOT EXISTS (SELECT 1 FROM cab.categorias_preguntas WHERE nombre='Salud')
  INSERT INTO cab.categorias_preguntas (nombre) VALUES ('Salud');
IF NOT EXISTS (SELECT 1 FROM cab.categorias_preguntas WHERE nombre='Nutrición')
  INSERT INTO cab.categorias_preguntas (nombre) VALUES ('Nutrición');

DECLARE @catSalud TINYINT = (SELECT id_categoria_pregunta FROM cab.categorias_preguntas WHERE nombre='Salud');
DECLARE @catNutri TINYINT = (SELECT id_categoria_pregunta FROM cab.categorias_preguntas WHERE nombre='Nutrición');

IF NOT EXISTS (SELECT 1 FROM cab.subcategorias_preguntas WHERE id_categoria_pregunta=@catSalud AND nombre='Control prenatal')
  INSERT INTO cab.subcategorias_preguntas (id_categoria_pregunta,nombre) VALUES (@catSalud,'Control prenatal');
IF NOT EXISTS (SELECT 1 FROM cab.subcategorias_preguntas WHERE id_categoria_pregunta=@catNutri AND nombre='Lactancia')
  INSERT INTO cab.subcategorias_preguntas (id_categoria_pregunta,nombre) VALUES (@catNutri,'Lactancia');

/* ========================
   2) USUARIOS
   ======================== */
-- Usuario admin con contraseña: admin123
IF NOT EXISTS (SELECT 1 FROM cab.usuarios WHERE correo='admin@cab.local')
  INSERT INTO cab.usuarios (nombre,correo,pass_hash,rol,activo)
  VALUES ('Admin CAB','admin@cab.local','$2b$10$m6M61BhGKEK7LnWP6YU8Re.z2vDyNBebwulE7D7zfiCb/1ButMKvK','Admin',1);
--admin123 contraseña para probar

/* ========================
   3) ENCUESTA DE EJEMPLO
   ======================== */
IF NOT EXISTS (SELECT 1 FROM cab.encuestas WHERE titulo='Encuesta Nutrición 2025' AND version='1.0')
  INSERT INTO cab.encuestas (titulo,descripcion,id_grupo_focal,version,estado,vigente_desde)
  VALUES ('Encuesta Nutrición 2025','Encuesta de prueba para nutrición infantil',@gfMenor6,'1.0','Activa',GETDATE());

DECLARE @enc BIGINT = (SELECT id_encuesta FROM cab.encuestas WHERE titulo='Encuesta Nutrición 2025' AND version='1.0');

-- Preguntas
IF NOT EXISTS (SELECT 1 FROM cab.preguntas WHERE id_encuesta=@enc AND orden=1)
  INSERT INTO cab.preguntas (id_encuesta,id_categoria_pregunta,texto,tipo,requerida,orden,puntaje_maximo)
  VALUES (@enc,@catSalud,N'¿Recibió control de crecimiento en el último mes?','SiNo',1,1,10);

IF NOT EXISTS (SELECT 1 FROM cab.preguntas WHERE id_encuesta=@enc AND orden=2)
  INSERT INTO cab.preguntas (id_encuesta,id_categoria_pregunta,texto,tipo,requerida,orden,puntaje_maximo)
  VALUES (@enc,@catNutri,'Estado nutricional percibido','OpcionUnica',1,2,10);

DECLARE @q1 BIGINT = (SELECT id_pregunta FROM cab.preguntas WHERE id_encuesta=@enc AND orden=1);
DECLARE @q2 BIGINT = (SELECT id_pregunta FROM cab.preguntas WHERE id_encuesta=@enc AND orden=2);

-- Opciones
IF NOT EXISTS (SELECT 1 FROM cab.preguntas_opciones WHERE id_pregunta=@q1 AND valor='SI')
  INSERT INTO cab.preguntas_opciones (id_pregunta,etiqueta,valor,puntos,orden,condicional)
  VALUES (@q1,'Sí','SI',10,1,0);
IF NOT EXISTS (SELECT 1 FROM cab.preguntas_opciones WHERE id_pregunta=@q1 AND valor='NO')
  INSERT INTO cab.preguntas_opciones (id_pregunta,etiqueta,valor,puntos,orden,condicional)
  VALUES (@q1,'No','NO',0,2,0);

IF NOT EXISTS (SELECT 1 FROM cab.preguntas_opciones WHERE id_pregunta=@q2 AND valor='BUENO')
  INSERT INTO cab.preguntas_opciones (id_pregunta,etiqueta,valor,puntos,orden,condicional)
  VALUES (@q2,'Bueno','BUENO',10,1,0);
IF NOT EXISTS (SELECT 1 FROM cab.preguntas_opciones WHERE id_pregunta=@q2 AND valor='REGULAR')
  INSERT INTO cab.preguntas_opciones (id_pregunta,etiqueta,valor,puntos,orden,condicional)
  VALUES (@q2,'Regular','REGULAR',5,2,0);
IF NOT EXISTS (SELECT 1 FROM cab.preguntas_opciones WHERE id_pregunta=@q2 AND valor='MALO')
  INSERT INTO cab.preguntas_opciones (id_pregunta,etiqueta,valor,puntos,orden,condicional)
  VALUES (@q2,'Malo','MALO',0,3,0);

/* ========================
   4) RESPUESTA DE EJEMPLO
   ======================== */
DECLARE @comGuate INT = (SELECT id_comunidad FROM cab.comunidades WHERE nombre='Zona 1' AND id_municipio=@munGuatemala);
DECLARE @admin    BIGINT = (SELECT id_usuario FROM cab.usuarios WHERE correo='admin@cab.local');

IF NOT EXISTS (SELECT 1 FROM cab.respuestas WHERE boleta_num=1000001)
  INSERT INTO cab.respuestas (boleta_num,id_encuesta,id_comunidad,id_usuario,estado)
  VALUES (1000001,@enc,@comGuate,@admin,'Enviada');

DECLARE @resp BIGINT = (SELECT id_respuesta FROM cab.respuestas WHERE boleta_num=1000001);
DECLARE @optQ1_SI BIGINT = (SELECT id_opcion FROM cab.preguntas_opciones WHERE id_pregunta=@q1 AND valor='SI');
DECLARE @optQ2_REG BIGINT = (SELECT id_opcion FROM cab.preguntas_opciones WHERE id_pregunta=@q2 AND valor='REGULAR');

IF NOT EXISTS (SELECT 1 FROM cab.respuestas_detalle WHERE id_respuesta=@resp AND id_pregunta=@q1)
  INSERT INTO cab.respuestas_detalle (id_respuesta,id_pregunta,id_opcion,valor_numerico,puntos,puntaje_0a10)
  VALUES (@resp,@q1,@optQ1_SI,NULL,10,0);

IF NOT EXISTS (SELECT 1 FROM cab.respuestas_detalle WHERE id_respuesta=@resp AND id_pregunta=@q2)
  INSERT INTO cab.respuestas_detalle (id_respuesta,id_pregunta,id_opcion,valor_numerico,puntos,puntaje_0a10)
  VALUES (@resp,@q2,@optQ2_REG,NULL,5,0);

PRINT 'Seed DB_CAB completado.';
GO