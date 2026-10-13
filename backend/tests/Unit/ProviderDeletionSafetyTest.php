<?php

namespace Tests\Unit;

use App\Services\ProviderDeletionSafety;
use App\Services\SafeDatabaseError;
use Illuminate\Database\UniqueConstraintViolationException;
use PHPUnit\Framework\TestCase;

class ProviderDeletionSafetyTest extends TestCase
{
    private function inventory(): array
    {
        $tables = array_map(fn ($name) => ['TABLE_SCHEMA' => 'qa', 'TABLE_NAME' => $name, 'ENGINE' => 'InnoDB'], ['providers', 'services', 'bank_service_details', 'audit_logs']);
        $key = ['CONSTRAINT_SCHEMA' => 'qa', 'CONSTRAINT_NAME' => 'bank_provider_fk', 'TABLE_SCHEMA' => 'qa', 'TABLE_NAME' => 'bank_service_details', 'COLUMN_NAME' => 'provider_id', 'ORDINAL_POSITION' => 1, 'REFERENCED_TABLE_SCHEMA' => 'qa', 'REFERENCED_TABLE_NAME' => 'providers', 'REFERENCED_COLUMN_NAME' => 'id'];

        return [$tables, [$key], [['TABLE_SCHEMA' => 'qa', 'TABLE_NAME' => 'bank_service_details', 'COLUMN_NAME' => 'provider_id']]];
    }

    public function test_supported_single_column_dependencies_are_returned(): void
    {
        [$tables, $keys, $columns] = $this->inventory();
        $tables[] = ['TABLE_SCHEMA' => 'qa', 'TABLE_NAME' => 'other_dependencies', 'ENGINE' => 'InnoDB'];
        $keys[] = array_replace($keys[0], ['CONSTRAINT_NAME' => 'other_fk', 'TABLE_NAME' => 'other_dependencies', 'COLUMN_NAME' => 'owner_provider']);
        $result = (new ProviderDeletionSafety)->validateInventory('qa', $tables, $keys, $columns);
        $this->assertCount(2, $result);
        $this->assertSame('other_dependencies', $result[1]['table']);
    }

    public function test_unsupported_or_incomplete_dependency_shapes_fail_closed(): void
    {
        foreach (['non_id', 'composite', 'cross_schema', 'self_reference', 'missing_known_fk', 'nontransactional', 'undeclared', 'empty_metadata', 'unsafe_identifier'] as $scenario) {
            [$tables, $keys, $columns] = $this->inventory();
            switch ($scenario) {
                case 'non_id': $keys[0]['REFERENCED_COLUMN_NAME'] = 'code';
                    break;
                case 'composite': $keys[] = array_replace($keys[0], ['ORDINAL_POSITION' => 2, 'COLUMN_NAME' => 'other_column']);
                    break;
                case 'cross_schema': $keys[0]['TABLE_SCHEMA'] = 'another_schema';
                    break;
                case 'self_reference': $keys[0]['TABLE_NAME'] = 'providers';
                    break;
                case 'missing_known_fk': $keys = [];
                    break;
                case 'nontransactional': $tables[0]['ENGINE'] = 'MyISAM';
                    break;
                case 'undeclared': $columns[] = ['TABLE_SCHEMA' => 'qa', 'TABLE_NAME' => 'unknown_table', 'COLUMN_NAME' => 'provider_id'];
                    break;
                case 'empty_metadata': $tables = [];
                    break;
                case 'unsafe_identifier': $keys[0]['COLUMN_NAME'] = 'unsafe.column';
                    break;
            }
            try {
                (new ProviderDeletionSafety)->validateInventory('qa', $tables, $keys, $columns);
                $this->fail('Unsupported scenario accepted: '.$scenario);
            } catch (\LogicException $exception) {
                $this->assertNotEmpty($exception->getMessage(), $scenario);
            }
        }
    }

    public function test_metadata_visibility_requires_explicit_global_read_without_partial_revokes(): void
    {
        $safety = new ProviderDeletionSafety;
        $this->assertTrue($safety->hasCompleteReadGrant(['GRANT SELECT ON *.* TO `test`@`localhost`']));
        $this->assertTrue($safety->hasCompleteReadGrant(['GRANT ALL PRIVILEGES ON *.* TO `test`@`localhost`']));
        $this->assertFalse($safety->hasCompleteReadGrant(['GRANT SELECT ON `qa`.* TO `test`@`localhost`']));
        $this->assertFalse($safety->hasCompleteReadGrant([]));
        $this->assertFalse($safety->hasCompleteReadGrant(['GRANT SELECT ON *.* TO `test`@`localhost`', 'REVOKE SELECT ON `hidden`.* FROM `test`@`localhost`']));
    }

    private function failure(string $sql, ?string $index, int $driverCode = 1062): UniqueConstraintViolationException
    {
        $previous = new \PDOException('Synthetic private value');
        $previous->errorInfo = ['23000', $driverCode, 'Synthetic SQL detail'];

        return (new UniqueConstraintViolationException('mysql', $sql, ['synthetic-sensitive-value'], $previous))->setIndex($index);
    }

    public function test_duplicate_code_classifier_requires_index_and_provider_query(): void
    {
        $this->assertTrue(SafeDatabaseError::isProviderCodeConflict($this->failure('insert into `providers` (`code`) values (?)', 'providers_code_unique')));
        $this->assertFalse(SafeDatabaseError::isProviderCodeConflict($this->failure('insert into `audit_logs` (`id`) values (?)', 'providers_code_unique')));
        $this->assertFalse(SafeDatabaseError::isProviderCodeConflict($this->failure('insert into `providers` (`code`) values (?)', null)));
        $this->assertFalse(SafeDatabaseError::isProviderCodeConflict($this->failure('insert into `providers` (`code`) values (?)', 'custom_index')));
        $this->assertSame('unique_constraint', SafeDatabaseError::category($this->failure('insert into `providers` (`code`) values (?)', 'providers_code_unique')));
        $this->assertSame('lock_timeout', SafeDatabaseError::category($this->failure('update `providers` set code=?', null, 1205)));
        $this->assertNull(SafeDatabaseError::category(new \RuntimeException('not database-related')));
        $this->assertNull(SafeDatabaseError::category($this->failure('synthetic', null, 9999)));
    }
}
