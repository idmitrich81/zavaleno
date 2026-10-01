<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Confirmation extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['device_id'];
}
