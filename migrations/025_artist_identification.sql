-- Identificação do artista (cadastro free): tipo nacional/internacional, país emissor, tipo e número do documento
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "doc_tipo" varchar(20);
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "doc_tipo_documento" varchar(50);
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "doc_numero" text;
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "doc_pais" varchar(100);