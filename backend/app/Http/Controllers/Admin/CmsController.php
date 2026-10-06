<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SaveServiceRequest;
use App\Models\Service;
use App\Services\CmsAudit;
use App\Services\EnquiryWorkflow;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CmsController extends Controller
{
    public function dashboard(): JsonResponse
    {
        return response()->json(['data' => [
            'total_services' => DB::table('services')->count(), 'published_services' => DB::table('services')->where('is_published', true)->count(), 'draft_services' => DB::table('services')->where('is_published', false)->count(),
            'categories' => DB::table('categories')->count(), 'active_providers' => DB::table('providers')->where('is_active', true)->count(), 'faqs' => DB::table('faqs')->count(),
            'recent_changes' => DB::table('audit_logs')->latest('id')->limit(8)->get(['action', 'entity_type', 'entity_id', 'summary', 'created_at']),
            'attention' => DB::table('services')->whereNull('hero_image')->orderBy('id')->limit(8)->get(['id', 'title']),
            'lead_counts' => collect(EnquiryWorkflow::STATUSES)->mapWithKeys(fn (string $status) => [$status => DB::table('enquiries')->where('status', $status)->count()]),
        ]]);
    }

    public function services(Request $r): JsonResponse
    {
        $v = $r->validate(['search' => 'sometimes|string|max:160', 'category_id' => 'sometimes|integer|exists:categories,id', 'publication' => 'sometimes|in:published,draft']);
        $q = DB::table('services')->orderBy('sort_order')->orderBy('id');
        if (! empty($v['search'])) {
            $q->where('title', 'like', '%'.$v['search'].'%');
        }
        if (isset($v['category_id'])) {
            $q->where('category_id', $v['category_id']);
        }
        if (isset($v['publication'])) {
            $q->where('is_published', $v['publication'] === 'published');
        }

        return response()->json(['data' => $q->limit(250)->get()]);
    }

    public function service(int $id): JsonResponse
    {
        $s = (array) DB::table('services')->find($id);
        abort_unless($s, 404);
        foreach (['sections' => 'service_sections', 'items' => 'service_content_items', 'fees' => 'service_fees', 'faqs' => 'faqs'] as $key => $table) {
            $s[$key] = DB::table($table)->where('service_id', $id)->orderBy('sort_order')->orderBy('id')->get();
        }
        $s['providers'] = DB::table('bank_service_details')->where('service_id', $id)->orderBy('id')->get()->map(function ($p) {
            $p->eligibility_overrides = json_decode($p->eligibility_overrides ?? '[]', true);
            $p->document_overrides = json_decode($p->document_overrides ?? '[]', true);

            return $p;
        });

        return response()->json(['data' => $s]);
    }

    public function saveService(SaveServiceRequest $r, ?int $id = null): JsonResponse
    {
        $v = $r->validated();
        $service = DB::transaction(function () use ($v, $id) {
            $s = $id ? Service::findOrFail($id) : new Service;
            $wasPublished = $s->is_published;
            $s->fill(array_diff_key($v, array_flip(['sections', 'items', 'fees', 'providers', 'faqs'])));
            $s->save();
            foreach (['sections' => 'service_sections', 'items' => 'service_content_items', 'fees' => 'service_fees', 'faqs' => 'faqs'] as $key => $table) {
                DB::table($table)->where('service_id', $s->id)->delete();
                $columns = match ($key) {
                    'sections' => ['title', 'body'],'items' => ['kind', 'label', 'body', 'is_required'],'fees' => ['label', 'amount_paise', 'currency', 'notes', 'is_verified', 'is_active'],'faqs' => ['question', 'answer', 'is_active']
                };
                foreach ($v[$key] as $order => $row) {
                    $safe = array_intersect_key($row, array_flip($columns));
                    DB::table($table)->insert($safe + ['service_id' => $s->id, 'sort_order' => $order, 'created_at' => now(), 'updated_at' => now()]);
                }
            }
            DB::table('bank_service_details')->where('service_id', $s->id)->delete();
            foreach ($v['providers'] as $p) {
                $safe = array_intersect_key($p, array_flip(['provider_id', 'fee_information', 'processing_notes', 'notes', 'disclaimer']));
                DB::table('bank_service_details')->insert($safe + ['service_id' => $s->id, 'eligibility_overrides' => json_encode($p['eligibility_overrides']), 'document_overrides' => json_encode($p['document_overrides']), 'created_at' => now(), 'updated_at' => now()]);
            }
            CmsAudit::record($id ? 'updated' : 'created', 'service', $s->id);
            if ((bool) $wasPublished !== $s->is_published) {
                CmsAudit::record($s->is_published ? 'published' : 'unpublished', 'service', $s->id);
            }

            return $s;
        });

        return $this->service($service->id);
    }

    public function publication(Request $r, int $id): JsonResponse
    {
        $v = $r->validate(['is_published' => 'required|boolean']);
        DB::transaction(function () use ($id, $v) {
            $s = Service::findOrFail($id);
            $s->update($v);
            CmsAudit::record($v['is_published'] ? 'published' : 'unpublished', 'service', $id);
        });

        return response()->json(['data' => ['message' => 'Publication updated.']]);
    }

    public function categories(): JsonResponse
    {
        return response()->json(['data' => DB::table('categories')->orderBy('sort_order')->orderBy('id')->get()]);
    }

    public function saveCategory(Request $r, ?int $id = null): JsonResponse
    {
        if ($id) {
            abort_unless(DB::table('categories')->find($id), 404);
        }
        $v = $r->validate(['name' => 'required|string|max:120', 'slug' => ['required', 'string', 'max:120', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('categories', 'slug')->ignore($id)], 'summary' => 'required|string|max:5000', 'icon' => 'required|in:bank,code,growth,business,payments,shield,spark', 'sort_order' => 'required|integer|min:0|max:10000', 'is_active' => 'required|boolean', 'seo_title' => 'nullable|string|max:180', 'seo_description' => 'nullable|string|max:300']);
        if ($id && DB::table('categories')->where('id', $id)->value('slug') !== $v['slug']) {
            throw ValidationException::withMessages(['slug' => 'Existing slugs are locked to preserve URLs.']);
        }

        return $this->saveRow('categories', 'category', $v, $id);
    }

    public function providers(): JsonResponse
    {
        return response()->json(['data' => DB::table('providers')->orderBy('sort_order')->orderBy('id')->get()]);
    }

    public function saveProvider(Request $r, ?int $id = null): JsonResponse
    {
        if ($id) {
            abort_unless(DB::table('providers')->find($id), 404);
        }
        $v = $r->validate(['name' => 'required|string|max:120', 'code' => ['required', 'string', 'max:40', 'regex:/^[A-Z0-9_-]+$/', Rule::unique('providers', 'code')->ignore($id)], 'description' => 'nullable|string|max:5000', 'logo_path' => ['nullable', 'string', SaveServiceRequest::mediaRule()], 'is_active' => 'required|boolean', 'sort_order' => 'required|integer|min:0|max:10000']);

        return $this->saveRow('providers', 'provider', $v, $id);
    }

    public function faqs(): JsonResponse
    {
        return response()->json(['data' => DB::table('faqs')->orderBy('sort_order')->orderBy('id')->get()]);
    }

    public function saveFaq(Request $r, ?int $id = null): JsonResponse
    {
        if ($id) {
            abort_unless(DB::table('faqs')->find($id), 404);
        }
        $v = $r->validate(['question' => 'required|string|max:300', 'answer' => 'required|string|max:10000', 'service_id' => 'nullable|integer|exists:services,id', 'is_active' => 'required|boolean', 'sort_order' => 'required|integer|min:0|max:10000']);

        return $this->saveRow('faqs', 'faq', $v, $id);
    }

    private function saveRow(string $table, string $entity, array $v, ?int $id): JsonResponse
    {
        $id = DB::transaction(function () use ($table, $entity, $v, $id) {
            $v['updated_at'] = now();
            if ($id) {
                DB::table($table)->where('id', $id)->update($v);
            } else {
                $id = DB::table($table)->insertGetId($v + ['created_at' => now()]);
            }CmsAudit::record('saved', $entity, $id);

            return $id;
        });

        return response()->json(['data' => DB::table($table)->find($id)]);
    }

    public function settings(): JsonResponse
    {
        return response()->json(['data' => DB::table('site_settings')->whereIn('key', array_keys($this->settingsRules()))->pluck('value', 'key')]);
    }

    private function settingsRules(): array
    {
        return ['company_name' => 'required|string|min:2|max:120', 'tagline' => 'nullable|string|max:160', 'about_summary' => 'nullable|string|max:5000', 'phone' => 'required|string|regex:/^(?=(?:\D*\d){8,15}\D*$)[+0-9 ()-]{8,25}$/', 'email' => 'required|email|max:254', 'whatsapp' => 'nullable|string|regex:/^[0-9]{10,15}$/', 'address' => 'nullable|string|max:1000',
            'facebook' => 'nullable|url:https|max:500', 'instagram' => 'nullable|url:https|max:500', 'linkedin' => 'nullable|url:https|max:500', 'youtube' => 'nullable|url:https|max:500',
            'logo' => ['nullable', 'string', SaveServiceRequest::mediaRule()], 'favicon' => ['nullable', 'string', SaveServiceRequest::mediaRule()], 'footer_logo' => ['nullable', 'string', SaveServiceRequest::mediaRule()],
            'footer' => 'required|string|max:2000', 'copyright' => 'nullable|string|max:250', 'seo_title' => 'required|string|max:180', 'seo_description' => 'required|string|max:300'];
    }

    public function saveSettings(Request $r): JsonResponse
    {
        $rules = $this->settingsRules();
        abort_if(array_diff(array_keys($r->all()), array_keys($rules)), 422, 'Unknown settings field.');
        $v = $r->validate($rules);
        DB::transaction(function () use ($v) {
            foreach ($v as $key => $value) {
                DB::table('site_settings')->updateOrInsert(['key' => $key], ['value' => $value ?? '', 'is_public' => true, 'updated_at' => now()]);
            }CmsAudit::record('updated', 'settings');
        });

        return $this->settings();
    }

    public function audit(Request $r): JsonResponse
    {
        $v = $r->validate(['entity_type' => 'sometimes|in:service,category,provider,faq,settings,administrator,media,enquiry', 'action' => 'sometimes|string|max:60', 'page' => 'sometimes|integer|min:1|max:100000']);
        $q = DB::table('audit_logs as a')->leftJoin('users as u', 'u.id', '=', 'a.administrator_id')->orderByDesc('a.id');
        foreach (['entity_type', 'action'] as $key) {
            if (isset($v[$key])) {
                $q->where('a.'.$key, $v[$key]);
            }
        }

        return response()->json(['data' => $q->paginate(30, ['a.id', 'a.action', 'a.entity_type', 'a.entity_id', 'a.summary', 'a.created_at', 'u.name as administrator'], 'page', $v['page'] ?? 1)]);
    }
}
