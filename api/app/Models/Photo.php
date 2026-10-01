<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Photo extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['path', 'kind'];

    /**
     * Адрес относительный: фронтенд и API живут на одном домене.
     */
    public function url(): string
    {
        return '/storage/'.$this->path;
    }
}
