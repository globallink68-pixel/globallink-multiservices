<?php

namespace App\Services;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CmsAudit
{
    public static function record(string $action, string $entity, ?int $id = null): void
    {
        DB::table('audit_logs')->insert(['administrator_id' => Auth::id(), 'action' => $action, 'entity_type' => $entity, 'entity_id' => $id, 'summary' => ucfirst($entity).' '.$action, 'created_at' => now()]);
    }
}
