<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ChatRequest extends FormRequest
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
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'question' => 'required|string|min:3|max:500',
            'history' => 'sometimes|array|max:6',
            'history.*' => 'required|array:role,content',
            'history.*.role' => 'required|in:user,assistant',
            'history.*.content' => 'required|string|max:500',
            'service_slug' => 'nullable|string|max:120|regex:/^[a-z0-9-]+$/',
        ];
    }

    protected function prepareForValidation(): void
    {
        abort_if(array_diff(array_keys($this->all()), ['question', 'history', 'service_slug']), 422, 'Unknown chat field.');
    }
}
