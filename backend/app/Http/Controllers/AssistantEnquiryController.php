<?php

namespace App\Http\Controllers;

use App\Http\Requests\AssistantEnquiryRequest;
use App\Services\AssistantEnquiryReview;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssistantEnquiryController extends Controller
{
    public function review(AssistantEnquiryRequest $request, AssistantEnquiryReview $review): JsonResponse
    {
        return response()->json(['data' => $review->review($request, $request->validated())]);
    }

    public function store(AssistantEnquiryRequest $request, AssistantEnquiryReview $review): JsonResponse
    {
        return response()->json(['data' => ['reference' => $review->submit($request, $request->validated()), 'message' => 'Your enquiry was received.']], 201);
    }

    public function cancel(Request $request, AssistantEnquiryReview $review): JsonResponse
    {
        abort_if(array_diff(array_keys($request->all()), ['review_token']), 422, 'Unknown cancellation field.');
        $values = $request->validate(['review_token' => 'required|string|size:40|alpha_num']);
        $review->cancel($request, $values['review_token']);

        return response()->json(['data' => ['message' => 'Review cancelled.']]);
    }
}
