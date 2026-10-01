<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('points', function (Blueprint $table) {
            // Служебные поля отметки: наружу не отдаются, нужны автору и модератору.
            $table->uuid('author_device_id')->nullable()->index();
            $table->text('comment')->nullable();
            $table->string('contact', 100)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('points', function (Blueprint $table) {
            $table->dropIndex(['author_device_id']);
            $table->dropColumn(['author_device_id', 'comment', 'contact']);
        });
    }
};
