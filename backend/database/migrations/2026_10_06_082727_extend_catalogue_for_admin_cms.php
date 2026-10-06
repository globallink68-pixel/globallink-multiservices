<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $t): void {
            $t->boolean('is_admin')->default(false);
        });
        Schema::table('categories', function (Blueprint $t): void {
            $t->string('seo_title', 180)->nullable();
            $t->string('seo_description', 300)->nullable();
        });
        Schema::table('services', function (Blueprint $t): void {
            $t->string('icon_path')->nullable();
            $t->string('cta_text', 80)->default('Discuss this service');
        });
        Schema::table('service_content_items', function (Blueprint $t): void {
            $t->boolean('is_required')->default(true);
        });
        Schema::table('service_fees', function (Blueprint $t): void {
            $t->boolean('is_active')->default(true);
        });
        Schema::table('bank_service_details', function (Blueprint $t): void {
            $t->text('notes')->nullable();
            $t->text('disclaimer')->nullable();
        });
        Schema::create('audit_logs', function (Blueprint $t): void {
            $t->id();
            $t->foreignId('administrator_id')->nullable()->constrained('users')->nullOnDelete();
            $t->string('action', 60);
            $t->string('entity_type', 40);
            $t->unsignedBigInteger('entity_id')->nullable();
            $t->string('summary', 250);
            $t->timestamp('created_at')->useCurrent();
            $t->index(['entity_type', 'created_at']);
        });
        Schema::create('media_assets', function (Blueprint $t): void {
            $t->id();
            $t->uuid('uuid')->unique();
            $t->string('path')->unique();
            $t->string('mime', 40);
            $t->unsignedInteger('size');
            $t->foreignId('administrator_id')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('media_assets');
        Schema::dropIfExists('audit_logs');
        Schema::table('bank_service_details', fn (Blueprint $t) => $t->dropColumn(['notes', 'disclaimer']));
        Schema::table('service_fees', fn (Blueprint $t) => $t->dropColumn('is_active'));
        Schema::table('service_content_items', fn (Blueprint $t) => $t->dropColumn('is_required'));
        Schema::table('services', fn (Blueprint $t) => $t->dropColumn(['icon_path', 'cta_text']));
        Schema::table('categories', fn (Blueprint $t) => $t->dropColumn(['seo_title', 'seo_description']));
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn('is_admin'));
    }
};
