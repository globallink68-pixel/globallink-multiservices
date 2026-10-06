<?php

namespace App\Http\Controllers;

use App\Http\Resources\ServiceResource;
use App\Models\Category;
use App\Models\Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class PublicCatalogueController extends Controller
{
    public function site(): JsonResponse
    {
        $settings = DB::table('site_settings')->where('is_public', true)->whereIn('key', ['company_name', 'phone', 'email', 'whatsapp', 'address', 'logo', 'social_links', 'footer', 'seo_title', 'seo_description', 'tagline', 'about_summary', 'facebook', 'instagram', 'linkedin', 'youtube', 'favicon', 'footer_logo', 'copyright'])->pluck('value', 'key');
        $categories = Category::where('is_active', true)->orderBy('sort_order')->orderBy('id')->get(['id', 'name', 'slug', 'summary', 'icon', 'seo_title', 'seo_description']);
        $faqs = DB::table('faqs')->whereNull('service_id')->where('is_active', true)->orderBy('sort_order')->orderBy('id')->get(['question', 'answer']);

        return response()->json(['data' => compact('settings', 'categories', 'faqs')]);
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        abort_if(array_diff(array_keys($request->query()), ['category']), 422, 'Unknown catalogue filter.');
        $filters = $request->validate(['category' => 'sometimes|string|max:120|regex:/^[a-z0-9-]+$/']);
        $q = Service::published()->with('category')->orderBy('sort_order')->orderBy('id');
        if (isset($filters['category'])) {
            $q->whereHas('category', fn ($c) => $c->where('slug', $filters['category']));
        }

        return ServiceResource::collection($q->limit(100)->get());
    }

    public function show(string $slug): ServiceResource
    {
        return new ServiceResource(Service::published()->with('category')->where('slug', $slug)->firstOrFail());
    }
}
