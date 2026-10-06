<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Service;
use App\Services\CmsAudit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MediaController extends Controller
{
    public function upload(Request $r): JsonResponse
    {
        $r->validate(['image' => 'required|file|image|mimes:jpg,jpeg,png,webp|max:2048']);
        $file = $r->file('image');
        $info = @getimagesize($file->getRealPath());
        if (! in_array(strtolower($file->getClientOriginalExtension()), ['jpg', 'jpeg', 'png', 'webp'], true) || ! $info || ! in_array($info['mime'], ['image/jpeg', 'image/png', 'image/webp'], true) || $info[0] * $info[1] > 4000000) {
            throw ValidationException::withMessages(['image' => 'Use a JPEG, PNG or WebP image up to 2 MB and 4 million pixels.']);
        }
        $image = @imagecreatefromstring(file_get_contents($file->getRealPath()));
        if (! $image) {
            throw ValidationException::withMessages(['image' => 'This image could not be decoded.']);
        }
        imagealphablending($image, false);
        imagesavealpha($image, true);
        if (max($info[0], $info[1]) > 1800) {
            $new = imagescale($image, (int) round($info[0] * 1800 / max($info[0], $info[1])), (int) round($info[1] * 1800 / max($info[0], $info[1])));
            imagedestroy($image);
            $image = $new;
        }
        ob_start();
        imagepng($image, null, 6);
        $bytes = ob_get_clean();
        imagedestroy($image);
        $uuid = (string) Str::uuid();
        $path = 'cms/'.$uuid.'.png';
        abort_unless(Storage::disk('local')->put($path, $bytes), 503, 'Image could not be stored.');
        try {
            DB::transaction(function () use ($uuid, $path, $bytes, $r) {
                $id = DB::table('media_assets')->insertGetId(['uuid' => $uuid, 'path' => $path, 'mime' => 'image/png', 'size' => strlen($bytes), 'administrator_id' => $r->user()->id, 'created_at' => now(), 'updated_at' => now()]);
                CmsAudit::record('uploaded', 'media', $id);
            });
        } catch (\Throwable $e) {
            Storage::disk('local')->delete($path);
            throw $e;
        }

        return response()->json(['data' => ['url' => '/api/media/'.$uuid, 'preview_url' => '/api/admin/media/'.$uuid]], 201);
    }

    public function show(Request $r, string $uuid): StreamedResponse
    {
        $m = DB::table('media_assets')->where('uuid', $uuid)->first();
        abort_unless($m, 404);
        $url = '/api/media/'.$uuid;
        if (! $r->routeIs('admin.media.show')) {
            $setting = DB::table('site_settings')->where('is_public', true)->whereIn('key', ['logo', 'favicon', 'footer_logo'])->where('value', $url)->exists();
            $service = Service::published()->where(fn ($q) => $q->where('hero_image', $url)->orWhere('icon_path', $url))->exists();
            $provider = DB::table('providers as p')->join('bank_service_details as d', 'd.provider_id', '=', 'p.id')->join('services as s', 's.id', '=', 'd.service_id')->join('categories as c', 'c.id', '=', 's.category_id')->where('p.logo_path', $url)->where('p.is_active', true)->where('s.is_published', true)->where('c.is_active', true)->exists();
            abort_unless($setting || $service || $provider, 404);
        }
        abort_unless(Storage::disk('local')->exists($m->path), 404);

        return Storage::disk('local')->response($m->path, null, ['Content-Type' => $m->mime, 'X-Content-Type-Options' => 'nosniff', 'Content-Security-Policy' => "default-src 'none'; sandbox"], 'inline');
    }
}
