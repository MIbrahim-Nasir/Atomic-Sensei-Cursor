import LoginForm from '@/components/auth/LoginForm';

export const metadata = {
  title: 'Login - Atomic Sensei',
  description: 'Login to your account to continue learning',
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-1 flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <h2 className="text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
          Atomic Sensei
        </h2>
        <p className="text-center text-sm text-gray-500">Atomize your learning</p>
      </div>
      <LoginForm />
    </div>
  );
}