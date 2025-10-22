/* =====================================================================
   DB_CAB · Esquema de Encuestas 
   ===================================================================== */

-- (1) RESETEO SEGURO (opcional): Elimina y crea limpia la BD
IF DB_ID('DB_CAB') IS NOT NULL
BEGIN
  ALTER DATABASE DB_CAB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
  DROP DATABASE DB_CAB;
END
GO

CREATE DATABASE DB_CAB;
GO

USE DB_CAB;
GO

/* =====================================================================
   (2) ESQUEMA
   ===================================================================== */
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'cab')
  EXEC('CREATE SCHEMA cab');
GO


/* =====================================================================
   (3) CATÁLOGOS BASE
   ===================================================================== */

-- 3.1 Catálogo de Locks para catálogos
IF OBJECT_ID('cab.catalogo_lock','U') IS NOT NULL DROP TABLE cab.catalogo_lock;
CREATE TABLE cab.catalogo_lock (
  tabla          VARCHAR(40)  NOT NULL PRIMARY KEY,                          -- 'departamentos' | 'municipios'
  max_rows       INT          NULL,                                          -- NULL = sin tope
  locked         BIT          NOT NULL CONSTRAINT DF_catalogo_lock_locked DEFAULT (0),
  actualizado_en DATETIME2(0) NOT NULL CONSTRAINT DF_catalogo_lock_upd DEFAULT (SYSDATETIME())
);
GO

-- 3.2 Departamentos (PK manual 1..22)
IF OBJECT_ID('cab.departamentos','U') IS NOT NULL DROP TABLE cab.departamentos;
CREATE TABLE cab.departamentos (
  id_departamento  SMALLINT     NOT NULL PRIMARY KEY,                         -- PK manual (códigos oficiales)
  nombre           VARCHAR(80)  NOT NULL CONSTRAINT UQ_depto_nombre UNIQUE,
  CONSTRAINT CK_depto_nombre_notblank CHECK (LEN(LTRIM(RTRIM(nombre))) > 0)
);
GO

-- 3.3 Municipios
IF OBJECT_ID('cab.municipios','U') IS NOT NULL DROP TABLE cab.municipios;
CREATE TABLE cab.municipios (
  id_municipio     INT          NOT NULL IDENTITY(1,1) PRIMARY KEY,
  id_departamento  SMALLINT     NOT NULL
      CONSTRAINT FK_muni_depto REFERENCES cab.departamentos(id_departamento),
  nombre           VARCHAR(80)  NOT NULL,
  CONSTRAINT UQ_muni_depto_nombre UNIQUE (id_departamento, nombre),
  CONSTRAINT CK_muni_nombre_notblank CHECK (LEN(LTRIM(RTRIM(nombre))) > 0)
);
GO
CREATE INDEX IX_municipios_depto ON cab.municipios(id_departamento);
GO

-- 3.4 Comunidades
IF OBJECT_ID('cab.comunidades','U') IS NOT NULL DROP TABLE cab.comunidades;
CREATE TABLE cab.comunidades (
  id_comunidad  INT           NOT NULL IDENTITY(1,1) PRIMARY KEY,
  id_municipio  INT           NOT NULL
      CONSTRAINT FK_comu_muni REFERENCES cab.municipios(id_municipio) ON DELETE CASCADE,
  nombre        VARCHAR(120)  NOT NULL,
  area          VARCHAR(10)   NOT NULL
      CONSTRAINT CK_comu_area CHECK (area IN ('Urbana','Rural')),
  CONSTRAINT UQ_comu_muni_nombre UNIQUE (id_municipio, nombre),
  CONSTRAINT CK_comu_nombre_notblank CHECK (LEN(LTRIM(RTRIM(nombre))) > 0)
);
GO
CREATE INDEX IX_comunidades_muni ON cab.comunidades(id_municipio);
GO

-- 3.5 Grupos focales
IF OBJECT_ID('cab.grupos_focales','U') IS NOT NULL DROP TABLE cab.grupos_focales;
CREATE TABLE cab.grupos_focales (
  id_grupo_focal  TINYINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  nombre          VARCHAR(60)  NOT NULL UNIQUE
);
GO

-- 3.6 Categorías y subcategorías de preguntas
IF OBJECT_ID('cab.subcategorias_preguntas','U') IS NOT NULL DROP TABLE cab.subcategorias_preguntas;
IF OBJECT_ID('cab.categorias_preguntas','U') IS NOT NULL DROP TABLE cab.categorias_preguntas;

CREATE TABLE cab.categorias_preguntas (
  id_categoria_pregunta  TINYINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  nombre                 VARCHAR(60)  NOT NULL UNIQUE
);
GO

CREATE TABLE cab.subcategorias_preguntas (
  id_subcategoria         TINYINT IDENTITY(1,1) PRIMARY KEY,
  id_categoria_pregunta   TINYINT NOT NULL
     CONSTRAINT FK_subcat_categoria REFERENCES cab.categorias_preguntas(id_categoria_pregunta),
  nombre                  VARCHAR(60) NOT NULL,
  CONSTRAINT UQ_subcat_categoria UNIQUE(id_categoria_pregunta, nombre)
);
GO


/* =====================================================================
   (4) TRIGGERS de control para catálogos (departamentos/municipios)
   ===================================================================== */

-- Helpers: asegurar filas base en catalogo_lock
IF NOT EXISTS (SELECT 1 FROM cab.catalogo_lock WHERE tabla='departamentos')
  INSERT INTO cab.catalogo_lock(tabla, max_rows, locked) VALUES('departamentos', NULL, 0);
