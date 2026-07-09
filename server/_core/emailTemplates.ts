/**
 * Email templates for the UnifyOne drip sequence
 *
 * 5-email sequence over 14 days:
 * 1. Welcome (immediate)
 * 2. Platform Overview (day 2)
 * 3. Getting Started (day 4)
 * 4. Success Stories (day 7)
 * 5. Limited Offer (day 14)
 */

import { getAppUrl } from "./env";

function buildEmailTemplates(baseUrl: string) {
  return {
    welcome: {
      subject: "Welcome to UnifyOne — Know What You Earn",
      html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Crimson Pro', serif; background: #020202; color: #F0E8D0; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 1px solid rgba(212,168,67,0.2); padding-bottom: 20px; }
            .header h1 { font-family: 'Cinzel', serif; font-size: 32px; margin: 0; color: #D4A843; letter-spacing: 0.05em; }
            .content { margin: 40px 0; }
            .content p { margin: 16px 0; font-size: 16px; }
            .cta { text-align: center; margin: 40px 0; }
            .cta a { display: inline-block; background: #D4A843; color: #020202; padding: 12px 32px; text-decoration: none; font-family: 'Cinzel', sans-serif; font-size: 14px; letter-spacing: 0.1em; font-weight: 600; }
            .footer { text-align: center; margin-top: 60px; padding-top: 20px; border-top: 1px solid rgba(212,168,67,0.1); font-size: 12px; color: #7A7A7A; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>UNIFYONE</h1>
              <p style="margin: 8px 0; font-size: 12px; letter-spacing: 0.1em; color: #9A9A9A;">KNOW WHAT YOU EARN. KEEP WHAT YOU OWE.</p>
            </div>
            <div class="content">
              <p>Welcome to UnifyOne.</p>
              <p>Gig work scatters your money across a half-dozen apps. UnifyOne pulls it back into one clear picture — what you earned, the miles you can deduct, and what to set aside for quarterly taxes — with Kai, your earnings copilot, watching the numbers alongside you.</p>
              <p>Over the next two weeks, we'll show you:</p>
              <ul>
                <li>How GigIQ turns scattered payouts into your real hourly take</li>
                <li>How Tax Autopilot tracks IRS mileage and projects your quarterly 1040-ES estimates</li>
                <li>How Kai becomes your earnings copilot at tax time and every shift in between</li>
                <li>Exclusive pricing for early adopters</li>
              </ul>
              <p>Start here: open your <a href="${baseUrl}/overview" style="color: #D4A843; text-decoration: none;">earnings overview</a> and see where your money actually stands. Running a storefront too? The optional commerce add-on is waiting when you need it.</p>
            </div>
            <div class="cta">
              <a href="${baseUrl}/overview">SEE YOUR EARNINGS</a>
            </div>
            <div class="footer">
              <p>© 2025 PNW Enterprises. Built to endure.</p>
              <p><a href="${baseUrl}/unsubscribe" style="color: #7A7A7A; text-decoration: none;">Unsubscribe</a></p>
            </div>
          </div>
        </body>
      </html>
    `,
    },

    platformOverview: {
      subject: "The Six Pillars: How UnifyOne Works",
      html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Crimson Pro', serif; background: #020202; color: #F0E8D0; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 1px solid rgba(212,168,67,0.2); padding-bottom: 20px; }
            .header h1 { font-family: 'Cinzel', serif; font-size: 28px; margin: 0; color: #D4A843; letter-spacing: 0.05em; }
            .pillar { margin: 24px 0; padding: 16px; border-left: 3px solid #D4A843; }
            .pillar-title { font-family: 'Cinzel', serif; font-size: 16px; font-weight: 600; color: #D4A843; margin-bottom: 8px; }
            .cta { text-align: center; margin: 40px 0; }
            .cta a { display: inline-block; background: #D4A843; color: #020202; padding: 12px 32px; text-decoration: none; font-family: 'Cinzel', sans-serif; font-size: 14px; letter-spacing: 0.1em; font-weight: 600; }
            .footer { text-align: center; margin-top: 60px; padding-top: 20px; border-top: 1px solid rgba(212,168,67,0.1); font-size: 12px; color: #7A7A7A; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>THE SIX PILLARS</h1>
            </div>
            <div class="content">
              <p>UnifyOne is built on six structural pillars, each engineered to give you earnings clarity and tax confidence:</p>

              <div class="pillar">
                <div class="pillar-title">1. GIGIQ</div>
                <p>Shift and earnings intelligence across every platform you work. See your real hourly take — what you made, where, and when — not just the app's headline number.</p>
              </div>

              <div class="pillar">
                <div class="pillar-title">2. TAX AUTOPILOT</div>
                <p>Deductible IRS mileage tracked automatically. Quarterly estimated taxes (Form 1040-ES) projected for you — recorded, auditable, and reversible.</p>
              </div>

              <div class="pillar">
                <div class="pillar-title">3. MONEY MANAGER</div>
                <p>One clear monthly money picture. Earnings in, expenses out, tax set-asides accounted for — no spreadsheets, no guesswork.</p>
              </div>

              <div class="pillar">
                <div class="pillar-title">4. KAI AI</div>
                <p>Your earnings copilot. Ask what you made last week, what you owe next quarter, or which shifts actually paid — and get answers grounded in your own numbers.</p>
              </div>

              <div class="pillar">
                <div class="pillar-title">5. YOUR DATA, EXPORTABLE</div>
                <p>Every mileage log, earnings entry, and tax estimate is versioned and auditable. Pull your full dataset any time — for a CPA, or to move on without friction.</p>
              </div>

              <div class="pillar">
                <div class="pillar-title">6. COMMERCE (OPTIONAL ADD-ON)</div>
                <p>Selling on the side? An optional storefront add-on with products, orders, and payments — there when you need it, invisible when you don't.</p>
              </div>
            </div>
            <div class="cta">
              <a href="${baseUrl}/architecture">EXPLORE THE ARCHITECTURE</a>
            </div>
            <div class="footer">
              <p>© 2025 PNW Enterprises. Built to endure.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    },

    gettingStarted: {
      subject: "Getting Started: Your First 30 Minutes",
      html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Crimson Pro', serif; background: #020202; color: #F0E8D0; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 1px solid rgba(212,168,67,0.2); padding-bottom: 20px; }
            .header h1 { font-family: 'Cinzel', serif; font-size: 28px; margin: 0; color: #D4A843; letter-spacing: 0.05em; }
            .step { margin: 24px 0; padding: 16px; background: rgba(212,168,67,0.05); border-left: 3px solid #D4A843; }
            .step-num { font-family: 'Cinzel', serif; font-size: 14px; color: #D4A843; font-weight: 600; margin-bottom: 8px; }
            .cta { text-align: center; margin: 40px 0; }
            .cta a { display: inline-block; background: #D4A843; color: #020202; padding: 12px 32px; text-decoration: none; font-family: 'Cinzel', sans-serif; font-size: 14px; letter-spacing: 0.1em; font-weight: 600; }
            .footer { text-align: center; margin-top: 60px; padding-top: 20px; border-top: 1px solid rgba(212,168,67,0.1); font-size: 12px; color: #7A7A7A; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>FIRST 30 MINUTES</h1>
            </div>
            <div class="content">
              <p>Ready to see your real numbers? Here's your roadmap:</p>

              <div class="step">
                <div class="step-num">STEP 1: LOG YOUR FIRST SHIFT (5 MIN)</div>
                <p>Add a shift from DoorDash, Uber, Instacart — any platform you work. GigIQ starts building your real hourly picture immediately.</p>
              </div>

              <div class="step">
                <div class="step-num">STEP 2: TRACK MILEAGE AUTOMATICALLY (5 MIN)</div>
                <p>Turn on mileage tracking. Every deductible mile is logged at the IRS rate — recorded, versioned, and ready for tax time.</p>
              </div>

              <div class="step">
                <div class="step-num">STEP 3: SEE YOUR QUARTERLY TAX ESTIMATE (10 MIN)</div>
                <p>Tax Autopilot projects your Form 1040-ES estimate from your actual earnings and miles. Know what to set aside — no CPA, no spreadsheet.</p>
              </div>

              <div class="step">
                <div class="step-num">STEP 4 (OPTIONAL): SET UP YOUR STOREFRONT (10 MIN)</div>
                <p>Selling on the side? Turn on the optional commerce add-on: add a product, connect Stripe or PayPal, and you're live.</p>
              </div>
            </div>
            <div class="cta">
              <a href="${baseUrl}/overview">START NOW</a>
            </div>
            <div class="footer">
              <p>© 2025 PNW Enterprises. Built to endure.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    },

    successStories: {
      subject: "How Others Are Using UnifyOne",
      html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Crimson Pro', serif; background: #020202; color: #F0E8D0; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 1px solid rgba(212,168,67,0.2); padding-bottom: 20px; }
            .header h1 { font-family: 'Cinzel', serif; font-size: 28px; margin: 0; color: #D4A843; letter-spacing: 0.05em; }
            .story { margin: 24px 0; padding: 16px; background: rgba(212,168,67,0.05); border-left: 3px solid #D4A843; }
            .story-title { font-family: 'Cinzel', serif; font-size: 16px; font-weight: 600; color: #D4A843; margin-bottom: 8px; }
            .cta { text-align: center; margin: 40px 0; }
            .cta a { display: inline-block; background: #D4A843; color: #020202; padding: 12px 32px; text-decoration: none; font-family: 'Cinzel', sans-serif; font-size: 14px; letter-spacing: 0.1em; font-weight: 600; }
            .footer { text-align: center; margin-top: 60px; padding-top: 20px; border-top: 1px solid rgba(212,168,67,0.1); font-size: 12px; color: #7A7A7A; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>SUCCESS STORIES</h1>
            </div>
            <div class="content">
              <p>See how gig operators are using UnifyOne to know what they earn and keep what they owe:</p>

              <div class="story">
                <div class="story-title">MULTI-APP DRIVER</div>
                <p>"I run DoorDash, Uber, and Instacart. GigIQ showed my real hourly take was $7 lower on one app after miles — so I shifted those hours. Same weeks, more take-home."</p>
              </div>

              <div class="story">
                <div class="story-title">FULL-TIME FREELANCER</div>
                <p>"Tax Autopilot logged 9,400 deductible miles last year — a deduction I used to lose to a messy notebook. My quarterly 1040-ES estimates were ready on time, and for the first time there was no surprise bill in April."</p>
              </div>

              <div class="story">
                <div class="story-title">SIDE-HUSTLE STOREFRONT</div>
                <p>"I deliver by day and sell prints online. The optional commerce add-on runs my little store — products, orders, Stripe — right next to my earnings and tax picture. One login, no extra SaaS bill."</p>
              </div>
            </div>
            <div class="cta">
              <a href="${baseUrl}/the-system">SEE HOW IT WORKS</a>
            </div>
            <div class="footer">
              <p>© 2025 PNW Enterprises. Built to endure.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    },

    limitedOffer: {
      subject: "Limited: Early Adopter Pricing (Expires in 7 Days)",
      html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Crimson Pro', serif; background: #020202; color: #F0E8D0; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 1px solid rgba(212,168,67,0.2); padding-bottom: 20px; }
            .header h1 { font-family: 'Cinzel', serif; font-size: 28px; margin: 0; color: #D4A843; letter-spacing: 0.05em; }
            .offer { margin: 40px 0; padding: 24px; background: rgba(212,168,67,0.1); border: 2px solid #D4A843; text-align: center; }
            .offer-text { font-size: 16px; margin: 12px 0; }
            .offer-price { font-family: 'Cinzel', serif; font-size: 32px; color: #D4A843; font-weight: 600; margin: 16px 0; }
            .offer-note { font-size: 12px; color: #9A9A9A; margin-top: 12px; }
            .cta { text-align: center; margin: 40px 0; }
            .cta a { display: inline-block; background: #D4A843; color: #020202; padding: 12px 32px; text-decoration: none; font-family: 'Cinzel', sans-serif; font-size: 14px; letter-spacing: 0.1em; font-weight: 600; }
            .footer { text-align: center; margin-top: 60px; padding-top: 20px; border-top: 1px solid rgba(212,168,67,0.1); font-size: 12px; color: #7A7A7A; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>EARLY ADOPTER PRICING</h1>
            </div>
            <div class="content">
              <p>You've been with us from the beginning. We want to reward that commitment.</p>
              
              <div class="offer">
                <div class="offer-text">Lock in lifetime pricing</div>
                <div class="offer-price">40% OFF</div>
                <div class="offer-text">All plans, forever</div>
                <div class="offer-note">Offer expires in 7 days</div>
              </div>

              <p>This is the Cathedral Principle in action: we build for the long term, and we reward those who believe in the vision early.</p>
              <p>No catch. No hidden fees. Just honest pricing for gig operators who are in it for the long haul.</p>
            </div>
            <div class="cta">
              <a href="${baseUrl}/tithes">CLAIM YOUR PRICING</a>
            </div>
            <div class="footer">
              <p>© 2025 PNW Enterprises. Built to endure.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    },
  };
}

/** Lazily-built email templates using the resolved app URL */
export const emailTemplates = buildEmailTemplates(getAppUrl());
