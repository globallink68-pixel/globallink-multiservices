<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('enquiries', function (Blueprint $table): void {
            $table->id();
            $table->string('reference', 30)->unique();
            $table->foreignId('service_id')->constrained()->restrictOnDelete();
            $table->string('name', 120);
            $table->string('mobile', 15);
            $table->string('email', 254)->nullable();
            $table->string('state', 80);
            $table->string('city', 100);
            $table->text('message');
            $table->string('source_path', 200);
            $table->timestamp('consented_at');
            $table->string('consent_version', 30);
            $table->string('status', 20)->default('NEW');
            $table->char('fingerprint', 64)->index();
            $table->timestamps();
            $table->index(['status', 'created_at']);
            $table->index(['service_id', 'created_at']);
            $table->index('created_at');
        });
        Schema::create('enquiry_status_history', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('enquiry_id')->constrained()->cascadeOnDelete();
            $table->string('from_status', 20)->nullable();
            $table->string('status', 20);
            $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('note')->nullable();
            $table->timestamp('created_at');
            $table->index(['enquiry_id', 'id']);
        });
        Schema::create('enquiry_notes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('enquiry_id')->constrained()->cascadeOnDelete();
            $table->foreignId('administrator_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('body');
            $table->timestamp('created_at');
            $table->index(['enquiry_id', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('enquiry_notes');
        Schema::dropIfExists('enquiry_status_history');
        Schema::dropIfExists('enquiries');
    }
};
