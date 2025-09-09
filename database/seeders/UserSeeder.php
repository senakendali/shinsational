<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            [
                'name'  => 'Admin',
                'email' => 'admin@dreamxbtlaw.com',
                'password_plain' => 'password',   // utk catatan, disimpan sbg hashed di DB
                'role' => 'admin',              // kalau kolom role ada, buka komentar
            ],
           /* [
                'name'  => 'Operator',
                'email' => 'operator@example.com',
                'password_plain' => 'password',
                // 'role' => 'operator',
            ],
            [
                'name'  => 'Juri',
                'email' => 'juri@example.com',
                'password_plain' => 'password',
                // 'role' => 'juri',
            ],
            [
                'name'  => 'Dewan',
                'email' => 'dewan@example.com',
                'password_plain' => 'password',
                // 'role' => 'dewan',
            ],*/
        ];

        foreach ($users as $u) {
            // siapkan payload untuk update/create
            $payload = [
                'name'              => $u['name'],
                'password'          => Hash::make($u['password_plain']),
                'email_verified_at' => now(),
            ];

            // kalau punya kolom role / group_id, isi di sini
            if (isset($u['role']))      $payload['role']      = $u['role'];
            // if (isset($u['group_id']))  $payload['group_id']  = $u['group_id'];

            User::updateOrCreate(
                ['email' => $u['email']],
                $payload
            );
        }
    }
}
