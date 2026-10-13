-- READ ONLY. Run privately in Hostinger phpMyAdmin after selecting the
-- application's intended database. No credentials or record contents are needed.
-- Do not change migration history, delete providers, or run DDL from this file.
SELECT DATABASE() AS active_database, VERSION() AS server_version;
-- Run with the actual app account privately; an administrator's grants do not
-- prove the app account's visibility. Do not share account/grant output in chat.
SHOW GRANTS FOR CURRENT_USER();
SELECT migration, batch FROM migrations ORDER BY id;

SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bank_service_details'
  AND COLUMN_NAME = 'description';
-- Required: one nullable TEXT description column and matching migration history.
-- If already applied and compatible, do not rerun the migration.
-- If missing, inconsistent or incompatible, STOP and obtain approval for
-- the exact corrective action before any production database modification.

SELECT TABLE_NAME, ENGINE, TABLE_COLLATION FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('providers','services','bank_service_details','categories','media_assets','audit_logs');
SHOW CREATE TABLE providers;
SHOW CREATE TABLE bank_service_details;
SHOW INDEX FROM providers;
SHOW INDEX FROM bank_service_details;

-- Complete visible incoming FK inventory: do not restrict child schema or
-- referenced column to id. A privileged operator must confirm visibility.
SELECT k.CONSTRAINT_SCHEMA, k.CONSTRAINT_NAME, k.TABLE_SCHEMA, k.TABLE_NAME,
       k.COLUMN_NAME, k.ORDINAL_POSITION, k.REFERENCED_TABLE_SCHEMA,
       k.REFERENCED_TABLE_NAME, k.REFERENCED_COLUMN_NAME, r.DELETE_RULE
FROM information_schema.KEY_COLUMN_USAGE k
LEFT JOIN information_schema.REFERENTIAL_CONSTRAINTS r
 ON r.CONSTRAINT_SCHEMA=k.CONSTRAINT_SCHEMA AND r.CONSTRAINT_NAME=k.CONSTRAINT_NAME
 AND r.TABLE_NAME=k.TABLE_NAME
WHERE k.REFERENCED_TABLE_SCHEMA=DATABASE() AND k.REFERENCED_TABLE_NAME='providers'
ORDER BY k.TABLE_SCHEMA,k.TABLE_NAME,k.CONSTRAINT_NAME,k.ORDINAL_POSITION;

-- The supported deletion contract requires InnoDB for every referencing table.
SELECT DISTINCT t.TABLE_SCHEMA,t.TABLE_NAME,t.ENGINE
FROM information_schema.KEY_COLUMN_USAGE k
JOIN information_schema.TABLES t
 ON t.TABLE_SCHEMA=k.TABLE_SCHEMA AND t.TABLE_NAME=k.TABLE_NAME
WHERE k.REFERENCED_TABLE_SCHEMA=DATABASE() AND k.REFERENCED_TABLE_NAME='providers';
SELECT TABLE_SCHEMA,TABLE_NAME,COLUMN_NAME
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA=DATABASE() AND COLUMN_NAME='provider_id';
-- All these provider_id columns must have supported FKs. Also review code/schema
-- for differently named unkeyed references, triggers and external dependencies.
-- Keep PROVIDER_PERMANENT_DELETE_ENABLED=false if completeness is not proven.
-- Do not broaden shared-host global privileges solely to enable Delete.

SELECT COUNT(*) AS duplicate_provider_code_groups FROM
 (SELECT code FROM providers GROUP BY code HAVING COUNT(*)>1) d;
SELECT COUNT(*) AS duplicate_service_provider_groups FROM
 (SELECT service_id,provider_id FROM bank_service_details
  GROUP BY service_id,provider_id HAVING COUNT(*)>1) d;
SELECT COUNT(*) AS orphaned_links FROM bank_service_details d
LEFT JOIN providers p ON p.id=d.provider_id LEFT JOIN services s ON s.id=d.service_id
WHERE p.id IS NULL OR s.id IS NULL;
SELECT COUNT(*) AS populated_descriptions FROM bank_service_details WHERE description IS NOT NULL;

-- Identity/association verification by code and slug, without permanent IDs.
SELECT COUNT(*) AS hsbc_providers FROM providers WHERE code='HSBC';
SELECT COUNT(*) AS bank_csp_services FROM services WHERE slug='bank-csp';
SELECT COUNT(*) AS hsbc_bank_csp_links FROM bank_service_details d
JOIN providers p ON p.id=d.provider_id JOIN services s ON s.id=d.service_id
WHERE p.code='HSBC' AND s.slug='bank-csp';
SELECT COUNT(*) AS publicly_eligible_hsbc_links FROM bank_service_details d
JOIN providers p ON p.id=d.provider_id JOIN services s ON s.id=d.service_id
JOIN categories c ON c.id=s.category_id
WHERE p.code='HSBC' AND s.slug='bank-csp' AND p.is_active=1
  AND s.is_published=1 AND c.is_active=1;
SELECT TRIGGER_NAME,EVENT_MANIPULATION,EVENT_OBJECT_TABLE,ACTION_TIMING
FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE()
 AND EVENT_OBJECT_TABLE IN ('providers','bank_service_details','audit_logs');
