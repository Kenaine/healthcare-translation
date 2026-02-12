import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { logout } from '@/lib/auth/actions'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    redirect('/auth/login')
  }

  // Get user profile to check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const userRole = profile?.role || 'patient'
  const isDoctor = userRole === 'doctor'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Healthcare Translation Bridge
          </h1>
          <div className="flex gap-4 items-center">
            <Link href="/profile">
              <Button variant="ghost">Profile</Button>
            </Link>
            <form action={logout}>
              <Button type="submit" variant="outline">
                Logout
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Welcome, {user.user_metadata.full_name || user.email}
          </h2>
          <p className="text-gray-600 mt-2">
            {isDoctor 
              ? 'Manage your conversations and create new consultations' 
              : 'View your conversations with doctors'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isDoctor && (
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle>New Conversation</CardTitle>
                <CardDescription>
                  Start a new consultation with a patient
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/conversations/new">
                  <Button className="w-full">Create</Button>
                </Link>
              </CardContent>
            </Card>
          )}

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>My Conversations</CardTitle>
              <CardDescription>
                {isDoctor 
                  ? 'View and manage your past consultations' 
                  : 'View your conversations with doctors'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/conversations">
                <Button className="w-full" variant="outline">View All</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Search</CardTitle>
              <CardDescription>
                Search through your conversation history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/search">
                <Button className="w-full" variant="outline">Search</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12">
          <h3 className="text-xl font-semibold mb-4">Recent Conversations</h3>
          <Card>
            <CardContent className="p-6">
              <p className="text-gray-500 text-center">
                {isDoctor 
                  ? 'No conversations yet. Create your first consultation to get started!' 
                  : 'No conversations yet. Your doctor will invite you to join a consultation.'}
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
