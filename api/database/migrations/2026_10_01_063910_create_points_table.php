<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('points', function (Blueprint $table) {
            $table->id();
            $table->foreignId('city_id')->constrained()->cascadeOnDelete();
            $table->string('address');
            $table->string('district')->nullable();
            $table->decimal('lat', 9, 6);
            $table->decimal('lng', 9, 6);
            $table->string('type', 16);
            $table->string('status', 16);
            $table->timestamp('status_changed_at')->nullable();
            $table->unsignedInteger('confirmations_count')->default(1);
            $table->unsignedInteger('pledges_count')->default(0);
            $table->timestamps();

            $table->index(['city_id', 'status']);
            // Поиск дублей рядом идёт по прямоугольнику вокруг точки.
            $table->index(['lat', 'lng']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('points');
    }
};
