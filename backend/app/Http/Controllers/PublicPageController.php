<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class PublicPageController extends Controller
{
    public function show(Request $request, ?string $slug = null): Response
    {
        abort_if($request->is('api', 'api/*'), 404);
        $settings = DB::table('site_settings')->where('is_public', true)->whereIn('key', ['company_name', 'seo_title', 'seo_description', 'logo'])->pluck('value', 'key');
        $company = $settings['company_name'] ?? config('app.name');
        $title = $settings['seo_title'] ?? $company;
        $description = $settings['seo_description'] ?? '';
        $image = $settings['logo'] ?? '';
        $status = 200;
        $indexable = true;
        $path = '/';
        $overview = '';
        if ($request->is('admin', 'admin/*')) {
            $title = 'Administrator workspace | '.$company;
            $description = 'Authorized administrator access.';
            $indexable = false;
        } elseif ($request->routeIs('page.service')) {
            $service = Service::published()->where('slug', $slug)->first();
            if (! $service) {
                $status = 404;
                $indexable = false;
                $title = 'Service unavailable | '.$company;
                $description = 'Explore the currently published catalogue.';
            } else {
                $path = '/services/'.$service->slug;
                $title = $service->seo_title ?: $service->title.' | '.$company;
                $description = $service->seo_description ?: $service->short_description;
                $image = $service->hero_image ?: $image;
                $overview = $service->description;
            }
        } elseif ($request->routeIs('page.catalogue')) {
            $path = '/services';
            $category = Category::where('is_active', true)->where('slug', (string) $request->query('category'))->first();
            $title = 'Explore services | '.$company;
            $description = $settings['seo_description'] ?? '';
            if ($category) {
                $path .= '?category='.$category->slug;
                $title = $category->seo_title ?: $category->name.' | '.$company;
                $description = $category->seo_description ?: $category->summary;
            } elseif ($request->has('category')) {
                $indexable = false;
            }
        } elseif (! $request->routeIs('page.home')) {
            $status = 404;
            $indexable = false;
            $title = 'Page not found | '.$company;
            $description = 'Explore the currently published catalogue.';
        }
        $base = rtrim(config('public_site.url'), '/');
        $canonical = $indexable ? $base.$path : null;
        $image = preg_match('~^/api/media/[a-f0-9-]{36}$~', $image) ? $base.$image : null;
        $manifestPath = config('public_site.build_path').'/.vite/manifest.json';
        $assets = is_file($manifestPath) ? (json_decode(file_get_contents($manifestPath), true)['index.html'] ?? null) : null;
        // Tests may inspect metadata without a generated bundle; production must fail closed.
        abort_if(! $assets && ! app()->environment('testing'), 503, 'The website build is unavailable.');
        $services = $indexable ? Service::published()->orderBy('sort_order')->orderBy('id')->get(['title', 'slug']) : collect();

        return response()->view('public-site', compact('title', 'description', 'canonical', 'image', 'indexable', 'assets', 'services', 'overview'), $status);
    }

    public function robots(): Response
    {
        return response("User-agent: *\nDisallow: /admin\nDisallow: /api/\nAllow: /api/site\nAllow: /api/services\nAllow: /api/media/\nDisallow: /up\nSitemap: ".rtrim(config('public_site.url'), '/')."/sitemap.xml\n", 200, ['Content-Type' => 'text/plain; charset=UTF-8']);
    }

    public function sitemap(): Response
    {
        $base = rtrim(config('public_site.url'), '/');
        $paths = ['/', '/services'];
        foreach (Category::where('is_active', true)->orderBy('id')->pluck('slug') as $slug) {
            $paths[] = '/services?category='.$slug;
        }
        foreach (Service::published()->orderBy('id')->pluck('slug') as $slug) {
            $paths[] = '/services/'.$slug;
        }
        $xml = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
        foreach ($paths as $path) {
            $xml .= '<url><loc>'.htmlspecialchars($base.$path, ENT_XML1 | ENT_QUOTES, 'UTF-8').'</loc></url>';
        }

        return response($xml.'</urlset>', 200, ['Content-Type' => 'application/xml; charset=UTF-8']);
    }
}