IF NOT EXISTS (SELECT 1 FROM cab.catalogo_lock WHERE tabla='municipios')
  INSERT INTO cab.catalogo_lock(tabla, max_rows, locked) VALUES('municipios', NULL, 0);
GO

-- Departamentos: INSERT guard
IF OBJECT_ID('cab.tg_departamentos_ins_guard','TR') IS NOT NULL DROP TRIGGER cab.tg_departamentos_ins_guard;
GO
CREATE TRIGGER cab.tg_departamentos_ins_guard
ON cab.departamentos
AFTER INSERT
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @locked BIT, @max INT;
  SELECT @locked = locked, @max = max_rows
  FROM cab.catalogo_lock WITH (UPDLOCK, HOLDLOCK)
  WHERE tabla = 'departamentos';

  IF ISNULL(@locked,0)=1
  BEGIN ROLLBACK; THROW 51010, N'Altas bloqueadas para DEPARTAMENTOS (locked=1).', 1; END;

  DECLARE @total INT; SELECT @total = COUNT(*) FROM cab.departamentos WITH (UPDLOCK, HOLDLOCK);
  IF @max IS NOT NULL AND @total > @max
  BEGIN
    DECLARE @msg NVARCHAR(200) = FORMATMESSAGE(N'Se superó el máximo permitido de DEPARTAMENTOS (%d).', @max);
    ROLLBACK; THROW 51011, @msg, 1;
  END;

  UPDATE cab.catalogo_lock SET actualizado_en = SYSDATETIME() WHERE tabla='departamentos';
END;
GO

-- Departamentos: DELETE guard
IF OBJECT_ID('cab.tg_departamentos_del_guard','TR') IS NOT NULL DROP TRIGGER cab.tg_departamentos_del_guard;
GO
CREATE TRIGGER cab.tg_departamentos_del_guard
ON cab.departamentos
AFTER DELETE
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @locked BIT;
  SELECT @locked = locked FROM cab.catalogo_lock WITH (UPDLOCK, HOLDLOCK) WHERE tabla='departamentos';
  IF ISNULL(@locked,0)=1
  BEGIN ROLLBACK; THROW 51012, N'Bajas bloqueadas para DEPARTAMENTOS (locked=1).', 1; END;
  UPDATE cab.catalogo_lock SET actualizado_en = SYSDATETIME() WHERE tabla='departamentos';
END;
GO

-- Departamentos: UPDATE guard
IF OBJECT_ID('cab.tg_departamentos_upd_guard','TR') IS NOT NULL DROP TRIGGER cab.tg_departamentos_upd_guard;
GO
CREATE TRIGGER cab.tg_departamentos_upd_guard
ON cab.departamentos
AFTER UPDATE
AS
BEGIN
  SET NOCOUNT ON;
  IF UPDATE(id_departamento)
  BEGIN ROLLBACK; THROW 51013, N'No se permite actualizar id_departamento en DEPARTAMENTOS.', 1; END;

  DECLARE @locked BIT;
  SELECT @locked = locked FROM cab.catalogo_lock WITH (UPDLOCK, HOLDLOCK) WHERE tabla='departamentos';
  IF ISNULL(@locked,0)=1
  BEGIN ROLLBACK; THROW 51014, N'Cambios bloqueados para DEPARTAMENTOS (locked=1).', 1; END;

  UPDATE cab.catalogo_lock SET actualizado_en = SYSDATETIME() WHERE tabla='departamentos';
END;
GO

-- Municipios: INSERT guard
IF OBJECT_ID('cab.tg_municipios_ins_guard','TR') IS NOT NULL DROP TRIGGER cab.tg_municipios_ins_guard;
GO
CREATE TRIGGER cab.tg_municipios_ins_guard
ON cab.municipios
AFTER INSERT
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @locked BIT, @max INT;
  SELECT @locked = locked, @max = max_rows
  FROM cab.catalogo_lock WITH (UPDLOCK, HOLDLOCK)
  WHERE tabla = 'municipios';

  IF ISNULL(@locked,0)=1
  BEGIN ROLLBACK; THROW 51020, N'Altas bloqueadas para MUNICIPIOS (locked=1).', 1; END;

  DECLARE @total INT; SELECT @total = COUNT(*) FROM cab.municipios WITH (UPDLOCK, HOLDLOCK);
  IF @max IS NOT NULL AND @total > @max
  BEGIN
    DECLARE @msg NVARCHAR(200) = FORMATMESSAGE(N'Se superó el máximo permitido de MUNICIPIOS (%d).', @max);
    ROLLBACK; THROW 51021, @msg, 1;
  END;

  UPDATE cab.catalogo_lock SET actualizado_en = SYSDATETIME() WHERE tabla='municipios';
END;
GO

-- Municipios: DELETE guard
IF OBJECT_ID('cab.tg_municipios_del_guard','TR') IS NOT NULL DROP TRIGGER cab.tg_municipios_del_guard;
GO
CREATE TRIGGER cab.tg_municipios_del_guard
ON cab.municipios
AFTER DELETE
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @locked BIT; SELECT @locked = locked FROM cab.catalogo_lock WITH (UPDLOCK, HOLDLOCK) WHERE tabla='municipios';
  IF ISNULL(@locked,0)=1
  BEGIN ROLLBACK; THROW 51022, N'Bajas bloqueadas para MUNICIPIOS (locked=1).', 1; END;
  UPDATE cab.catalogo_lock SET actualizado_en = SYSDATETIME() WHERE tabla='municipios';
END;
GO

