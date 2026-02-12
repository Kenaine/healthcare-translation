import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-b from-blue-50 to-white">
      <main className="max-w-4xl mx-auto text-center space-y-8">
        <h1 className="text-5xl font-bold text-gray-900">
          Healthcare Translation Bridge
        </h1>
        
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Real-time translation for healthcare consultations. 
          Break down language barriers between doctors and patients.
        </p>

        <div className="flex gap-4 justify-center mt-8">
          <Link href="/auth/login">
            <Button size="lg" className="text-lg px-8">
              Login
            </Button>
          </Link>
          <Link href="/auth/signup">
            <Button size="lg" variant="outline" className="text-lg px-8">
              Sign Up
            </Button>
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <div className="p-6 bg-white rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-2">For Doctors</h3>
            <p className="text-gray-600">
              Create consultations, manage conversations, and communicate with patients in any language.
            </p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-2">For Patients</h3>
            <p className="text-gray-600">
              Join consultations with your doctor and communicate in your preferred language.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
