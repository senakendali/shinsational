<?php


namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Tenant;

class AppController extends Controller
{
    public function index()
    {
        return view('layouts.kol');
    }

    public function admin()
    {
        return view('layouts.admin'); // layout admin
    }

    public function loginAdmin()
    {
        return view('layouts.loginAdmin'); // layout login admin
    }

    
}
