import RegisterForm from '@/components/auth/RegisterForm';

export const metadata = {
  title: 'Register - Atomic Sensei',
  description: 'Create a new account to start your learning journey',
};

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-1 flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <h2 className="text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
          Atomic Sensei
        </h2>
        <p className="text-center text-sm text-gray-500">Atomize your learning</p>
      </div>
      <RegisterForm />
    </div>
  );
}