-- Municipios: UPDATE guard
IF OBJECT_ID('cab.tg_municipios_upd_guard','TR') IS NOT NULL DROP TRIGGER cab.tg_municipios_upd_guard;
GO
CREATE TRIGGER cab.tg_municipios_upd_guard
ON cab.municipios
AFTER UPDATE
AS
BEGIN
  SET NOCOUNT ON;
  IF UPDATE(id_municipio)
  BEGIN ROLLBACK; THROW 51023, N'No se permite actualizar id_municipio en MUNICIPIOS.', 1; END;

  DECLARE @locked BIT; SELECT @locked = locked FROM cab.catalogo_lock WITH (UPDLOCK, HOLDLOCK) WHERE tabla='municipios';
  IF ISNULL(@locked,0)=1
  BEGIN ROLLBACK; THROW 51024, N'Cambios bloqueados para MUNICIPIOS (locked=1).', 1; END;

  UPDATE cab.catalogo_lock SET actualizado_en = SYSDATETIME() WHERE tabla='municipios';
END;
GO


/* =====================================================================
   (5) SEGURIDAD / ENCUESTAS / PREGUNTAS / RESPUESTAS
   ===================================================================== */

-- Usuarios
IF OBJECT_ID('cab.usuarios','U') IS NOT NULL DROP TABLE cab.usuarios;
CREATE TABLE cab.usuarios (
  id_usuario  BIGINT        NOT NULL IDENTITY(1,1) PRIMARY KEY,
  nombre      VARCHAR(120)  NOT NULL,
  correo      VARCHAR(120)  NOT NULL UNIQUE,
  pass_hash   VARCHAR(255)  NOT NULL,
  rol         VARCHAR(20)   NOT NULL
               CONSTRAINT CK_usuarios_rol CHECK (rol IN ('Admin','Encuestador')),
  activo      BIT           NOT NULL CONSTRAINT DF_usuarios_activo DEFAULT (1),
  creado_en   DATETIME2(0)  NOT NULL CONSTRAINT DF_usuarios_creado DEFAULT (SYSDATETIME())
);
GO

-- Encuestas
IF OBJECT_ID('cab.encuestas','U') IS NOT NULL DROP TABLE cab.encuestas;
CREATE TABLE cab.encuestas (
  id_encuesta       BIGINT        NOT NULL IDENTITY(1,1) PRIMARY KEY,
  titulo            VARCHAR(120)  NOT NULL,
  descripcion       VARCHAR(500)  NULL,
  id_grupo_focal    TINYINT       NOT NULL
                    CONSTRAINT FK_encuestas_grupofocal REFERENCES cab.grupos_focales(id_grupo_focal),
  version           VARCHAR(10)   NOT NULL,
  estado            VARCHAR(10)   NOT NULL
                    CONSTRAINT CK_encuestas_estado CHECK (estado IN ('Activa','Inactiva'))
                    CONSTRAINT DF_encuestas_estado DEFAULT ('Inactiva'),
  vigente_desde     DATE          NULL,
  vigente_hasta     DATE          NULL,
  creado_en         DATETIME2(0)  NOT NULL CONSTRAINT DF_encuestas_creado DEFAULT (SYSDATETIME()),
  CONSTRAINT UQ_encuestas_titulo_version UNIQUE (titulo, version)
);
GO

-- Preguntas
IF OBJECT_ID('cab.preguntas','U') IS NOT NULL DROP TABLE cab.preguntas;
CREATE TABLE cab.preguntas (
  id_pregunta           BIGINT       NOT NULL IDENTITY(1,1) PRIMARY KEY,
  id_encuesta           BIGINT       NOT NULL
      CONSTRAINT FK_preguntas_encuesta REFERENCES cab.encuestas(id_encuesta),
  id_categoria_pregunta TINYINT      NULL
      CONSTRAINT FK_preguntas_categoria REFERENCES cab.categorias_preguntas(id_categoria_pregunta),
  texto                 VARCHAR(300) NOT NULL,
  tipo                  VARCHAR(20)  NOT NULL
      CONSTRAINT CK_preguntas_tipo CHECK (
        tipo IN ('OpcionUnica','OpcionMultiple','Numerica','SiNo','Fecha','Texto')
      ),
  requerida             BIT          NOT NULL CONSTRAINT DF_preguntas_requerida DEFAULT (1),
  orden                 INT          NOT NULL,
  puntaje_maximo        INT          NOT NULL CONSTRAINT DF_preguntas_pmax DEFAULT (100),
  CONSTRAINT UQ_preguntas_encuesta_orden UNIQUE (id_encuesta, orden)
);
GO
CREATE INDEX IX_preguntas_categoria ON cab.preguntas(id_categoria_pregunta);
CREATE INDEX IX_preguntas_encuesta  ON cab.preguntas(id_encuesta, orden);
GO

-- Preguntas opciones
IF OBJECT_ID('cab.preguntas_opciones','U') IS NOT NULL DROP TABLE cab.preguntas_opciones;
CREATE TABLE cab.preguntas_opciones (
  id_opcion BIGINT IDENTITY(1,1) PRIMARY KEY,
  id_pregunta BIGINT NOT NULL
      CONSTRAINT FK_opcion_pregunta REFERENCES cab.preguntas(id_pregunta),
  etiqueta VARCHAR(200) NOT NULL,
  valor    VARCHAR(50)  NOT NULL,
  puntos   INT          NULL,
  orden    INT          NOT NULL,
  condicional BIT NOT NULL DEFAULT(0),
  condicional_pregunta_id BIGINT NULL
      CONSTRAINT FK_opcion_condicional REFERENCES cab.preguntas(id_pregunta),
  CONSTRAINT UQ_opcion UNIQUE(id_pregunta,valor)
);
GO

