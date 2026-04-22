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
    subject: "Welcome to UnifyOne — Built to Endure",
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
              <h1>UNIFYONEONE</h1>
              <p style="margin: 8px 0; font-size: 12px; letter-spacing: 0.1em; color: #9A9A9A;">CATHEDRAL FRAMEWORK</p>
            </div>
            <div class="content">
              <p>Welcome to UnifyOne.</p>
              <p>You've joined a community of commerce builders who believe in infrastructure that endures. We've engineered a multi-tenant platform that replaces three separate SaaS tools with one cohesive system — built sequentially, structured like a cathedral, and powered by Kai.</p>
              <p>Over the next two weeks, we'll show you:</p>
              <ul>
                <li>How the Six Pillars architecture eliminates operational drag</li>
                <li>Why sequential construction beats feature bloat</li>
                <li>How Kai becomes your commerce co-pilot</li>
                <li>Exclusive pricing for early adopters</li>
              </ul>
              <p>Start here: explore the <a href="${baseUrl}/architecture" style="color: #D4A843; text-decoration: none;">Cathedral Framework</a> and see how commerce infrastructure should be built.</p>
            </div>
            <div class="cta">
              <a href="${baseUrl}/begin">BEGIN CONSTRUCTION</a>
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
              <p>UnifyOne is built on six structural pillars, each engineered to eliminate redundancy and operational drag:</p>
              
              <div class="pillar">
                <div class="pillar-title">1. MULTI-TENANT FOUNDATION</div>
                <p>One codebase. Infinite tenants. Complete isolation. Your customers run on the same infrastructure that powers enterprise commerce.</p>
              </div>

              <div class="pillar">
                <div class="pillar-title">2. COMMERCE INFRASTRUCTURE</div>
                <p>Products, orders, inventory, customers — all modeled for scale. No more spreadsheets. No more manual syncs.</p>
              </div>

              <div class="pillar">
                <div class="pillar-title">3. PAYMENT ORCHESTRATION</div>
                <p>Stripe, PayPal, and custom gateways unified under one API. One checkout. Multiple payment methods.</p>
              </div>

              <div class="pillar">
                <div class="pillar-title">4. AUTOMATION MESH</div>
                <p>n8n workflows, Zapier integrations, and custom webhooks wired directly into your commerce engine.</p>
              </div>

              <div class="pillar">
                <div class="pillar-title">5. SOCIAL INTELLIGENCE</div>
                <p>Meta Pixel, Google Analytics, and custom event tracking. Every conversion feeds your ad algorithm.</p>
              </div>

              <div class="pillar">
                <div class="pillar-title">6. KAI AI</div>
                <p>Your commerce co-pilot. Context-aware suggestions, automated insights, and intelligent automation.</p>
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
              <p>Ready to build? Here's your roadmap:</p>
              
              <div class="step">
                <div class="step-num">STEP 1: CREATE YOUR TENANT (5 MIN)</div>
                <p>Set up your commerce namespace. Choose your domain, configure your brand, and claim your space.</p>
              </div>

              <div class="step">
                <div class="step-num">STEP 2: ADD YOUR FIRST PRODUCT (10 MIN)</div>
                <p>Create a test product. Upload an image. Set a price. See the system in action.</p>
              </div>

              <div class="step">
                <div class="step-num">STEP 3: CONNECT YOUR PAYMENT GATEWAY (10 MIN)</div>
                <p>Wire Stripe or PayPal. Test a transaction. Verify the webhook. You're live.</p>
              </div>

              <div class="step">
                <div class="step-num">STEP 4: INVITE YOUR TEAM (5 MIN)</div>
                <p>Add collaborators. Assign roles. Start building together.</p>
              </div>
            </div>
            <div class="cta">
              <a href="${baseUrl}/begin">START NOW</a>
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
              <p>See how commerce builders are using UnifyOne to scale without headcount:</p>
              
              <div class="story">
                <div class="story-title">MULTI-TENANT SAAS PROVIDER</div>
                <p>"We replaced three separate tools with UnifyOne. Our customers now have one dashboard. Our support load dropped 40%. We're shipping faster."</p>
              </div>

              <div class="story">
                <div class="story-title">E-COMMERCE AGENCY</div>
                <p>"UnifyOne's white-label capabilities let us offer a branded platform to our clients. We're now a technology provider, not just a service agency."</p>
              </div>

              <div class="story">
                <div class="story-title">DIRECT-TO-CONSUMER BRAND</div>
                <p>"Kai suggested a pricing optimization that increased our AOV by 18%. The platform pays for itself in the first month."</p>
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
              <p>No catch. No hidden fees. Just honest pricing for builders who are in it for the endurance.</p>
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
