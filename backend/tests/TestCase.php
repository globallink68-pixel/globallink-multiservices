<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\DB;

abstract class TestCase extends BaseTestCase
{
    public function createApplication()
    {
        $app = parent::createApplication();
        if (config('database.default') !== 'mysql' || ! in_array(config('database.connections.mysql.host'), ['127.0.0.1', 'localhost'], true) || config('database.connections.mysql.url') || config('database.connections.mysql.database') !== 'globallink_phase1_test' || (int) config('database.connections.mysql.port') !== 3312) {
            throw new \RuntimeException('Tests require the isolated Global Link test database on port 3312.');
        }
        $identity = DB::selectOne('SELECT DATABASE() AS db, @@port AS port, @@datadir AS data_directory');
        $expected = strtolower(str_replace('\\', '/', realpath(base_path('../tools/mysql-data')) ?: '')).'/';
        if ($identity->db !== 'globallink_phase1_test' || (int) $identity->port !== 3312 || strtolower(str_replace('\\', '/', $identity->data_directory)) !== $expected) {
            throw new \RuntimeException('Tests refuse a server outside this project dedicated MySQL data directory.');
        }

        return $app;
    }
}
