// "About this demo": in plain words, whose project this is, what is real and
// what is not, what data stays in the browser, what is sent elsewhere, and how
// to remove it. Linked from the footer of every page.
import PageHeader from '../components/PageHeader.jsx'
import { BASE_FEE, FEE_PER_KG, COURIER_FEE } from '../data/constants.js'
import { formatPKR } from '../lib/format.js'

const TEAM = [
  ['Erhan Javed Khan', 'Project & Coordination Lead'],
  ['Muhammed Hisham Ahmed', 'Business Process & Requirements Analyst'],
  ['Ahmad Abdur Rahman Zahid Bhatti', 'Digital Tools & Prototype Lead'],
  ['Mohid Zafar Khan', 'Data, Ethics & Presentation Lead'],
]

// One topic: a heading and its text, separated from the next by a thin line.
function Topic({ title, children }) {
  return (
    <section className="border-t border-line py-7">
      <h2 className="text-2xl font-bold sm:text-3xl">{title}</h2>
      <div className="mt-3 max-w-[65ch] space-y-3 text-muted [&_strong]:text-ink">{children}</div>
    </section>
  )
}

export default function About() {
  return (
    <div>
      <PageHeader title="About this demo">
        What RaastaShare is, who made it, and what happens to what you type here.
      </PageHeader>

      <Topic title="A student prototype, not a real service">
        <p>
          RaastaShare is a semester project for the Digital Literacy course (Digital
          Transformation Sandbox). <strong>The people, trips, codes and payments are all made
          up.</strong> No one is charged, no money moves, and no parcel is carried. There are no
          real accounts: &ldquo;Signed in as&rdquo; just picks one of the fictional people.
        </p>
      </Topic>

      <Topic title="Who made it">
        <ul className="divide-y divide-line">
          {TEAM.map(([name, role]) => (
            <li key={name} className="py-2">
              <strong>{name}</strong>, {role}
            </li>
          ))}
        </ul>
      </Topic>

      <Topic title="What stays in your browser">
        <p>
          Everything you post (parcels, journeys, deliveries, disputes) is saved in this
          browser only. The site sets <strong>no cookies</strong>, and the fonts come with the site.
        </p>
      </Topic>

      <Topic title="Usage statistics">
        <p>
          To see how the demo is used, the site sends <strong>anonymous usage events to
          PostHog</strong>, an analytics service, on its servers in the EU: pages visited, buttons
          pressed, and steps such as a parcel posted or a delivery confirmed, with their cities,
          weights, item types and outcomes. It also reports errors, and how long the AI check took.
        </p>
        <p>
          Each demo person is counted as &ldquo;demo profile 1&rdquo; to &ldquo;10&rdquo;, never by name,
          and <strong>nothing you type is sent to PostHog</strong>, not even your item description.
          The screen is not recorded. A random visitor number is kept in this browser&rsquo;s
          storage; &ldquo;Reset demo data&rdquo; does not remove it, but clearing the site&rsquo;s data
          in your browser does. If your browser asks sites not to track you (&ldquo;Do Not
          Track&rdquo; or &ldquo;Global Privacy Control&rdquo;), nothing is sent.
        </p>
      </Topic>

      <Topic title="What is sent elsewhere">
        <p>
          When you post a parcel or a journey, or a delivery is accepted, completed or
          reported, <strong>a record is sent through Make.com to a Google Sheet</strong> the team uses
          for the project dashboard. It holds the fictional names, cities, weights, item types,
          times, prices and statuses. When a match is made, the team also gets an email about it.
        </p>
        <p>
          If you press &ldquo;Check with AI&rdquo;, <strong>your item description is sent through
          Make.com to Google&rsquo;s Gemini AI</strong>, and it is saved in the same Sheet. Please
          describe the item only: no names, addresses or phone numbers.
        </p>
      </Topic>

      <Topic title="Removing your data">
        <p>
          <strong>&ldquo;Reset demo data&rdquo;</strong>, at the bottom of every page, clears everything
          saved in this browser. To have something removed from the team&rsquo;s Google Sheet,
          contact the RaastaShare team through the course. The Sheet is used only for this project.
        </p>
      </Topic>

      <Topic title="Our numbers">
        <p>
          The price, {formatPKR(BASE_FEE)} plus {formatPKR(FEE_PER_KG)} per kg, is the pricing
          model from our proposal. The {formatPKR(COURIER_FEE)} courier price and the
          &ldquo;about eight steps&rdquo; with phone calls are <strong>our estimates</strong>, not
          measured figures.
        </p>
      </Topic>

      <Topic title="Photos and fonts">
        <p>
          The photo on the Home page is from Wikimedia Commons under a CC BY-SA licence,
          credited under the photo. The fonts, IBM Plex Sans and IBM Plex Sans Condensed, are free under the
          SIL Open Font License.
        </p>
      </Topic>
    </div>
  )
}