-- Respuestas (encabezado)
IF OBJECT_ID('cab.respuestas','U') IS NOT NULL DROP TABLE cab.respuestas;
CREATE TABLE cab.respuestas (
  id_respuesta     BIGINT        NOT NULL IDENTITY(1,1) PRIMARY KEY,
  boleta_num       BIGINT        NOT NULL,
  id_encuesta      BIGINT        NOT NULL
                   CONSTRAINT FK_resp_encuesta    REFERENCES cab.encuestas(id_encuesta),
  id_comunidad     INT           NOT NULL
                   CONSTRAINT FK_resp_comunidad   REFERENCES cab.comunidades(id_comunidad),
  id_usuario       BIGINT        NOT NULL
                   CONSTRAINT FK_resp_usuario     REFERENCES cab.usuarios(id_usuario),
  aplicada_en      DATETIME2(0)  NOT NULL CONSTRAINT DF_respuestas_aplicada DEFAULT (SYSDATETIME()),
  estado           VARCHAR(10)   NOT NULL
                   CONSTRAINT CK_respuestas_estado CHECK (estado IN ('Enviada','Anulada'))
                   CONSTRAINT DF_respuestas_estado DEFAULT ('Enviada'),
  anulada_motivo   VARCHAR(300)  NULL,
  anulada_por      BIGINT        NULL,   -- (FK lógica a cab.usuarios)
  anulada_en       DATETIME2(0)  NULL,
  CONSTRAINT UQ_respuestas_boleta UNIQUE (boleta_num)
);
GO
CREATE INDEX IX_respuestas_encuesta_aplicada  ON cab.respuestas (id_encuesta, aplicada_en);
CREATE INDEX IX_respuestas_comunidad_aplicada ON cab.respuestas (id_comunidad, aplicada_en);
GO

-- Bitácora de respuestas
IF OBJECT_ID('cab.bitacora_respuestas','U') IS NOT NULL DROP TABLE cab.bitacora_respuestas;
CREATE TABLE cab.bitacora_respuestas (
  id_bitacora      BIGINT        NOT NULL IDENTITY(1,1) PRIMARY KEY,
  id_respuesta     BIGINT        NOT NULL
                   CONSTRAINT FK_bitacora_respuesta REFERENCES cab.respuestas(id_respuesta) ON DELETE CASCADE,
  accion           VARCHAR(30)   NOT NULL,     -- 'CREADA','ANULADA','ACTUALIZADA',...
  detalle          VARCHAR(400)  NULL,
  id_usuario       BIGINT        NULL,
  fecha_evento     DATETIME2(0)  NOT NULL CONSTRAINT DF_bitacora_fecha DEFAULT (SYSDATETIME())
);
GO


/* =====================================================================
   (6) TRIGGERS de Respuestas (encabezado)
   ===================================================================== */

-- Transiciones de estado válidas
IF OBJECT_ID('cab.tg_respuestas_transicion','TR') IS NOT NULL DROP TRIGGER cab.tg_respuestas_transicion;
GO
CREATE TRIGGER cab.tg_respuestas_transicion
ON cab.respuestas
AFTER UPDATE
AS
BEGIN
  SET NOCOUNT ON;
  IF NOT UPDATE(estado) RETURN;

  IF EXISTS (
    SELECT 1
    FROM inserted i
    JOIN deleted  d ON d.id_respuesta = i.id_respuesta
    WHERE (d.estado = 'Anulada' AND i.estado = 'Enviada')  -- No se permite volver atrás
       OR (d.estado NOT IN ('Enviada','Anulada') OR i.estado NOT IN ('Enviada','Anulada'))
  )
  BEGIN
    RAISERROR('Transición de estado no permitida.', 16, 1);
    ROLLBACK TRANSACTION; RETURN;
  END;
END;
GO

-- Prohibir edición de encabezado si ya estaba ANULADA
IF OBJECT_ID('cab.tg_respuestas_noedit_anulada','TR') IS NOT NULL DROP TRIGGER cab.tg_respuestas_noedit_anulada;
GO
CREATE TRIGGER cab.tg_respuestas_noedit_anulada
ON cab.respuestas
AFTER UPDATE
AS
BEGIN
  SET NOCOUNT ON;
  IF EXISTS (
    SELECT 1
    FROM inserted i
    JOIN deleted  d ON d.id_respuesta = i.id_respuesta
    WHERE d.estado = 'Anulada'
      AND (
           ISNULL(i.boleta_num,0)   <> ISNULL(d.boleta_num,0) OR
           ISNULL(i.id_encuesta,0)  <> ISNULL(d.id_encuesta,0) OR
           ISNULL(i.id_comunidad,0) <> ISNULL(d.id_comunidad,0) OR
           ISNULL(i.id_usuario,0)   <> ISNULL(d.id_usuario,0) OR
           ISNULL(i.aplicada_en,'') <> ISNULL(d.aplicada_en,'')
         )
  )
  BEGIN
    RAISERROR('No se puede editar una respuesta ANULADA.', 16, 1);
    ROLLBACK TRANSACTION; RETURN;
  END;
END;
GO

-- Bitácora: insertar CREADA
IF OBJECT_ID('cab.tg_respuestas_ins_bitacora','TR') IS NOT NULL DROP TRIGGER cab.tg_respuestas_ins_bitacora;
GO
CREATE TRIGGER cab.tg_respuestas_ins_bitacora
ON cab.respuestas
AFTER INSERT
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO cab.bitacora_respuestas (id_respuesta, accion, detalle, id_usuario)
  SELECT i.id_respuesta, 'CREADA',
         CONCAT('Boleta ', i.boleta_num, ' creada para encuesta ', i.id_encuesta),
         i.id_usuario
  FROM inserted i;
