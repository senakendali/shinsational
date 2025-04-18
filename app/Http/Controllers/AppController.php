<?php


namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Tenant;

class AppController extends Controller
{
    public function index()
    {
        return view('layouts.app');
    }
}
