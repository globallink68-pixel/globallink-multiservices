<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Service;
use Database\Seeders\CatalogueSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PublicSeoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CatalogueSeeder::class);
        config(['public_site.url' => 'https://www.example.test']);
    }

    public function test_all_published_services_have_server_rendered_canonical_and_social_metadata(): void
    {
        foreach (Service::published()->get() as $service) {
            $r = $this->get('/services/'.$service->slug)->assertOk()->assertSee('href="https://www.example.test/services/'.$service->slug.'"', false)->assertSee('property="og:title"', false)->assertSee('name="twitter:card"', false)->assertSee('content="index, follow"', false)->assertSee('name="description"', false);
            $r->assertSee(e($service->seo_title ?: $service->title.' | '.DB::table('site_settings')->where('key', 'company_name')->value('value')), false);
            $r->assertDontSee('ratingValue')->assertDontSee('aggregateRating');
        }
    }

    public function test_site_category_and_private_routes_have_correct_indexability(): void
    {
        $this->get('/')->assertOk()->assertSee('href="https://www.example.test/"', false);
        $this->get('/services?category=software-it&utm_source=test')->assertOk()->assertSee('href="https://www.example.test/services?category=software-it"', false);
        foreach (['/admin', '/admin/login', '/admin/enquiries', '/services/absent', '/unknown', '/services?category=absent'] as $path) {
            $r = $this->get($path)->assertStatus(str_contains($path, 'absent') && ! str_contains($path, '?') || $path === '/unknown' ? 404 : 200)->assertSee('content="noindex, nofollow"', false)->assertDontSee('rel="canonical"', false);
            if (str_starts_with($path, '/admin')) {
                $r->assertHeader('X-Robots-Tag', 'noindex, nofollow')->assertDontSee('GL-');
            }
        }
        $this->getJson('/api/unknown')->assertNotFound()->assertHeader('Content-Type', 'application/json');
    }

    public function test_sitemap_and_robots_use_configured_origin_and_exclude_unpublished_and_private_routes(): void
    {
        Service::where('slug', 'bank-csp')->update(['is_published' => false]);
        Category::where('slug', 'software-it')->update(['is_active' => false]);
        $this->get('/robots.txt')->assertOk()->assertSee('Disallow: /admin')->assertSee('Disallow: /api/')->assertSee('Allow: /api/services')->assertSee('Allow: /api/media/')->assertSee('Sitemap: https://www.example.test/sitemap.xml');
        $r = $this->get('/sitemap.xml')->assertOk()->assertHeader('Content-Type', 'application/xml; charset=UTF-8')->assertDontSee('/admin')->assertDontSee('/api/')->assertDontSee('bank-csp')->assertDontSee('website-development')->assertDontSee('category=software-it');
        $xml = simplexml_load_string($r->getContent());
        $this->assertNotFalse($xml);
        $this->assertCount(Service::published()->count() + Category::where('is_active', true)->count() + 2, $xml->url);
        foreach ($xml->url as $url) {
            $this->assertStringStartsWith('https://www.example.test/', (string) $url->loc);
        }
    }

    public function test_cms_metadata_is_escaped_and_private_settings_cannot_leak(): void
    {
        Service::where('slug', 'bank-csp')->update(['seo_title' => '"><script>alert(1)</script>', 'seo_description' => '" onload="alert(1)']);
        DB::table('site_settings')->insert(['key' => 'private_secret', 'value' => 'never-public', 'is_public' => false]);
        $this->get('/services/bank-csp')->assertOk()->assertSee('&lt;script&gt;', false)->assertDontSee('<script>alert(1)</script>', false)->assertDontSee('never-public');
        $this->getJson('/api/site')->assertOk()->assertJsonPath('data.public_url', 'https://www.example.test')->assertDontSee('never-public');
    }
}
