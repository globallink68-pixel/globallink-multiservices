<?php

namespace App\Services;

use App\Models\Service;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class EnquiryWorkflow
{
    public const STATUSES = ['NEW', 'CONTACTED', 'FOLLOW_UP', 'QUALIFIED', 'CONVERTED', 'CLOSED'];

    public const CONSENT_VERSION = 'contact-enquiry-v1';

    public static function submit(array $values, string $leadSource = 'WEBSITE_FORM'): string
    {
        abort_unless(in_array($leadSource, ['WEBSITE_FORM', 'AI_ASSISTANT'], true), 422);
        $phoneKey = hash_hmac('sha256', $values['mobile'], config('app.key'));
        $lock = Cache::lock('enquiry-submit:'.$phoneKey, 10);
        abort_unless($lock->get(), 429, 'A submission is already being processed. Please wait.');
        try {
            abort_if(RateLimiter::tooManyAttempts('enquiry-mobile:'.$phoneKey, 3), 429, 'Please wait before sending another enquiry.');
            $reference = DB::transaction(function () use ($values, $phoneKey, $leadSource): string {
                $service = Service::published()->whereKey($values['service_id'])->lockForUpdate()->first();
                if (! $service) {
                    throw ValidationException::withMessages(['service_id' => 'This service is no longer available.']);
                }
                $fingerprint = hash_hmac('sha256', $phoneKey.'|'.$service->id.'|'.mb_strtolower(trim($values['message'])), config('app.key'));
                abort_if(DB::table('enquiries')->where('fingerprint', $fingerprint)->where('created_at', '>=', now()->subMinutes(10))->exists(), 409, 'This enquiry was already received. Please wait before submitting it again.');
                $reference = 'GL-'.Str::ulid();
                $id = DB::table('enquiries')->insertGetId([
                    'reference' => $reference, 'service_id' => $service->id, 'name' => trim($values['name']), 'mobile' => $values['mobile'],
                    'email' => $values['email'] ?? null, 'state' => trim($values['state']), 'city' => trim($values['city']), 'message' => trim($values['message']),
                    'source_path' => $values['source_path'], 'consented_at' => now(), 'consent_version' => self::CONSENT_VERSION,
                    'lead_source' => $leadSource,
                    'status' => 'NEW', 'fingerprint' => $fingerprint, 'created_at' => now(), 'updated_at' => now(),
                ]);
                DB::table('enquiry_status_history')->insert(['enquiry_id' => $id, 'from_status' => null, 'status' => 'NEW', 'changed_by' => null, 'note' => null, 'created_at' => now()]);

                return $reference;
            });
            RateLimiter::hit('enquiry-mobile:'.$phoneKey, 600);

            return $reference;
        } finally {
            $lock->release();
        }
    }
}
