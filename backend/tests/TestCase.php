<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    public function createApplication()
    {
        $app = parent::createApplication();
        if (config('database.default') !== 'mysql' || config('database.connections.mysql.database') !== 'globallink_phase1_test' || (int) config('database.connections.mysql.port') !== 3312) {
            throw new \RuntimeException('Tests require the isolated Global Link test database on port 3312.');
        }

        return $app;
    }
}
