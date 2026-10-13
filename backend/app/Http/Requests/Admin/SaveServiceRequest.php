<?php

namespace App\Http\Requests\Admin;

use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class SaveServiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->is_admin === true;
    }

    public static function mediaRule(): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail): void {
            if (! preg_match('~^/api/media/([a-f0-9-]{36})$~', $value, $m) || ! DB::table('media_assets')->where('uuid', $m[1])->exists()) {
                $fail('Select an image uploaded through this CMS.');
            }
        };
    }

    public function rules(): array
    {
        $id = $this->route('id');

        return [
            'title' => 'required|string|max:160', 'slug' => ['required', 'string', 'max:160', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('services', 'slug')->ignore($id)],
            'category_id' => 'required|integer|exists:categories,id', 'short_description' => 'required|string|max:400', 'description' => 'required|string|max:20000',
            'icon' => 'required|string|in:bank,code,growth,business,payments,shield,arrow,check,phone,spark', 'hero_image' => ['nullable', 'string', self::mediaRule()],
            'icon_path' => ['nullable', 'string', self::mediaRule()], 'cta_text' => 'required|string|max:80', 'is_published' => 'required|boolean', 'featured' => 'required|boolean', 'sort_order' => 'required|integer|min:0|max:10000',
            'seo_title' => 'nullable|string|max:180', 'seo_description' => 'nullable|string|max:300',
            'sections' => 'present|array|max:30', 'sections.*.title' => 'required|string|max:160', 'sections.*.body' => 'required|string|max:10000',
            'items' => 'present|array|max:100', 'items.*.kind' => 'required|in:benefit,eligibility,document,feature,process,note,term', 'items.*.label' => 'required|string|max:300', 'items.*.body' => 'nullable|string|max:5000', 'items.*.is_required' => 'required|boolean',
            'fees' => 'present|array|max:30', 'fees.*.label' => 'required|string|max:160', 'fees.*.amount_paise' => 'nullable|integer|min:0|max:10000000000', 'fees.*.currency' => 'required|in:INR', 'fees.*.notes' => 'nullable|string|max:5000', 'fees.*.is_verified' => 'required|boolean', 'fees.*.is_active' => 'required|boolean',
            'providers' => 'present|array|max:30', 'providers.*.provider_id' => 'required|integer|distinct|exists:providers,id', 'providers.*.eligibility_overrides' => 'present|array|max:30', 'providers.*.eligibility_overrides.*' => 'required|string|max:300', 'providers.*.document_overrides' => 'present|array|max:30', 'providers.*.document_overrides.*' => 'required|string|max:300',
            'providers.*.description' => 'nullable|string|max:5000', 'providers.*.fee_information' => 'nullable|string|max:5000', 'providers.*.processing_notes' => 'nullable|string|max:5000', 'providers.*.notes' => 'nullable|string|max:5000', 'providers.*.disclaimer' => 'nullable|string|max:5000',
            'faqs' => 'present|array|max:30', 'faqs.*.question' => 'required|string|max:300', 'faqs.*.answer' => 'required|string|max:10000', 'faqs.*.is_active' => 'required|boolean',
        ];
    }

    public function after(): array
    {
        return [function ($validator): void {
            if ($validator->errors()->any()) {
                return;
            }
            $id = $this->route('id');
            if ($id && DB::table('services')->where('id', $id)->value('slug') !== $this->input('slug')) {
                $validator->errors()->add('slug', 'Existing slugs are locked to preserve public URLs.');
            }
            $seen = [];
            foreach ($this->input('items', []) as $row) {
                $key = ($row['kind'] ?? '').'|'.($row['label'] ?? '');
                if (isset($seen[$key])) {
                    $validator->errors()->add('items', 'Content labels must be unique within each type.');
                }
                $seen[$key] = true;
            }
        }];
    }
}
