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

        return response()->json(['data' => $assistant->answer($values['question'], $context)]);
    }

    public function session(): JsonResponse
    {
        return response()->json(['data' => ['csrf_token' => csrf_token()]]);
    }
}
