import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { SEO } from '@/components/shared/SEO';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { Shield, FileText } from 'lucide-react';

const LAST_UPDATED = '10 October 2026';

const sections = [
  {
    title: 'Who We Are',
    content: [
      'Think Decor is a trading name of Dreamverse Limited, a company registered in England and Wales (company no. 16446982). Our registered office is Flat 3, 20–22 St. Giles Street, Northampton NN1 1JA.',
      'Dreamverse Limited is the controller of the personal data described in this policy. You can contact us at info@thinkdecor.app.',
    ],
  },
  {
    title: 'Information We Collect',
    content: [
      'Personal information such as your name, email address, and phone number when you register or contact us.',
      'Room photos and visual content that you upload to use our Mantha AI visualisation features. Please avoid including people, documents or house numbers in your photos.',
      'Usage data including how you interact with the platform, features used, and session duration.',
      'Device and browser information to ensure compatibility and improve performance.',
    ],
  },
  {
    title: 'How We Use Your Information',
    content: [
      'To provide and improve our Mantha AI decor visualisation services.',
      'To personalise your experience and recommend relevant products.',
      'To communicate with you about updates, support, and marketing (with your consent).',
      'To analyse usage patterns and improve platform performance and security.',
    ],
  },
  {
    title: 'Data Sharing and Disclosure',
    content: [
      'We do not sell your personal information to third parties.',
      'Image generation: when you create a redesign, your room photo and your written brief are sent to Google (the Gemini API) to generate the result. We do not use your photos to train our own models.',
      'Hosting and infrastructure: the website is served by Vercel, and our email is handled by Hostinger.',
      'Advertising and analytics: if you accept cookies, Google (Tag Manager, Analytics and Ads), Meta, Reddit, Spotify and Pinterest receive information about your visit (see Cookies below). They receive nothing from us if you reject non-essential cookies.',
      'Payments are processed by Stripe Payments Europe Ltd. Card details go directly to Stripe and are never stored on our servers. Stripe receives your name, email and billing address in order to take payment.',
      'Our application data, photos and authentication are hosted on Supabase, which stores data within the region selected for our project.',
      'Some of these providers (for example Google, Vercel and Meta) may process data outside the UK. Where they do, we rely on the UK-approved safeguards they offer, such as the UK International Data Transfer Addendum.',
      'We may disclose information if required by law or to protect our legal rights.',
      'Brand partners may receive aggregated, anonymised insights — never individual user data.',
    ],
  },
  {
    title: 'Legal Basis and Retention',
    content: [
      'We process your data to perform our contract with you (providing the service and taking payment), and on the basis of legitimate interest for security and service improvement.',
      'Account data and the room photos and designs you create are kept for as long as your account is open, then deleted within 90 days of closure.',
      'Payment and invoice records are retained for 7 years, as required by UK tax law. This is why some billing data survives account deletion.',
      'Enquiries sent through our contact form are kept for up to 24 months.',
    ],
  },
  {
    title: 'Data Security',
    content: [
      'We use industry-standard encryption for data in transit and at rest.',
      'Access to personal data is restricted to authorised personnel only.',
      'Regular security audits and vulnerability assessments are conducted.',
      'We promptly investigate and respond to any suspected security incidents.',
    ],
  },
  {
    title: 'Your Rights',
    content: [
      'You have rights under UK GDPR, including the right to access, correct, or delete your personal data.',
      'You can request a copy of the data we hold about you (Subject Access Request).',
      'You can opt out of marketing communications whenever you choose.',
      'You can delete your account at any time from Settings > Security in your account (or by emailing info@thinkdecor.app). We then delete your data from our active systems (see Legal Basis and Retention for what we must keep).',
      'You have the right to lodge a complaint with the UK Information Commissioner\'s Office (ICO).',
    ],
  },
  {
    title: 'Cookies and Tracking',
    content: [
      'Essential: we store a sign-in session and your cookie choice so the site works. These do not need consent.',
      'Analytics and advertising (only if you choose "Accept all"): Google Tag Manager, Google Analytics and Google Ads; the Meta (Facebook) pixel; the Reddit pixel; the Spotify pixel; and Pinterest. These set cookies such as _ga, _fbp and _rdt_uuid to measure visits and the performance of our adverts.',
      'Nothing in the second group is loaded until you accept. "Reject non-essential" keeps it all off.',
      'You can change your mind at any time with "Cookie settings" in the footer of every page, and you can also clear cookies in your browser.',
    ],
  },
  {
    title: 'Contact Us',
    content: [
      'Think Decor is a trading name of Dreamverse Limited, registered in England and Wales, company no. 16446982.',
      'If you have any questions about this Privacy Policy, please contact us at info@thinkdecor.app.',
      'We are committed to resolving any privacy concerns promptly and transparently.',
    ],
  },
];

export default function Privacy() {
  const { ref: heroRef, isVisible: heroVisible } = useScrollAnimation();
  const { ref: contentRef, isVisible: contentVisible } = useScrollAnimation();

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Privacy Policy | Think Decor"
        description="How Think Decor collects, uses and protects your data, including the room photos you upload."
        canonical="https://www.thinkdecor.app/privacy"
      />
      <Navbar />
      <main className="pt-24">
        {/* Hero */}
        <section className="py-16 lg:py-24 relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[150px]" />
          </div>
          <div className="absolute inset-0 bg-grid opacity-[0.03]" />

          <div
            ref={heroRef}
            className={`container relative z-10 mx-auto px-4 sm:px-6 max-w-4xl text-center transition-all duration-700 ${
              heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20 mb-6">
              <Shield className="h-4 w-4" />
              Privacy Policy
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-6 leading-tight">
              Your data, <span className="text-gradient-primary">your control.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We are committed to protecting your privacy and being transparent about how we handle your information.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Last updated: {LAST_UPDATED}
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="pb-20 lg:pb-28 relative overflow-hidden">
          <div className="absolute inset-0 bg-card/30" />
          <div className="absolute inset-0 bg-grid opacity-[0.03]" />

          <div
            ref={contentRef}
            className={`container relative z-10 mx-auto px-4 sm:px-6 max-w-3xl transition-all duration-700 ${
              contentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <div className="space-y-8">
              {sections.map((section, i) => (
                <div
                  key={section.title}
                  id={section.title === 'Cookies and Tracking' ? 'cookies' : undefined}
                  className="p-6 sm:p-8 rounded-2xl bg-card/50 border border-border/30 hover:border-primary/20 transition-all duration-500"
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground">{section.title}</h2>
                  </div>
                  <ul className="space-y-3">
                    {section.content.map((item, j) => (
                      <li key={j} className="text-muted-foreground leading-relaxed flex items-start gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-2 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
