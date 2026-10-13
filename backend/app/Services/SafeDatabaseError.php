<?php

namespace App\Services;

use Illuminate\Database\QueryException;
use Illuminate\Database\UniqueConstraintViolationException;

class SafeDatabaseError
{
    public static function isProviderCodeConflict(UniqueConstraintViolationException $exception): bool
    {
        return strtolower($exception->index ?? '') === 'providers_code_unique'
            && preg_match('/^\s*(?:insert into|update)\s+`providers`(?:\s|$)/i', $exception->getSql()) === 1;
    }

    public static function category(\Throwable $exception): ?string
    {
        if (! $exception instanceof QueryException) {
            return null;
        }
        $code = (int) ($exception->errorInfo[1] ?? 0);

        return match ($code) {
            1062 => 'unique_constraint',
            1054, 1146 => 'schema_mismatch',
            1064 => 'syntax_error',
            1044, 1045, 1142 => 'permission_denied',
            1213 => 'deadlock',
            1205 => 'lock_timeout',
            2002, 2006, 2013 => 'connection_failure',
            default => null,
        };
    }
}
