<?php

namespace App\Http\Requests;

use App\Models\Service;

class AssistantEnquiryRequest extends StoreEnquiryRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return parent::rules() + ($this->routeIs('assistant-enquiry.submit') ? ['review_token' => 'required|string|size:40|alpha_num', 'confirmed' => 'required|accepted'] : []);
    }

    protected function prepareForValidation(): void
    {
        abort_if(array_diff(array_keys($this->all()), ['name', 'mobile', 'email', 'state', 'city', 'service_id', 'message', 'consent', 'website', 'review_token', 'confirmed']), 422, 'Use only the contact form fields.');
        parent::prepareForValidation();
        $service = is_scalar($this->input('service_id')) && ctype_digit((string) $this->input('service_id')) ? Service::published()->find($this->integer('service_id')) : null;
        $this->merge(['source_path' => $service ? '/services/'.$service->slug : '/']);
    }
}
