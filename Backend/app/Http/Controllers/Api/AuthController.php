<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Notifications\UserRegisteredNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    /**
     * Register a new user (admin creates faculty accounts).
     */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'     => ['required', 'string', 'max:255'],
            'email'    => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'confirmed', Password::min(8)],
            'role'     => ['sometimes', 'in:admin,faculty'],
        ]);

        $user = User::create([
            'name'     => $validated['name'],
            'email'    => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role'     => $validated['role'] ?? 'faculty',
        ]);

        // Notify all admins about the new registration
        $admins = User::where('role', 'admin')->get();
        foreach ($admins as $admin) {
            $admin->notify(new UserRegisteredNotification(
                name:   $user->name,
                email:  $user->email,
                userId: $user->id,
            ));
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user'       => $user,
            'token'      => $token,
            'token_type' => 'Bearer',
        ], 201);
    }

    /**
     * Authenticate a user and return a Sanctum token.
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required'],
        ]);

        if (! Auth::attempt($request->only('email', 'password'))) {
            return response()->json([
                'message' => 'Invalid credentials.',
            ], 401);
        }

        /** @var User $user */
        $user  = User::where('email', $request->email)->firstOrFail();
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user'       => $user->load('facultyMember'),
            'token'      => $token,
            'token_type' => 'Bearer',
        ]);
    }

    /**
     * Revoke the current access token (logout).
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }

    /**
     * Return the authenticated user's profile.
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $request->user()->load('facultyMember'),
        ]);
    }

    /**
     * Change the authenticated user's password.
     */
    public function changePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => ['required'],
            'new_password'     => ['required', 'min:6', 'confirmed'],
        ]);

        $user = $request->user();

        if (! Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'message' => 'The current password is incorrect.',
            ], 422);
        }

        $user->update([
            'password' => Hash::make($request->new_password),
        ]);

        return response()->json([
            'message' => 'Password changed successfully.',
        ]);
    }

    /**
     * Update the authenticated user's profile (name, email, and faculty info).
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name'         => ['required', 'string', 'max:255'],
            'email'        => ['required', 'email', 'max:255', 'unique:users,email,' . $user->id],
            'department'   => ['nullable', 'string', 'max:255'],
            'contact_no'   => ['nullable', 'string', 'max:50'],
            'first_name'   => ['nullable', 'string', 'max:100'],
            'last_name'    => ['nullable', 'string', 'max:100'],
        ]);

        // Update the user account (name, email)
        $user->update([
            'name'  => $validated['name'],
            'email' => $validated['email'],
        ]);

        // Update or create the linked faculty member record
        $facultyData = array_filter([
            'department' => $validated['department'] ?? null,
            'contact_no' => $validated['contact_no'] ?? null,
            'first_name' => $validated['first_name'] ?? null,
            'last_name'  => $validated['last_name'] ?? null,
        ], fn($v) => !is_null($v));

        if (!empty($facultyData) && $user->facultyMember) {
            $user->facultyMember->update($facultyData);
        }

        if ($request->hasFile('photo')) {
            $request->validate([
                'photo' => ['image', 'mimes:jpeg,jpg,png,webp', 'max:5120'],
            ]);
            if ($user->profile_photo) {
                Storage::disk('public')->delete($user->profile_photo);
            }
            $path = $request->file('photo')->store('profile-photos', 'public');
            $user->update(['profile_photo' => $path]);
        }

        return response()->json([
            'message' => 'Profile updated successfully.',
            'data'    => $user->fresh()->load('facultyMember'),
        ]);
    }

    /**
     * Upload or replace the authenticated user's profile photo.
     */
    public function uploadPhoto(Request $request): JsonResponse
    {
        $request->validate([
            'photo' => ['required', 'image', 'mimes:jpeg,jpg,png,webp', 'max:5120'],
        ]);

        $user = $request->user();

        // Delete the old photo if one exists
        if ($user->profile_photo) {
            Storage::disk('public')->delete($user->profile_photo);
        }

        // Store new photo under public/profile-photos/
        $path = $request->file('photo')->store('profile-photos', 'public');

        $user->update(['profile_photo' => $path]);

        return response()->json([
            'message'           => 'Photo updated successfully.',
            'profile_photo'     => $path,
            'photo_url'         => asset('storage/' . $path),
            'profile_photo_url' => asset('storage/' . $path),
            'user'              => $user->fresh()->load('facultyMember'),
        ]);
    }
}
