<?php

namespace App\Services;

use App\Models\Service;
use Illuminate\Support\Facades\DB;

class ChatRetrieval
{
    /** @return array{facts: array, services: array} */
    public function retrieve(string $question, array $history = [], ?string $slug = null): array
    {
        $services = Service::published()->with('category')->orderBy('sort_order')->orderBy('id')->limit(100)->get();
        $text = mb_strtolower($question);
        $tokens = $this->tokens($text);
        $providerServices = DB::table('bank_service_details as d')->join('providers as p', 'p.id', '=', 'd.provider_id')
            ->where('p.is_active', true)->whereIn('d.service_id', $services->pluck('id'))->get(['d.service_id', 'p.name', 'p.code']);
        $rank = function (string $search) use ($services, $providerServices): array {
            $ranked = [];
            foreach ($services as $service) {
                $score = str_contains($search, mb_strtolower($service->title)) || str_contains($search, $service->slug) ? 100 : 0;
                foreach ($this->tokens($search) as $word) {
                    if (in_array($word, $this->tokens($service->title), true)) {
                        $score += 5;
                    }
                }
                foreach ($providerServices->where('service_id', $service->id) as $provider) {
                    if (preg_match('/\b'.preg_quote(mb_strtolower($provider->code), '/').'\b/u', $search) || str_contains($search, mb_strtolower($provider->name))) {
                        $score += 20;
                    }
                }
                if ($score > 0) {
                    $ranked[] = ['service' => $service, 'score' => $score];
                }
            }
            usort($ranked, fn (array $a, array $b): int => $b['score'] <=> $a['score'] ?: $a['service']->sort_order <=> $b['service']->sort_order ?: $a['service']->id <=> $b['service']->id);

            return array_column(array_slice($ranked, 0, 3), 'service');
        };
        $selected = $rank($text);
        if (! $selected && $slug) {
            $selected = $services->where('slug', $slug)->values()->all();
        }
        if (! $selected) {
            foreach (array_reverse($history) as $message) {
                if ($message['role'] === 'user') {
                    $selected = $rank(mb_strtolower($message['content']));
                    if ($selected) {
                        break;
                    }
                }
            }
        }
        $facts = [];
        $size = 0;
        $add = function (string $label, ?string $value, string $source, string $kind) use (&$facts, &$size): void {
            if (! $value || count($facts) >= 60 || $size >= 16000) {
                return;
            }
            $value = mb_substr(trim($value), 0, min(1800, 16000 - $size));
            $size += mb_strlen($value);
            $facts[] = ['id' => 'F'.(count($facts) + 1), 'label' => mb_substr($label, 0, 180), 'text' => $value, 'source' => $source, 'kind' => $kind];
        };
        $documents = (bool) preg_match('/document|checklist|paper|aadhaar|pan card/i', $question);
        $eligibility = (bool) preg_match('/eligib|qualif|requirement/i', $question);
        $fees = (bool) preg_match('/fee|cost|price|charge|commission|income/i', $question);
        $process = (bool) preg_match('/process|step|activat|time|approv/i', $question);
        foreach ($selected as $service) {
            $source = '/services/'.$service->slug;
            $add($service->title, $service->short_description, $source, 'summary');
            if (! ($documents || $eligibility || $fees || $process)) {
                $add($service->title.' details', $service->description, $source, 'details');
            }
            $items = DB::table('service_content_items')->where('service_id', $service->id)->orderBy('sort_order')->orderBy('id')->limit(40)->get();
            foreach ($items as $item) {
                if ($item->kind === 'term' || ! ($documents || $eligibility || $fees || $process) || ($documents && $item->kind === 'document') || ($eligibility && $item->kind === 'eligibility') || ($process && $item->kind === 'process')) {
                    $add($service->title.' · '.$item->kind, $item->label.($item->body ? ': '.$item->body : ''), $source, $item->kind);
                }
            }
            if (! ($documents || $eligibility || $fees)) {
                foreach (DB::table('service_sections')->where('service_id', $service->id)->orderBy('sort_order')->orderBy('id')->limit(8)->get(['title', 'body']) as $section) {
                    $add($service->title.' · '.$section->title, $section->body, $source, 'details');
                }
            }
            if ($fees) {
                foreach (DB::table('service_fees')->where('service_id', $service->id)->where('is_active', true)->where('is_verified', true)->orderBy('sort_order')->orderBy('id')->limit(8)->get() as $fee) {
                    $amount = $fee->amount_paise === null ? 'Amount not configured' : $fee->currency.' '.number_format($fee->amount_paise / 100, 2, '.', '');
                    $add($service->title.' · '.$fee->label, $amount.($fee->notes ? ' · '.$fee->notes : ''), $source, 'fee');
                }
            }
            foreach (DB::table('faqs')->where('service_id', $service->id)->where('is_active', true)->orderBy('sort_order')->orderBy('id')->limit(12)->get(['question', 'answer']) as $faq) {
                $add($faq->question, $faq->answer, $source, 'faq');
            }
            foreach ($providerServices->where('service_id', $service->id) as $provider) {
                $detail = DB::table('bank_service_details as d')->join('providers as p', 'p.id', '=', 'd.provider_id')
                    ->where('d.service_id', $service->id)->where('p.code', $provider->code)->where('p.is_active', true)
                    ->first(['p.name', 'p.description', 'd.notes', 'd.disclaimer', 'd.eligibility_overrides', 'd.document_overrides', 'd.fee_information', 'd.processing_notes']);
                if (! $detail) {
                    continue;
                }
                $add($detail->name.' · provider information', $detail->description, $source, 'provider');
                $add($detail->name.' · disclaimer', $detail->disclaimer, $source, 'term');
                $add($detail->name.' · notes', $detail->notes, $source, 'provider');
                foreach (['eligibility_overrides' => $eligibility, 'document_overrides' => $documents] as $field => $needed) {
                    if ($needed) {
                        foreach (array_slice(json_decode($detail->$field ?? '[]', true) ?: [], 0, 12) as $value) {
                            if (is_string($value)) {
                                $add($detail->name.' · '.($field === 'document_overrides' ? 'document' : 'eligibility'), $value, $source, $field === 'document_overrides' ? 'document' : 'eligibility');
                            }
                        }
                    }
                }
                if ($fees) {
                    $add($detail->name.' · configured fee information', $detail->fee_information, $source, 'fee');
                }
                if ($process) {
                    $add($detail->name.' · processing notes', $detail->processing_notes, $source, 'process');
                }
            }
        }
        if (! $selected && preg_match('/service|offer|discover|software|marketing|banking|business|digital/i', $question)) {
            $discovery = $services->filter(fn (Service $service): bool => ! $tokens || count(array_intersect($tokens, $this->tokens($service->category->name.' '.$service->short_description))) > 0);
            foreach ($discovery->take(8) as $service) {
                $add($service->title, $service->short_description, '/services/'.$service->slug, 'summary');
            }
        }
        foreach (DB::table('faqs')->whereNull('service_id')->where('is_active', true)->orderBy('sort_order')->orderBy('id')->limit(40)->get(['question', 'answer']) as $faq) {
            if (count(array_intersect($tokens, $this->tokens($faq->question.' '.$faq->answer))) >= 2) {
                $add($faq->question, $faq->answer, '/#faq', 'faq');
            }
        }
        foreach (DB::table('site_settings')->where('is_public', true)->whereIn('key', ['company_name', 'phone', 'email', 'address', 'about_summary', 'footer'])->pluck('value', 'key') as $key => $value) {
            $add('Global Link · '.$key, $value, '/#contact', 'contact');
        }

        return ['facts' => $facts, 'services' => array_map(fn (Service $service): array => ['title' => $service->title, 'slug' => $service->slug], $selected)];
    }

    private function tokens(string $text): array
    {
        $words = preg_split('/[^\p{L}\p{N}]+/u', mb_strtolower($text), -1, PREG_SPLIT_NO_EMPTY);

        return array_values(array_unique(array_filter($words, fn (string $word): bool => mb_strlen($word) >= 3 && ! in_array($word, ['what', 'which', 'with', 'for', 'the', 'and', 'are', 'can', 'you', 'how', 'about', 'please', 'required', 'documents', 'service', 'services', 'global', 'link', 'that', 'this', 'information', 'details'], true))));
    }
}
