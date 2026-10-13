<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpKernel\Exception\HttpException;

class ProviderDeletionSafety
{
    public function assertAvailable(): array
    {
        if (! config('provider_workflow.permanent_delete_enabled')) {
            throw new HttpException(503, 'Permanent deletion is disabled until schema safety is verified. Deactivate the provider instead.');
        }
        try {
            if (DB::connection()->getDriverName() !== 'mysql' || ! $this->metadataVisibilityIsComplete()) {
                throw new \LogicException('metadata_visibility');
            }
            $schema = DB::connection()->getDatabaseName();
            [$tables, $keys, $columns] = $this->loadInventory($schema);

            return $this->validateInventory($schema, $tables, $keys, $columns);
        } catch (\Throwable $exception) {
            Log::warning('Provider deletion safety could not be established.', ['request_id' => request()->attributes->get('request_id'), 'exception_type' => $exception::class]);
            throw new HttpException(503, 'Permanent deletion is unavailable because schema safety could not be verified. Deactivate the provider instead.', $exception);
        }
    }

    public function loadInventory(string $schema): array
    {
        return [
            DB::select('SELECT TABLE_SCHEMA, TABLE_NAME, ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?', [$schema]),
            DB::select('SELECT CONSTRAINT_SCHEMA, CONSTRAINT_NAME, TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, ORDINAL_POSITION, REFERENCED_TABLE_SCHEMA, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE REFERENCED_TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME = ?', [$schema, 'providers']),
            DB::select('SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND COLUMN_NAME = ?', [$schema, 'provider_id']),
        ];
    }

    public function metadataVisibilityIsComplete(): bool
    {
        $grants = array_map(fn ($row) => (string) array_values((array) $row)[0], DB::select('SHOW GRANTS FOR CURRENT_USER()'));

        return $this->hasCompleteReadGrant($grants);
    }

    public function hasCompleteReadGrant(array $grants): bool
    {
        foreach ($grants as $grant) {
            if (preg_match('/^REVOKE\b/i', $grant)) {
                return false;
            }
        }
        foreach ($grants as $grant) {
            if (preg_match('/^GRANT (ALL PRIVILEGES|[A-Z ,]*\bSELECT\b[A-Z ,]*) ON \*\.\* TO /i', $grant)) {
                return true;
            }
        }

        return false;
    }

    /** Supported contract: transactional, same-schema, single-column incoming ID FKs; no self/composite/non-ID dependencies. */
    public function validateInventory(string $schema, array $tables, array $keys, array $columns): array
    {
        $safeIdentifier = fn ($value) => is_string($value) && preg_match('/^[A-Za-z0-9_]+$/D', $value);
        if (! $safeIdentifier($schema)) {
            throw new \LogicException('unsupported_identifier');
        }
        $engines = [];
        foreach ($tables as $row) {
            $row = (array) $row;
            $engines[$row['TABLE_NAME']] = strtolower($row['ENGINE'] ?? '');
        }
        foreach (['providers', 'bank_service_details', 'services', 'audit_logs'] as $table) {
            if (($engines[$table] ?? null) !== 'innodb') {
                throw new \LogicException('nontransactional_contract');
            }
        }
        $groups = [];
        foreach ($keys as $key) {
            $key = (array) $key;
            $identity = ($key['CONSTRAINT_SCHEMA'] ?? '').'|'.($key['TABLE_NAME'] ?? '').'|'.($key['CONSTRAINT_NAME'] ?? '');
            $groups[$identity][] = $key;
        }
        $references = [];
        $knownLink = false;
        foreach ($groups as $parts) {
            $key = $parts[0];
            if (count($parts) !== 1 || ($key['ORDINAL_POSITION'] ?? 0) != 1 || ($key['TABLE_SCHEMA'] ?? '') !== $schema || ($key['CONSTRAINT_SCHEMA'] ?? '') !== $schema || ($key['REFERENCED_TABLE_SCHEMA'] ?? '') !== $schema || ($key['REFERENCED_TABLE_NAME'] ?? '') !== 'providers' || ($key['REFERENCED_COLUMN_NAME'] ?? '') !== 'id' || ($key['TABLE_NAME'] ?? '') === 'providers' || ! $safeIdentifier($key['TABLE_NAME'] ?? null) || ! $safeIdentifier($key['COLUMN_NAME'] ?? null) || ($engines[$key['TABLE_NAME']] ?? '') !== 'innodb') {
                throw new \LogicException('unsupported_dependency');
            }
            $references[] = ['schema' => $schema, 'table' => $key['TABLE_NAME'], 'column' => $key['COLUMN_NAME']];
            $knownLink = $knownLink || ($key['TABLE_NAME'] === 'bank_service_details' && $key['COLUMN_NAME'] === 'provider_id');
        }
        if (! $knownLink) {
            throw new \LogicException('incomplete_metadata');
        }
        foreach ($columns as $column) {
            $column = (array) $column;
            if (! collect($references)->contains(fn ($reference) => $reference['table'] === $column['TABLE_NAME'] && $reference['column'] === $column['COLUMN_NAME'] && $column['TABLE_SCHEMA'] === $schema)) {
                throw new \LogicException('undeclared_relationship');
            }
        }

        return $references;
    }
}
