import { Button } from '@/components/ui/button'

function App() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background text-foreground">
      <h1 className="text-2xl font-semibold">PlateCost</h1>
      <p className="text-muted-foreground">Scaffold ready.</p>
      <Button>Get started</Button>
    </div>
  )
}

export default App
