<?php

namespace Tests\Feature;

use App\Models\Service;
use App\Models\User;
use Database\Seeders\CatalogueSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdminMediaTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CatalogueSeeder::class);
        Storage::fake('local');
        $u = User::factory()->create();
        $u->forceFill(['is_admin' => true])->save();
        $this->actingAs($u);
    }

    public function test_raster_upload_is_reencoded_and_only_published_references_are_public(): void
    {
        $r = $this->postJson('/api/admin/media', ['image' => UploadedFile::fake()->image('logo.jpg', 80, 40)])->assertCreated();
        $url = $r->json('data.url');
        $preview = $r->json('data.preview_url');
        $m = DB::table('media_assets')->first();
        $this->assertSame('image/png', $m->mime);
        Storage::disk('local')->assertExists($m->path);
        $this->assertSame("\x89PNG", substr(Storage::disk('local')->get($m->path), 0, 4));
        $this->get($preview)->assertOk()->assertHeader('Content-Type', 'image/png');
        $this->get($url)->assertNotFound();
        $s = Service::where('slug', 'bank-csp')->firstOrFail();
        $s->update(['hero_image' => $url]);
        $this->get($url)->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');
        $s->update(['is_published' => false]);
        $this->get($url)->assertNotFound();
        $this->assertDatabaseHas('audit_logs', ['entity_type' => 'media', 'action' => 'uploaded']);
    }

    public function test_logo_setting_and_active_associated_provider_allow_public_media(): void
    {
        $r = $this->postJson('/api/admin/media', ['image' => UploadedFile::fake()->image('logo.png')]);
        $url = $r->json('data.url');
        DB::table('site_settings')->where('key', 'logo')->update(['value' => $url]);
        $this->get($url)->assertOk();
        DB::table('site_settings')->where('key', 'logo')->update(['value' => '']);
        DB::table('providers')->where('code', 'SBI')->update(['logo_path' => $url]);
        $this->get($url)->assertOk();
        DB::table('providers')->where('code', 'SBI')->update(['is_active' => false]);
        $this->get($url)->assertNotFound();
    }

    public function test_script_svg_and_spoofed_images_are_rejected(): void
    {
        foreach ([UploadedFile::fake()->createWithContent('evil.php', '<?php echo 1;'), UploadedFile::fake()->createWithContent('evil.svg', '<svg onload="alert(1)"></svg>'), UploadedFile::fake()->createWithContent('evil.png', 'not an image')] as $file) {
            $this->postJson('/api/admin/media', ['image' => $file])->assertUnprocessable()->assertJsonValidationErrors('image');
        }
        $this->assertDatabaseCount('media_assets', 0);
    }

    public function test_real_raster_with_executable_filename_is_rejected(): void
    {
        $raster = UploadedFile::fake()->image('sample.png');
        $file = UploadedFile::fake()->createWithContent('sample.php', file_get_contents($raster->getRealPath()));
        $this->postJson('/api/admin/media', ['image' => $file])->assertUnprocessable();
        $this->assertDatabaseCount('media_assets', 0);
    }

    public function test_oversized_file_and_pixel_bomb_are_rejected(): void
    {
        $this->postJson('/api/admin/media', ['image' => UploadedFile::fake()->image('large.png')->size(2049)])->assertUnprocessable();
        $this->postJson('/api/admin/media', ['image' => UploadedFile::fake()->image('pixels.png', 2200, 2200)])->assertUnprocessable();
        $this->assertDatabaseCount('media_assets', 0);
    }

    public function test_arbitrary_paths_cannot_be_assigned_or_downloaded(): void
    {
        $this->putJson('/api/admin/providers/'.DB::table('providers')->where('code', 'SBI')->value('id'), ['name' => 'Provider', 'code' => 'SBI', 'is_active' => true, 'sort_order' => 0, 'logo_path' => '/storage/../../.env'])->assertUnprocessable();
        $this->getJson('/api/media/not-a-uuid')->assertNotFound();
        $this->getJson('/api/media/11111111-1111-1111-1111-111111111111')->assertNotFound();
    }
}
