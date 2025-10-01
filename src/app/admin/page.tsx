import AdminDashboard from "./AdminDashboard";

export default function AdminPage() {
  return (
    <div className="container mx-auto py-12 px-4">
      <h1 className="text-4xl font-bold text-center mb-8">
        MemberGate Pro Dashboard
      </h1>
      <AdminDashboard />
    </div>
  );
}