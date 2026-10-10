import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { SEO } from '@/components/shared/SEO';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { Scale, FileText } from 'lucide-react';

const sections = [
  {
    title: 'Acceptance of Terms',
    content: [
      'Think Decor is a trading name of Dreamverse Limited, a company registered in England and Wales (company no. 16446982, registered office Flat 3, 20–22 St. Giles Street, Northampton NN1 1JA). When you use Think Decor, your contract is with Dreamverse Limited.',
      'By accessing or using Think Decor, you agree to be bound by these Terms of Service.',
      'If you do not agree to these terms, please do not use our platform.',
      'We may update these terms from time to time, and continued use constitutes acceptance of changes.',
    ],
  },
  {
    title: 'Use of Services',
    content: [
      'You must be at least 13 years old to use Think Decor.',
      'You agree to use the platform only for lawful purposes and in accordance with these terms.',
      'You are responsible for maintaining the confidentiality of your account credentials.',
      'You may not use the platform to infringe on intellectual property rights of others.',
    ],
  },
  {
    title: 'User Content',
    content: [
      'You retain ownership of any photos or content you upload to the platform.',
      'By uploading content, you grant us a limited licence to process it for visualisation purposes.',
      'You must not upload content that is illegal, harmful, or violates the rights of others.',
      'We reserve the right to remove content that violates these terms.',
    ],
  },
  {
    title: 'Intellectual Property',
    content: [
      'All platform content, software, and technology are the property of Think Decor.',
      'Visualisations generated through the platform are for your personal or commercial use as per your plan.',
      'You may not reverse-engineer, copy, or distribute the platform without permission.',
      'Brand logos and product images displayed remain the property of their respective owners.',
    ],
  },
  {
    title: 'Subscriptions and Payments',
    content: [
      'Paid plans are billed in advance, monthly, at the prices shown on our Pricing page. All prices are in GBP.',
      'Payments are processed by Stripe. We never see or store your full card details.',
      'Each plan includes a monthly allowance of redesign credits (shown on our Pricing page). Credits are added at the start of each billing period, and unused credits stay on your account.',
      'Subscriptions renew automatically until cancelled. You may cancel at any time and keep access until the end of the period you have already paid for.',
      'We may change prices with at least 30 days notice. Price changes never apply to a period you have already paid for.',
      'If a payment fails we will retry it. Persistent failure may result in the plan being suspended until payment succeeds.',
    ],
  },
  {
    title: 'Cancellations and Refunds',
    content: [
      'You can cancel a subscription at any time from your account, or by emailing info@thinkdecor.app.',
      'Cancelling stops future renewals. It does not refund the current period, which remains active until it ends.',
      'New customers may request a full refund of their first payment within 14 days of that payment.',
      'Refunds are returned to the original payment method and typically take 5 to 10 business days to appear.',
      'Full details are on our Refund Policy page.',
    ],
  },
  {
    title: 'Limitation of Liability',
    content: [
      'Think Decor is provided "as is" without warranties of any kind.',
      'We are not liable for any indirect, incidental, or consequential damages arising from use of the platform.',
      'Visualisations are AI-generated and intended as guidance, not exact representations.',
      'Product colours and appearances may vary between visualisation and reality.',
    ],
  },
  {
    title: 'Termination',
    content: [
      'We may suspend or terminate your account for violations of these terms.',
      'You may delete your account at any time from Settings > Security in your account.',
      'Upon termination, your right to use the platform ceases immediately.',
      'Certain provisions survive termination, including those related to intellectual property.',
    ],
  },
  {
    title: 'Governing Law',
    content: [
      'These terms are governed by the laws of England and Wales, without regard to conflict of law principles.',
      'Any disputes shall be resolved in the courts of England and Wales.',
      'If any provision is found invalid, the remaining provisions continue in full effect.',
    ],
  },
  {
    title: 'Contact Us',
    content: [
      'For questions about these Terms of Service, contact us at info@thinkdecor.app.',
    ],
  },
];

export default function Terms() {
  const { ref: heroRef, isVisible: heroVisible } = useScrollAnimation();
  const { ref: contentRef, isVisible: contentVisible } = useScrollAnimation();

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Terms of Service | Think Decor"
        description="The terms that govern your use of Think Decor — accounts, billing, acceptable use and your rights."
        canonical="https://www.thinkdecor.app/terms"
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
              <Scale className="h-4 w-4" />
              Terms of Service
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-6 leading-tight">
              Clear terms, <span className="text-gradient-primary">fair use.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              These terms outline the rules and responsibilities for using the Think Decor platform.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Last updated: 10 October 2026
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
