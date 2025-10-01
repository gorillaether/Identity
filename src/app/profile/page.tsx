import ProfileClient from "./ProfileClient";

export default function ProfilePage() {
  return (
    <div className="flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md p-8 space-y-4 bg-white rounded-lg shadow-md border border-brass/50">
        <h1 className="text-3xl font-bold text-center">My Profile</h1>
        <ProfileClient />
      </div>
    </div>
  );
}