END;
GO

-- Bitácora: marcar ANULADA
IF OBJECT_ID('cab.tg_respuestas_anula_bitacora','TR') IS NOT NULL DROP TRIGGER cab.tg_respuestas_anula_bitacora;
GO
CREATE TRIGGER cab.tg_respuestas_anula_bitacora
ON cab.respuestas
AFTER UPDATE
AS
BEGIN
  SET NOCOUNT ON;
  IF NOT UPDATE(estado) RETURN;

  INSERT INTO cab.bitacora_respuestas (id_respuesta, accion, detalle, id_usuario)
  SELECT i.id_respuesta, 'ANULADA',
         CONCAT('Motivo: ', ISNULL(i.anulada_motivo,'')),
         i.anulada_por
  FROM inserted i
  JOIN deleted  d ON d.id_respuesta = i.id_respuesta
  WHERE d.estado = 'Enviada' AND i.estado = 'Anulada';
END;
GO


/* =====================================================================
   (7) RESPUESTAS DETALLE + TRIGGERS de normalización
   ===================================================================== */

IF OBJECT_ID('cab.respuestas_detalle','U') IS NOT NULL DROP TABLE cab.respuestas_detalle;
CREATE TABLE cab.respuestas_detalle (
  id_respuesta_detalle  BIGINT         NOT NULL IDENTITY(1,1) PRIMARY KEY,
  id_respuesta          BIGINT         NOT NULL
                        CONSTRAINT FK_rdet_respuesta REFERENCES cab.respuestas(id_respuesta) ON DELETE CASCADE,
  id_pregunta           BIGINT         NOT NULL
                        CONSTRAINT FK_rdet_pregunta  REFERENCES cab.preguntas(id_pregunta),
  id_opcion             BIGINT         NULL
                        CONSTRAINT FK_rdet_opcion    REFERENCES cab.preguntas_opciones(id_opcion),
  valor_numerico        DECIMAL(10,2)  NULL,
  puntos                INT            NOT NULL CONSTRAINT DF_rdet_puntos DEFAULT (0),
  puntaje_0a10          DECIMAL(5,2)   NOT NULL,
  CONSTRAINT UQ_rdet_respuesta_preg UNIQUE (id_respuesta, id_pregunta)
);
GO

-- INSTEAD OF INSERT: ajusta puntos a [0, puntaje_maximo] y calcula 0..10
IF OBJECT_ID('cab.tg_respuestas_detalle_bi','TR') IS NOT NULL DROP TRIGGER cab.tg_respuestas_detalle_bi;
GO
CREATE TRIGGER cab.tg_respuestas_detalle_bi
ON cab.respuestas_detalle
INSTEAD OF INSERT
AS
BEGIN
  SET NOCOUNT ON;

  IF EXISTS (
    SELECT 1
    FROM inserted i
    JOIN cab.preguntas_opciones o ON o.id_opcion = i.id_opcion
    WHERE i.id_opcion IS NOT NULL AND o.id_pregunta <> i.id_pregunta
  )
  BEGIN
    THROW 52001, N'id_opcion no corresponde a la id_pregunta indicada.', 1;
  END;

  INSERT INTO cab.respuestas_detalle (id_respuesta, id_pregunta, id_opcion, valor_numerico, puntos, puntaje_0a10)
  SELECT
    i.id_respuesta,
    i.id_pregunta,
    i.id_opcion,
    i.valor_numerico,
    CASE
      WHEN COALESCE(i.puntos,0) < 0 THEN 0
      WHEN COALESCE(i.puntos,0) > p.puntaje_maximo THEN p.puntaje_maximo
      ELSE COALESCE(i.puntos,0)
    END,
    CAST(
      CASE
        WHEN NULLIF(p.puntaje_maximo,0) IS NULL THEN 0
        ELSE (CAST(
               CASE
                 WHEN COALESCE(i.puntos,0) < 0 THEN 0
                 WHEN COALESCE(i.puntos,0) > p.puntaje_maximo THEN p.puntaje_maximo
                 ELSE COALESCE(i.puntos,0)
               END AS DECIMAL(10,4)
             ) / p.puntaje_maximo) * 10.0
      END
    AS DECIMAL(5,2))
  FROM inserted i
  JOIN cab.preguntas p ON p.id_pregunta = i.id_pregunta;
END;
GO

-- AFTER UPDATE: re-calcula si cambian puntos o id_pregunta
IF OBJECT_ID('cab.tg_respuestas_detalle_bu','TR') IS NOT NULL DROP TRIGGER cab.tg_respuestas_detalle_bu;
GO
CREATE TRIGGER cab.tg_respuestas_detalle_bu
ON cab.respuestas_detalle
AFTER UPDATE
AS
BEGIN
  SET NOCOUNT ON;
  IF NOT (UPDATE(puntos) OR UPDATE(id_pregunta)) RETURN;

  ;WITH C AS (
    SELECT d.id_respuesta_detalle AS id, d.puntos, d.id_pregunta
    FROM cab.respuestas_detalle d
    JOIN inserted i ON i.id_respuesta_detalle = d.id_respuesta_detalle
  )
  UPDATE d
     SET puntos =
           CASE
             WHEN C.puntos < 0 THEN 0
             WHEN C.puntos > p.puntaje_maximo THEN p.puntaje_maximo
             ELSE C.puntos
           END,
         puntaje_0a10 =
           CAST(
             CASE
               WHEN NULLIF(p.puntaje_maximo,0) IS NULL THEN 0
               ELSE (CAST(
                      CASE
                        WHEN C.puntos < 0 THEN 0
                        WHEN C.puntos > p.puntaje_maximo THEN p.puntaje_maximo
                        ELSE C.puntos
                      END AS DECIMAL(10,4)
                    ) / p.puntaje_maximo) * 10.0
             END
           AS DECIMAL(5,2))
  FROM cab.respuestas_detalle d
  JOIN C ON C.id = d.id_respuesta_detalle
  JOIN cab.preguntas p ON p.id_pregunta = C.id_pregunta;
