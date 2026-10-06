<?php

namespace App\Services;

use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class AssistantEnquiryReview
{
    public function review(Request $request, array $values): array
    {
        $session = $this->sessionHash($request);
        $lock = Cache::lock('assistant-review-session:'.$session, 10);
        abort_unless($lock->get(), 429, 'Please wait before reviewing again.');
        try {
            $active = 'assistant-current:'.$session;
            if ($old = Cache::get($active)) {
                Cache::forget($old);
            }
            $token = Str::random(40);
            $key = $this->key($token);
            Cache::put($key, ['payload_hash' => $this->payloadHash($values), 'session_hash' => $session], 600);
            Cache::put($active, $key, 600);
            $service = Service::published()->findOrFail($values['service_id']);
            $summary = $this->fields($values);
            unset($summary['source_path'], $summary['website'], $summary['consent']);

            return ['review_token' => $token, 'expires_in' => 600, 'summary' => $summary, 'service' => ['id' => $service->id, 'title' => $service->title]];
        } finally {
            $lock->release();
        }
    }

    public function submit(Request $request, array $values): string
    {
        $key = $this->key($values['review_token']);
        $lock = Cache::lock('assistant-confirm:'.$key, 10);
        abort_unless($lock->get(), 429, 'This confirmation is being processed. Please wait.');
        try {
            $review = Cache::get($key);
            abort_unless(is_array($review) && hash_equals($review['session_hash'], $this->sessionHash($request)) && hash_equals($review['payload_hash'], $this->payloadHash($values)), 409, 'The review expired or the details changed. Review them again before confirming.');
            if (isset($review['reference'])) {
                return $review['reference'];
            }
            $reference = EnquiryWorkflow::submit($this->fields($values), 'AI_ASSISTANT');
            Cache::put($key, $review + ['reference' => $reference], 600);

            return $reference;
        } finally {
            $lock->release();
        }
    }

    public function cancel(Request $request, string $token): void
    {
        $key = $this->key($token);
        $session = $this->sessionHash($request);
        $review = Cache::get($key);
        if (is_array($review) && hash_equals($review['session_hash'], $session)) {
            Cache::forget($key);
            if (Cache::get('assistant-current:'.$session) === $key) {
                Cache::forget('assistant-current:'.$session);
            }
        }
    }

    private function fields(array $values): array
    {
        $fields = [];
        foreach (['name', 'mobile', 'email', 'state', 'city', 'service_id', 'message', 'consent', 'website', 'source_path'] as $field) {
            $fields[$field] = $values[$field] ?? null;
        }

        return $fields;
    }

    private function payloadHash(array $values): string
    {
        return hash_hmac('sha256', json_encode($this->fields($values), JSON_THROW_ON_ERROR), config('app.key'));
    }

    private function sessionHash(Request $request): string
    {
        return hash('sha256', $request->session()->getId());
    }

    private function key(string $token): string
    {
        return 'assistant-review:'.hash('sha256', $token);
    }
}
