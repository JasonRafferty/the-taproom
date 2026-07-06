import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="login-page">
      <h1>The Taproom</h1>
      <p className="page-purpose">Siply internal hub — log in to continue.</p>
      <LoginForm />
    </main>
  );
}
