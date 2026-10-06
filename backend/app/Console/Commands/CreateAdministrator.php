<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

class CreateAdministrator extends Command
{
    protected $signature = 'admin:create {email} {--name=Administrator}';

    protected $description = 'Create an administrator; password comes from ADMIN_PASSWORD or a hidden prompt.';

    public function handle(): int
    {
        $email = strtolower($this->argument('email'));
        $password = env('ADMIN_PASSWORD');
        if (! $password && $this->input->isInteractive()) {
            $password = $this->secret('New administrator password');
        }
        $data = ['email' => $email, 'name' => $this->option('name'), 'password' => $password];
        $v = Validator::make($data, ['email' => 'required|email|max:254|unique:users,email', 'name' => 'required|string|max:120', 'password' => ['required', 'string', Password::min(12)->mixedCase()->numbers()]]);
        if ($v->fails()) {
            $this->error('Admin was not created. Use a unique valid email, a name and a password of at least 12 characters with mixed case and numbers.');

            return self::FAILURE;
        }
        $u = User::create($data);
        $u->forceFill(['is_admin' => true])->save();
        $this->info('Administrator created. No password is printed.');

        return self::SUCCESS;
    }
}
