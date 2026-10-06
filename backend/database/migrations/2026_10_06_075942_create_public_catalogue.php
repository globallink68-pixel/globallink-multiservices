<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $t): void {
            $t->id();
            $t->string('name', 120);
            $t->string('slug', 120)->unique();
            $t->text('summary');
            $t->string('icon', 40)->default('spark');
            $t->unsignedInteger('sort_order')->default(0);
            $t->boolean('is_active')->default(true)->index();
            $t->timestamps();
        });
        Schema::create('services', function (Blueprint $t): void {
            $t->id();
            $t->foreignId('category_id')->constrained()->restrictOnDelete();
            $t->string('title', 160);
            $t->string('slug', 160)->unique();
            $t->string('short_description', 400);
            $t->text('description');
            $t->string('icon', 40)->default('spark');
            $t->string('hero_image')->nullable();
            $t->boolean('is_published')->default(false)->index();
            $t->boolean('featured')->default(false);
            $t->unsignedInteger('sort_order')->default(0);
            $t->string('seo_title', 180)->nullable();
            $t->string('seo_description', 300)->nullable();
            $t->timestamps();
        });
        Schema::create('service_sections', function (Blueprint $t): void {
            $t->id();
            $t->foreignId('service_id')->constrained()->cascadeOnDelete();
            $t->string('title', 160);
            $t->text('body');
            $t->unsignedInteger('sort_order')->default(0);
            $t->timestamps();
        });
        Schema::create('service_content_items', function (Blueprint $t): void {
            $t->id();
            $t->foreignId('service_id')->constrained()->cascadeOnDelete();
            $t->enum('kind', ['benefit', 'eligibility', 'document', 'feature', 'process', 'note', 'term']);
            $t->string('label', 300);
            $t->text('body')->nullable();
            $t->unsignedInteger('sort_order')->default(0);
            $t->timestamps();
            $t->unique(['service_id', 'kind', 'label']);
            $t->index(['service_id', 'kind', 'sort_order']);
        });
        Schema::create('service_fees', function (Blueprint $t): void {
            $t->id();
            $t->foreignId('service_id')->constrained()->cascadeOnDelete();
            $t->string('label', 160);
            $t->unsignedBigInteger('amount_paise')->nullable();
            $t->char('currency', 3)->default('INR');
            $t->text('notes')->nullable();
            $t->boolean('is_verified')->default(false);
            $t->unsignedInteger('sort_order')->default(0);
            $t->timestamps();
        });
        Schema::create('providers', function (Blueprint $t): void {
            $t->id();
            $t->string('name', 120);
            $t->string('code', 40)->unique();
            $t->string('logo_path')->nullable();
            $t->text('description')->nullable();
            $t->boolean('is_active')->default(true)->index();
            $t->unsignedInteger('sort_order')->default(0);
            $t->timestamps();
        });
        Schema::create('bank_service_details', function (Blueprint $t): void {
            $t->id();
            $t->foreignId('service_id')->constrained()->cascadeOnDelete();
            $t->foreignId('provider_id')->constrained('providers')->cascadeOnDelete();
            $t->json('eligibility_overrides')->nullable();
            $t->json('document_overrides')->nullable();
            $t->text('fee_information')->nullable();
            $t->text('processing_notes')->nullable();
            $t->timestamps();
            $t->unique(['service_id', 'provider_id']);
        });
        Schema::create('faqs', function (Blueprint $t): void {
            $t->id();
            $t->foreignId('service_id')->nullable()->constrained()->cascadeOnDelete();
            $t->string('question', 300);
            $t->text('answer');
            $t->boolean('is_active')->default(true);
            $t->unsignedInteger('sort_order')->default(0);
            $t->timestamps();
            $t->index(['service_id', 'is_active', 'sort_order']);
        });
        Schema::create('site_settings', function (Blueprint $t): void {
            $t->id();
            $t->string('key', 80)->unique();
            $t->text('value');
            $t->boolean('is_public')->default(false);
            $t->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        foreach (['site_settings', 'faqs', 'bank_service_details', 'providers', 'service_fees', 'service_content_items', 'service_sections', 'services', 'categories'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
