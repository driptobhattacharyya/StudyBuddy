import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Check, Code2, Eye, Layers, MessagesSquare, Sparkles, Users, Wand2 } from 'lucide-react'
import { homeForRole, useAuth } from '@/context/AuthContext'
import { AuthActions } from '@/components/auth/AuthActions'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Logo } from '@/components/ui/Logo'
import { Button } from '@/components/ui/Button'

const FEATURES = [
  { icon: BookOpen, title: 'AI summaries', text: 'Turn long lecture notes into clear, skimmable summaries with a single click.' },
  { icon: Wand2, title: 'Practice questions', text: 'Generate fresh practice questions from any note to test what you actually know.' },
  { icon: Sparkles, title: 'Hints, not answers', text: 'Socratic hints nudge you toward the solution without giving it away.' },
  { icon: Code2, title: 'Built-in code runner', text: 'Write Python, JavaScript or Java in the browser and run it against real test cases.' },
  { icon: Layers, title: 'Flashcards', text: 'Create flashcards by hand or let AI draft them from your course material.' },
  { icon: MessagesSquare, title: 'Course chat', text: 'Ask questions and get answers grounded in your own notes, with sources.' },
]

const TEAM = ['Pranjal Choudhury', 'Sagnik De', 'Pravin S', 'Mehak Singal', 'Madhurima Ghosh', 'Vibhor Jain', 'Dripto Bhattacharyya']