END;
GO

-- BLOQUEO de cambios en detalle si la respuesta está ANULADA
IF OBJECT_ID('cab.tg_rdet_bloqueo_anulada','TR') IS NOT NULL DROP TRIGGER cab.tg_rdet_bloqueo_anulada;
GO
CREATE TRIGGER cab.tg_rdet_bloqueo_anulada
ON cab.respuestas_detalle
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @Affected TABLE (id_respuesta BIGINT PRIMARY KEY);
  INSERT INTO @Affected(id_respuesta) SELECT id_respuesta FROM inserted
  UNION SELECT id_respuesta FROM deleted;

  IF EXISTS (
    SELECT 1
    FROM @Affected a
    JOIN cab.respuestas r ON r.id_respuesta = a.id_respuesta
    WHERE r.estado = 'Anulada'
  )
  BEGIN
    RAISERROR('No se pueden modificar detalles de una respuesta ANULADA.', 16, 1);
    ROLLBACK TRANSACTION; RETURN;
  END;
END;
GO


/* =====================================================================
   (8) VISTAS Y PROCEDIMIENTOS
   ===================================================================== */

-- Vista: solo respuestas válidas (Enviada)
IF OBJECT_ID('cab.vw_respuestas_validas','V') IS NOT NULL DROP VIEW cab.vw_respuestas_validas;
GO
CREATE VIEW cab.vw_respuestas_validas AS
SELECT * FROM cab.respuestas WHERE estado = 'Enviada';
GO

-- Vista: promedio por respuesta (0..10)
IF OBJECT_ID('cab.vw_promedio_por_respuesta','V') IS NOT NULL DROP VIEW cab.vw_promedio_por_respuesta;
GO
CREATE VIEW cab.vw_promedio_por_respuesta AS
SELECT
  r.id_respuesta,
  r.boleta_num,
  r.id_encuesta,
  CAST(AVG(rd.puntaje_0a10) AS DECIMAL(5,2)) AS promedio_0a10
FROM cab.respuestas r
JOIN cab.respuestas_detalle rd ON rd.id_respuesta = r.id_respuesta
WHERE r.estado = 'Enviada'
GROUP BY r.id_respuesta, r.boleta_num, r.id_encuesta;
GO

-- SP: anular respuesta
IF OBJECT_ID('cab.sp_anular_respuesta','P') IS NOT NULL DROP PROCEDURE cab.sp_anular_respuesta;
GO
CREATE PROCEDURE cab.sp_anular_respuesta
  @id_respuesta BIGINT,
  @motivo       VARCHAR(300),
  @anulada_por  BIGINT
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE cab.respuestas
    SET estado         = 'Anulada',
        anulada_motivo = @motivo,
        anulada_por    = @anulada_por,
        anulada_en     = SYSDATETIME()
  WHERE id_respuesta = @id_respuesta AND estado = 'Enviada';

  IF @@ROWCOUNT = 0
    RAISERROR('No se pudo anular: la boleta no existe o ya está anulada.', 16, 1);
END;
GO

-- SP: promedios de una encuesta (global + por categoría)
IF OBJECT_ID('cab.sp_promedios_encuesta','P') IS NOT NULL DROP PROCEDURE cab.sp_promedios_encuesta;
GO
CREATE PROCEDURE cab.sp_promedios_encuesta
  @id_encuesta BIGINT
AS
BEGIN
  SET NOCOUNT ON;

  -- Global
  SELECT
    e.id_encuesta,
    e.titulo,
    CAST(AVG(rd.puntaje_0a10) AS DECIMAL(5,2)) AS promedio_global_0a10
  FROM cab.encuestas e
  JOIN cab.preguntas p ON p.id_encuesta = e.id_encuesta
  JOIN cab.respuestas_detalle rd ON rd.id_pregunta = p.id_pregunta
  JOIN cab.respuestas r ON r.id_respuesta = rd.id_respuesta
  WHERE e.id_encuesta = @id_encuesta AND r.id_encuesta = e.id_encuesta AND r.estado = 'Enviada'
  GROUP BY e.id_encuesta, e.titulo;

  -- Por categoría
  SELECT
    e.id_encuesta,
    cp.id_categoria_pregunta,
    COALESCE(cp.nombre, 'Sin categoría') AS categoria,
    CAST(AVG(rd.puntaje_0a10) AS DECIMAL(5,2)) AS promedio_categoria_0a10
  FROM cab.encuestas e
  JOIN cab.preguntas p ON p.id_encuesta = e.id_encuesta
  LEFT JOIN cab.categorias_preguntas cp ON cp.id_categoria_pregunta = p.id_categoria_pregunta
  JOIN cab.respuestas_detalle rd ON rd.id_pregunta = p.id_pregunta
  JOIN cab.respuestas r ON r.id_respuesta = rd.id_respuesta
  WHERE e.id_encuesta = @id_encuesta AND r.id_encuesta = e.id_encuesta AND r.estado = 'Enviada'
  GROUP BY e.id_encuesta, cp.id_categoria_pregunta, cp.nombre
  ORDER BY categoria;
END;
GO

