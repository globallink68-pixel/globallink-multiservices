<?php

namespace App\Http\Controllers;

use App\Http\Requests\ChatRequest;
use App\Services\ChatRetrieval;
use App\Services\GeminiAssistant;
use Illuminate\Http\JsonResponse;

class ChatController extends Controller
{
    public function store(ChatRequest $request, ChatRetrieval $retrieval, GeminiAssistant $assistant): JsonResponse
    {
        $values = $request->validated();
        $context = $retrieval->retrieve($values['question'], $values['history'] ?? [], $values['service_slug'] ?? null);

        $answer = $assistant->answer($values['question'], $context);
        $answer['qualification'] = ['offered' => (bool) preg_match('/interested|apply|application|callback|contact me|call me|enquir|sign up|register|want/i', $values['question']), 'service' => count($context['services']) === 1 ? $context['services'][0] : null];

        return response()->json(['data' => $answer]);
    }

    public function session(): JsonResponse
    {
        return response()->json(['data' => ['csrf_token' => csrf_token()]]);
    }
}