function ProductMock() {
  return (
    <div className="relative mx-auto w-full max-w-2xl">
      <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-tr from-brand-500/25 via-accent-500/20 to-transparent blur-2xl" aria-hidden="true" />
      <div className="relative overflow-hidden rounded-2xl border border-border bg-surface shadow-pop">
        <div className="flex items-center gap-1.5 border-b border-border bg-surface-2 px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-red-400" /><span className="size-2.5 rounded-full bg-amber-400" /><span className="size-2.5 rounded-full bg-emerald-400" />
          <span className="ml-3 truncate text-xs text-subtle">Course chat - Intro to Biology</span>
        </div>
        <div className="space-y-4 p-4 sm:p-5">
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-gradient-to-b from-brand-500 to-brand-600 px-4 py-2.5 text-sm text-white">Explain how photosynthesis stores energy</div>
          </div>
          <div className="flex gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"><Sparkles className="size-4" /></span>
            <div className="min-w-0 rounded-2xl rounded-tl-md border border-border bg-bg px-4 py-3 text-sm leading-relaxed text-fg">
              Plants capture light in the <strong>chloroplasts</strong> and use it to convert CO<sub>2</sub> and water into glucose, storing the energy in chemical bonds
              <span className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 animate-blink rounded-sm bg-brand-500" />
              <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
                <span className="text-xs font-medium text-muted">Sources</span>
                <span className="rounded-full border border-border bg-surface-2 px-2.5 py-0.5 text-xs text-muted">Week 3: Photosynthesis</span>
                <span className="rounded-full border border-border bg-surface-2 px-2.5 py-0.5 text-xs text-muted">Week 4: Cell energy</span>
                <span className="ml-auto inline-flex items-center gap-1 text-xs text-subtle"><Eye className="size-3.5" /> Under the hood</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-12 -right-2 hidden w-60 overflow-hidden rounded-xl border border-border bg-[#0d1117] shadow-pop lg:block xl:-right-8">
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5 text-[11px] text-slate-400"><span>solution.py</span><span className="text-emerald-400">3/3 passed</span></div>
        <pre className="overflow-hidden p-3 text-[11px] leading-relaxed text-slate-200"><code><span className="text-pink-400">def</span> <span className="text-sky-300">fib</span>(n):{'\n'}  a, b = 0, 1{'\n'}  <span className="text-pink-400">for</span> _ <span className="text-pink-400">in</span> range(n):{'\n'}    a, b = b, a + b{'\n'}  <span className="text-pink-400">return</span> a</code></pre>
      </div>
    </div>
  )
}

export default function Landing() {
  const { isAuthenticated, user } = useAuth()
  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/" aria-label="Study Buddy home"><Logo /></Link>
          <nav aria-label="Primary" className="hidden items-center gap-7 text-sm font-medium text-muted md:flex">
            <a href="#features" className="hover:text-fg">Features</a>
            <a href="#how" className="hover:text-fg">How it works</a>
            <a href="#about" className="hover:text-fg">About</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {isAuthenticated ? (
              <Button to={homeForRole(user.role)} size="sm">Open app <ArrowRight className="size-4" /></Button>
            ) : (
              <Button to="/login" size="sm" variant="outline">Sign in</Button>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="bg-grid absolute inset-0" aria-hidden="true" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pb-24 pt-14 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-24">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">
                <Sparkles className="size-3.5" aria-hidden="true" /> AI-assisted learning management
              </span>
              <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
                Study smarter with an AI that{' '}
                <span className="bg-gradient-to-r from-brand-500 to-accent-500 bg-clip-text text-transparent">knows your course</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
                Study Buddy combines course notes, assignments and a code runner with AI that summarises, quizzes, hints and answers from your own material - and shows its sources.
              </p>
              {isAuthenticated ? (
                <Button to={homeForRole(user.role)} size="lg" className="mt-8">Go to your dashboard <ArrowRight className="size-5" /></Button>
              ) : (
                <AuthActions className="mt-8" />
              )}
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
                {['Grounded in your material', 'Transparent AI traces', 'Students, instructors and admins'].map((t) => (
                  <li key={t} className="flex items-center gap-1.5"><Check className="size-4 text-emerald-500" aria-hidden="true" />{t}</li>
                ))}
              </ul>
            </div>
            <ProductMock />
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Everything you need to learn and teach</h2>
            <p className="mt-3 text-muted">Six AI-powered tools wired into the same course, so nothing lives in a separate tab.</p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="group rounded-2xl border border-border bg-surface p-6 shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-brand-300 hover:shadow-pop dark:hover:border-brand-700">
                <span className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-sm shadow-brand-600/30"><Icon className="size-5" aria-hidden="true" /></span>
                <h3 className="mt-5 text-lg font-semibold tracking-tight">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="scroll-mt-20 border-y border-border bg-surface/60">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">How it works</h2>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {[
                ['Instructors add material', 'Upload notes, assignments and coding problems. AI drafts quizzes and flashcards you can edit and publish.'],
                ['Students learn with AI', 'Summarise notes, practise, get hints, run code and chat with the course - all in one place.'],
                ['Everyone sees how the AI works', 'Every answer links to the exact prompt, sources, model and latency behind it.'],
              ].map(([t, d], i) => (
                <div key={t} className="relative">
                  <span className="flex size-9 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">{i + 1}</span>
                  <h3 className="mt-4 text-lg font-semibold tracking-tight">{t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="about" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
          <div className="rounded-3xl border border-border bg-gradient-to-br from-brand-50 to-surface p-8 dark:from-brand-500/10 dark:to-surface sm:p-12">
            <h2 className="text-3xl font-semibold tracking-tight">About the project</h2>
            <p className="mt-3 max-w-2xl text-muted">
              Study Buddy was originally built as an IIT Madras BS Software Engineering team project (Team 22, 2024) and has since been rebuilt as a polished, production-minded portfolio app.
            </p>
            <p className="mt-6 text-sm font-medium text-fg">Original team</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {TEAM.map((n) => (
                <li key={n} className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm text-muted shadow-sm">{n}</li>
              ))}
            </ul>
          </div>
        </section>

        {!isAuthenticated && (
          <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
            <div className="rounded-3xl bg-gradient-to-br from-brand-600 to-accent-600 px-6 py-14 text-center text-white sm:px-12">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">See it in action</h2>
              <p className="mx-auto mt-3 max-w-xl text-white/80">Jump straight into the live demo - no sign-up needed.</p>
              <div className="mt-8 flex justify-center"><AuthActions className="[&>*]:!bg-none [&>*]:!bg-white [&>*]:!text-brand-700 [&>*]:!border-transparent [&>*]:hover:!bg-white/90" /></div>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-md">
            <Logo />
            <p className="mt-3 text-sm text-muted">Originally built as an IIT Madras BS Software Engineering team project (Team 22, 2024).</p>
          </div>
          <div className="text-sm text-muted md:max-w-md md:text-right">
            <p className="flex items-center gap-1.5 font-medium text-fg md:justify-end"><Users className="size-4" aria-hidden="true" /> Team</p>
            <p className="mt-2 leading-relaxed">{TEAM.join(' / ')}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
