export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-[#faf9f7]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/fish.png" alt="TinyFish" className="h-8 w-8" />
            <h1 className="text-lg font-bold text-slate-900">How Fish Food Works</h1>
          </div>
          <a href="/" className="text-sm text-slate-500 hover:text-slate-700">
            Back to app
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {/* Steps */}
        <div className="space-y-6">
          <Step
            number={1}
            icon="/brand/Discover.svg"
            title="Sign in"
            description="Use your @tinyfish.io email. You'll get a verification code to confirm your identity."
          />
          <Step
            number={2}
            icon="/brand/Search.svg"
            title="Nominate an item"
            description="Paste an Amazon product URL. Our TinyFish Web Agent will swim over to Amazon, verify the product exists, grab the name, image, and price, and check it's under the $49.98 limit. One nomination per person per week."
          />
          <Step
            number={3}
            icon="/brand/Navigate.svg"
            title="Vote"
            description="You get 2 votes to cast on other people's nominations. Your own item gets 1 auto-vote. You can change your votes anytime before the deadline. You can vote even if you haven't nominated yet."
          />
          <Step
            number={4}
            icon="/brand/Scale.svg"
            title="Hype on Slack"
            description="Want more votes? Hit 'Hype it' on any item to send a message to the #office-picks Slack channel with a custom message. Rally the team if there aren't enough nominations yet."
          />
          <Step
            number={5}
            icon="/brand/Reason.svg"
            title="Winner announced"
            description="At the Friday 4:50 PM deadline, the item with the most votes wins. Ties are broken randomly. The winning item gets purchased and arrives Monday."
          />
          <Step
            number={6}
            icon="/brand/Train.svg"
            title="Next week"
            description="A new round starts immediately after the deadline. The previous winning item can't be nominated again the following week (but can come back the week after)."
          />
        </div>

        {/* Rules summary */}
        <div className="mt-10 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Quick rules</h2>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex gap-2">
              <span className="text-orange-500 shrink-0">&#8226;</span>
              Max item price: <strong>$49.98</strong>
            </li>
            <li className="flex gap-2">
              <span className="text-orange-500 shrink-0">&#8226;</span>
              1 nomination per person per week
            </li>
            <li className="flex gap-2">
              <span className="text-orange-500 shrink-0">&#8226;</span>
              2 manual votes + 1 auto-vote on your own item = 3 total votes per person
            </li>
            <li className="flex gap-2">
              <span className="text-orange-500 shrink-0">&#8226;</span>
              You can vote without nominating
            </li>
            <li className="flex gap-2">
              <span className="text-orange-500 shrink-0">&#8226;</span>
              You can change your votes anytime before the deadline
            </li>
            <li className="flex gap-2">
              <span className="text-orange-500 shrink-0">&#8226;</span>
              Same item can&apos;t win two weeks in a row
            </li>
            <li className="flex gap-2">
              <span className="text-orange-500 shrink-0">&#8226;</span>
              Deadline: Friday 4:50 PM (local office time)
            </li>
          </ul>
        </div>

        {/* Powered by */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-400">
            Product details are fetched by the{" "}
            <a href="https://tinyfish.ai" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">
              TinyFish Web Agent
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}

function Step({ number, icon, title, description }: { number: number; icon: string; title: string; description: string }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="shrink-0 flex flex-col items-center">
        <div
          className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
          style={{ backgroundColor: "#f58220" }}
        >
          {number}
        </div>
        {number < 6 && <div className="w-px h-full min-h-8 bg-slate-200 mt-1" />}
      </div>
      <div className="flex-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={icon} alt="" className="h-12 w-12 shrink-0 opacity-60 hidden sm:block" />
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-500 mt-1">{description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
