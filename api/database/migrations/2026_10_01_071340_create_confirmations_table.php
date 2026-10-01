<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('confirmations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('point_id')->constrained()->cascadeOnDelete();
            $table->uuid('device_id');
            $table->timestamp('created_at');

            // Одно устройство подтверждает точку один раз.
            $table->unique(['point_id', 'device_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('confirmations');
    }
};
