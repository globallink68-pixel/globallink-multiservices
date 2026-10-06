<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreEnquiryRequest;
use App\Services\EnquiryWorkflow;
use Illuminate\Http\JsonResponse;

class EnquiryController extends Controller
{
    public function session(): JsonResponse
    {
        return response()->json(['data' => ['csrf_token' => csrf_token()]]);
    }

    public function store(StoreEnquiryRequest $request): JsonResponse
    {
        $reference = EnquiryWorkflow::submit($request->validated());

        return response()->json(['data' => ['reference' => $reference, 'message' => 'Your enquiry was received. Keep this reference for follow-up.']], 201);
    }
}
