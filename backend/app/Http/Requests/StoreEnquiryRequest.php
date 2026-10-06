<?php

namespace App\Http\Requests;

use App\Models\Service;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreEnquiryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('mobile')) && preg_match('/^[+0-9 ()-]+$/', $this->input('mobile'))) {
            $digits = preg_replace('/\D/', '', $this->input('mobile'));
            $this->merge(['mobile' => strlen($digits) === 12 && str_starts_with($digits, '91') ? substr($digits, 2) : $digits]);
        }
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|min:2|max:120', 'mobile' => 'required|string|regex:/^[6-9][0-9]{9}$/',
            'email' => 'nullable|email|max:254', 'state' => 'required|string|min:2|max:80', 'city' => 'required|string|min:2|max:100',
            'service_id' => 'required|integer', 'message' => 'required|string|min:10|max:3000', 'consent' => 'required|accepted',
            'source_path' => 'required|string|max:200', 'website' => 'present|nullable|string|max:0',
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->any()) {
                return;
            }
            $service = Service::published()->find($this->integer('service_id'));
            if (! $service) {
                $validator->errors()->add('service_id', 'Choose an available service.');

                return;
            }
            if (! in_array($this->input('source_path'), ['/', '/services', '/services/'.$service->slug], true)) {
                $validator->errors()->add('source_path', 'This enquiry must originate from a supported page for the selected service.');
            }
            foreach (['name', 'state', 'city', 'message'] as $field) {
                if (preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', $this->input($field))) {
                    $validator->errors()->add($field, 'Use ordinary plain text.');
                }
            }
        }];
    }
}