-- SP: promedio de una boleta
IF OBJECT_ID('cab.sp_promedio_respuesta','P') IS NOT NULL DROP PROCEDURE cab.sp_promedio_respuesta;
GO
CREATE PROCEDURE cab.sp_promedio_respuesta
  @id_respuesta BIGINT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT
    r.id_respuesta,
    r.boleta_num,
    r.id_encuesta,
    CAST(AVG(rd.puntaje_0a10) AS DECIMAL(5,2)) AS promedio_0a10
  FROM cab.respuestas r
  JOIN cab.respuestas_detalle rd ON rd.id_respuesta = r.id_respuesta
  WHERE r.id_respuesta = @id_respuesta AND r.estado = 'Enviada'
  GROUP BY r.id_respuesta, r.boleta_num, r.id_encuesta;
END;
GO


/* =====================================================================
   (9) SEMILLAS IDEMPOTENTES (puedes re-ejecutar sin errores)
   ===================================================================== */
SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRAN;

select * from cab.departamentos

-- 9.1 Departamentos (1..22)
;WITH v(id, nombre) AS (
  SELECT 1,'Guatemala' UNION ALL
  SELECT 2,'El Progreso' UNION ALL
  SELECT 3,'Sacatepéquez' UNION ALL
  SELECT 4,'Chimaltenango' UNION ALL
  SELECT 5,'Escuintla' UNION ALL
  SELECT 6,'Santa Rosa' UNION ALL
  SELECT 7,'Sololá' UNION ALL
  SELECT 8,'Totonicapán' UNION ALL
  SELECT 9,'Quetzaltenango' UNION ALL
  SELECT 10,'Suchitepéquez' UNION ALL
  SELECT 11,'Retalhuleu' UNION ALL
  SELECT 12,'San Marcos' UNION ALL
  SELECT 13,'Huehuetenango' UNION ALL
  SELECT 14,'Quiché' UNION ALL
  SELECT 15,'Baja Verapaz' UNION ALL
  SELECT 16,'Alta Verapaz' UNION ALL
  SELECT 17,'Petén' UNION ALL
  SELECT 18,'Izabal' UNION ALL
  SELECT 19,'Zacapa' UNION ALL
  SELECT 20,'Chiquimula' UNION ALL
  SELECT 21,'Jalapa' UNION ALL
  SELECT 22,'Jutiapa'
)
INSERT INTO cab.departamentos (id_departamento, nombre)
SELECT id, nombre
FROM v
WHERE NOT EXISTS (SELECT 1 FROM cab.departamentos d WHERE d.id_departamento = v.id OR d.nombre = v.nombre);

-- 9.2 Municipio + Comunidad demo (El Progreso / San Cristobal / Chingoarriba)
DECLARE @id_depto SMALLINT = (SELECT id_departamento FROM cab.departamentos WHERE nombre='El Progreso');
IF NOT EXISTS (SELECT 1 FROM cab.municipios WHERE id_departamento=@id_depto AND nombre='San Cristobal')
  INSERT INTO cab.municipios (id_departamento, nombre) VALUES (@id_depto, 'San Cristobal');

DECLARE @id_muni INT = (SELECT id_municipio FROM cab.municipios WHERE id_departamento=@id_depto AND nombre='San Cristobal');
IF NOT EXISTS (SELECT 1 FROM cab.comunidades WHERE id_municipio=@id_muni AND nombre='Chingoarriba')
  INSERT INTO cab.comunidades (id_municipio, nombre, area) VALUES (@id_muni, 'Chingoarriba', 'Rural');

DECLARE @id_comu INT = (SELECT id_comunidad FROM cab.comunidades WHERE id_municipio=@id_muni AND nombre='Chingoarriba');

-- 9.3 Grupos focales
INSERT INTO cab.grupos_focales (nombre)
SELECT v.nombre
FROM (VALUES ('Embarazadas'), ('0-6m'), ('6-24m')) AS v(nombre)
WHERE NOT EXISTS (SELECT 1 FROM cab.grupos_focales g WHERE g.nombre = v.nombre);

DECLARE @id_gf_emb TINYINT = (SELECT id_grupo_focal FROM cab.grupos_focales WHERE nombre='Embarazadas');

-- 9.4 Categorías
INSERT INTO cab.categorias_preguntas (nombre)
SELECT v.nombre
FROM (VALUES
 ('Higiene básica'),
 ('Agua y Enfermedades'),
 ('Purificación del agua'),
 ('Saneamiento ambiental'),
 ('Atención prenatal'),
 ('Discapacidad')
) AS v(nombre)
WHERE NOT EXISTS (SELECT 1 FROM cab.categorias_preguntas c WHERE c.nombre = v.nombre);

-- 9.5 Usuario admin (rol con mayúscula válida por CHECK)
IF NOT EXISTS (SELECT 1 FROM cab.usuarios WHERE correo='yairmorales267@gmail.com')
  INSERT INTO cab.usuarios (nombre, correo, pass_hash, rol, activo)
  VALUES ('Yair Morales','yairmorales267@gmail.com','admin123','Admin',1);

DECLARE @id_user BIGINT = (SELECT id_usuario FROM cab.usuarios WHERE correo='yairmorales267@gmail.com');

-- 9.6 Encuesta demo (estado correcto por CHECK)
IF NOT EXISTS (SELECT 1 FROM cab.encuestas WHERE titulo='Encuesta Embarazadas' AND version='v1.0')
  INSERT INTO cab.encuestas (titulo, descripcion, id_grupo_focal, version, estado)
  VALUES ('Encuesta Embarazadas', 'Encuesta para toda mujer embarazada', @id_gf_emb, 'v1.0', 'Activa');

