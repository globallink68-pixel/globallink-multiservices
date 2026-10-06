<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\DB;

class ServiceResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $data = [
            'id' => $this->id,
            'slug' => $this->slug,
            'title' => $this->title,
            'short_description' => $this->short_description,
            'description' => $this->description,
            'icon' => $this->icon,
            'hero_image' => $this->hero_image,
            'featured' => $this->featured,
            'seo_title' => $this->seo_title,
            'seo_description' => $this->seo_description,
            'category' => array_intersect_key(
                $this->category->toArray(),
                array_flip(['id', 'name', 'slug', 'summary', 'icon']),
            ),
        ];

        if ($request->routeIs('catalogue.show')) {
            $ordered = fn (string $table) => DB::table($table)
                ->where('service_id', $this->id)->orderBy('sort_order')->orderBy('id');

            $data['sections'] = $ordered('service_sections')->get(['title', 'body']);
            $data['items'] = $ordered('service_content_items')->get(['kind', 'label', 'body']);
            $data['fees'] = $ordered('service_fees')->where('is_verified', true)
                ->get(['label', 'amount_paise', 'currency', 'notes'])
                ->map(fn ($fee) => [
                    ...(array) $fee,
                    'amount_paise' => $fee->amount_paise === null ? null : (int) $fee->amount_paise,
                ]);
            $data['faqs'] = $ordered('faqs')->where('is_active', true)->get(['question', 'answer']);
            $data['providers'] = DB::table('bank_service_details as d')
                ->join('providers as p', 'p.id', '=', 'd.provider_id')
                ->where('d.service_id', $this->id)->where('p.is_active', true)
                ->orderBy('p.sort_order')->orderBy('p.id')
                ->get([
                    'p.name', 'p.description', 'd.eligibility_overrides',
                    'd.document_overrides', 'd.fee_information', 'd.processing_notes',
                ])
                ->map(fn ($provider) => [
                    'name' => $provider->name,
                    'description' => $provider->description,
                    'eligibility' => json_decode($provider->eligibility_overrides ?? '[]', true),
                    'documents' => json_decode($provider->document_overrides ?? '[]', true),
                    'fee_information' => $provider->fee_information,
                    'processing_notes' => $provider->processing_notes,
                ]);
        }

        return $data;
    }
}
