<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\CmsAudit;
use App\Services\EnquiryWorkflow;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class EnquiryController extends Controller
{
    private function query(): Builder
    {
        return DB::table('enquiries as e')->join('services as s', 's.id', '=', 'e.service_id');
    }

    public function index(Request $request): JsonResponse
    {
        abort_if(array_diff(array_keys($request->query()), ['search', 'service_id', 'status', 'from', 'to', 'page']), 422, 'Unknown enquiry filter.');
        $values = $request->validate([
            'search' => 'sometimes|string|max:120', 'service_id' => 'sometimes|integer|exists:services,id',
            'status' => ['sometimes', Rule::in(EnquiryWorkflow::STATUSES)], 'from' => 'sometimes|date_format:Y-m-d',
            'to' => 'sometimes|date_format:Y-m-d'.($request->filled('from') ? '|after_or_equal:from' : ''), 'page' => 'sometimes|integer|min:1|max:100000',
        ]);
        $query = $this->query();
        if (! empty($values['search'])) {
            $term = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $values['search']).'%';
            $query->where(function (Builder $query) use ($term): void {
                foreach (['e.reference', 'e.name', 'e.mobile', 'e.email', 'e.city'] as $column) {
                    $query->orWhereRaw($column." LIKE ? ESCAPE '!'", [$term]);
                }
            });
        }
        foreach (['status', 'service_id'] as $filter) {
            if (isset($values[$filter])) {
                $query->where('e.'.$filter, $values[$filter]);
            }
        }
        if (isset($values['from'])) {
            $query->where('e.created_at', '>=', $values['from'].' 00:00:00');
        }
        if (isset($values['to'])) {
            $query->where('e.created_at', '<', date('Y-m-d', strtotime($values['to'].' +1 day')).' 00:00:00');
        }

        return response()->json(['data' => $query->orderByDesc('e.created_at')->orderByDesc('e.id')->paginate(20, [
            'e.reference', 'e.name', 'e.mobile', 'e.email', 'e.state', 'e.city', 'e.status', 'e.created_at',
            'e.service_id', 's.title as service_title', 's.slug as service_slug',
        ], 'page', $values['page'] ?? 1)]);
    }

    public function show(string $reference): JsonResponse
    {
        $enquiry = $this->query()->where('e.reference', $reference)->first([
            'e.id', 'e.reference', 'e.name', 'e.mobile', 'e.email', 'e.state', 'e.city', 'e.message', 'e.source_path', 'e.status',
            'e.created_at', 'e.updated_at', 'e.consented_at', 'e.consent_version', 'e.service_id', 's.title as service_title', 's.slug as service_slug',
        ]);
        abort_unless($enquiry, 404);
        $id = $enquiry->id;
        unset($enquiry->id);
        $enquiry->history = DB::table('enquiry_status_history as h')->leftJoin('users as u', 'u.id', '=', 'h.changed_by')
            ->where('h.enquiry_id', $id)->orderByDesc('h.id')->get(['h.from_status', 'h.status', 'h.note', 'h.created_at', 'u.name as administrator']);
        $enquiry->notes = DB::table('enquiry_notes as n')->leftJoin('users as u', 'u.id', '=', 'n.administrator_id')
            ->where('n.enquiry_id', $id)->orderByDesc('n.id')->get(['n.body', 'n.created_at', 'u.name as administrator']);
        CmsAudit::record('viewed', 'enquiry', $id);

        return response()->json(['data' => $enquiry]);
    }

    public function status(Request $request, string $reference): JsonResponse
    {
        $values = $request->validate([
            'status' => ['required', Rule::in(EnquiryWorkflow::STATUSES)], 'expected_status' => ['required', Rule::in(EnquiryWorkflow::STATUSES)],
            'note' => 'nullable|string|max:3000',
        ]);
        DB::transaction(function () use ($request, $reference, $values): void {
            $enquiry = DB::table('enquiries')->where('reference', $reference)->lockForUpdate()->first();
            abort_unless($enquiry, 404);
            abort_if($enquiry->status !== $values['expected_status'], 409, 'This lead changed. Reload it before updating.');
            abort_if($enquiry->status === $values['status'], 422, 'Choose a different status.');
            DB::table('enquiries')->where('id', $enquiry->id)->update(['status' => $values['status'], 'updated_at' => now()]);
            DB::table('enquiry_status_history')->insert([
                'enquiry_id' => $enquiry->id, 'from_status' => $enquiry->status, 'status' => $values['status'],
                'changed_by' => $request->user()->id, 'note' => isset($values['note']) ? trim($values['note']) : null, 'created_at' => now(),
            ]);
            CmsAudit::record('status_changed', 'enquiry', $enquiry->id);
        });

        return response()->json(['data' => ['message' => 'Status updated.']]);
    }

    public function note(Request $request, string $reference): JsonResponse
    {
        $values = $request->validate(['body' => 'required|string|min:2|max:3000']);
        DB::transaction(function () use ($request, $reference, $values): void {
            $enquiry = DB::table('enquiries')->where('reference', $reference)->lockForUpdate()->first();
            abort_unless($enquiry, 404);
            DB::table('enquiry_notes')->insert(['enquiry_id' => $enquiry->id, 'administrator_id' => $request->user()->id, 'body' => trim($values['body']), 'created_at' => now()]);
            CmsAudit::record('note_added', 'enquiry', $enquiry->id);
        });

        return response()->json(['data' => ['message' => 'Internal note added.']]);
    }
}