DECLARE @id_enc BIGINT = (SELECT id_encuesta FROM cab.encuestas WHERE titulo='Encuesta Embarazadas' AND version='v1.0');

-- 9.7 Preguntas demo
IF NOT EXISTS (SELECT 1 FROM cab.preguntas WHERE id_encuesta=@id_enc AND orden=1)
  INSERT INTO cab.preguntas (id_encuesta, id_categoria_pregunta, texto, tipo, requerida, orden, puntaje_maximo)
  VALUES (
    @id_enc,
    (SELECT TOP 1 id_categoria_pregunta FROM cab.categorias_preguntas WHERE nombre='Higiene básica'),
    N'¿Cuándo hay que lavarse las manos?', 'OpcionMultiple', 1, 1, 8
  );
DECLARE @id_p1 BIGINT = (SELECT id_pregunta FROM cab.preguntas WHERE id_encuesta=@id_enc AND orden=1);

IF NOT EXISTS (SELECT 1 FROM cab.preguntas WHERE id_encuesta=@id_enc AND orden=2)
  INSERT INTO cab.preguntas (id_encuesta, id_categoria_pregunta, texto, tipo, requerida, orden, puntaje_maximo)
  VALUES (
    @id_enc,
    (SELECT TOP 1 id_categoria_pregunta FROM cab.categorias_preguntas WHERE nombre='Higiene básica'),
    N'¿Sabe que una persona puede enfermarse si bebe agua sin purificar?', 'OpcionUnica', 1, 2, 100
  );
DECLARE @id_p2 BIGINT = (SELECT id_pregunta FROM cab.preguntas WHERE id_encuesta=@id_enc AND orden=2);

IF NOT EXISTS (SELECT 1 FROM cab.preguntas WHERE id_encuesta=@id_enc AND orden=3)
  INSERT INTO cab.preguntas (id_encuesta, id_categoria_pregunta, texto, tipo, requerida, orden, puntaje_maximo)
  VALUES (@id_enc, (SELECT TOP 1 id_categoria_pregunta FROM cab.categorias_preguntas WHERE nombre='Higiene básica'),
          N'¿Cuáles enfermedades conoce?', 'Texto', 0, 3, 0);
DECLARE @id_p3 BIGINT = (SELECT id_pregunta FROM cab.preguntas WHERE id_encuesta=@id_enc AND orden=3);

-- 9.8 Opciones demo
IF NOT EXISTS (SELECT 1 FROM cab.preguntas_opciones WHERE id_pregunta=@id_p1 AND orden=1)
  INSERT INTO cab.preguntas_opciones (id_pregunta, etiqueta, valor, puntos, orden)
  VALUES (@id_p1, 'Antes de comer', 'antes', 100, 1);
IF NOT EXISTS (SELECT 1 FROM cab.preguntas_opciones WHERE id_pregunta=@id_p1 AND orden=2)
  INSERT INTO cab.preguntas_opciones (id_pregunta, etiqueta, valor, puntos, orden)
  VALUES (@id_p1, 'Después de comer', 'despues', 100, 2);
IF NOT EXISTS (SELECT 1 FROM cab.preguntas_opciones WHERE id_pregunta=@id_p1 AND orden=3)
  INSERT INTO cab.preguntas_opciones (id_pregunta, etiqueta, valor, puntos, orden)
  VALUES (@id_p1, 'Cuando lo recuerdo', 'recuerdo', 25, 3);

IF NOT EXISTS (SELECT 1 FROM cab.preguntas_opciones WHERE id_pregunta=@id_p2 AND orden=1)
  INSERT INTO cab.preguntas_opciones (id_pregunta, etiqueta, valor, puntos, orden, condicional, condicional_pregunta_id)
  VALUES (@id_p2, 'Sí', 'si', 100, 1, 1, @id_p3);
IF NOT EXISTS (SELECT 1 FROM cab.preguntas_opciones WHERE id_pregunta=@id_p2 AND orden=2)
  INSERT INTO cab.preguntas_opciones (id_pregunta, etiqueta, valor, puntos, orden, condicional, condicional_pregunta_id)
  VALUES (@id_p2, 'No', 'no', 0, 2, 0, NULL);

-- 9.9 Respuesta (boleta) demo
IF NOT EXISTS (SELECT 1 FROM cab.respuestas WHERE boleta_num = 1)
  INSERT INTO cab.respuestas (boleta_num, id_encuesta, id_comunidad, id_usuario, estado)
  VALUES (1, @id_enc, @id_comu, @id_user, 'Enviada');

DECLARE @id_resp BIGINT = (SELECT id_respuesta FROM cab.respuestas WHERE boleta_num = 1);

-- 9.10 Respuesta detalle (elige "Después de comer")
DECLARE @id_opt2 BIGINT = (SELECT id_opcion FROM cab.preguntas_opciones WHERE id_pregunta=@id_p1 AND etiqueta='Después de comer');
IF NOT EXISTS (SELECT 1 FROM cab.respuestas_detalle WHERE id_respuesta=@id_resp AND id_pregunta=@id_p1)
  INSERT INTO cab.respuestas_detalle (id_respuesta, id_pregunta, id_opcion, valor_numerico, puntos, puntaje_0a10)
  VALUES (@id_resp, @id_p1, @id_opt2, NULL, 100, 0.00);  -- el trigger BI ajusta y calcula 0..10

COMMIT;
GO


/* =====================================================================
   (10) PROBADORES RÁPIDOS (opcionales)
   ===================================================================== */
-- SELECT * FROM cab.vw_respuestas_validas;
-- SELECT * FROM cab.vw_promedio_por_respuesta;



select * from cab.bitacora_respuestas
