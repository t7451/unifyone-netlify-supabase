/**
 * routeSeo.ts — per-route SEO metadata for non-SEO-landing routes.
 *
 * These routes set their real <title>/<meta description> at runtime via React
 * Helmet / the SEO head component, which no-JS crawlers never execute — so the
 * static prerender (vite-plugin-prerender-seo) previously fell back to the
 * homepage's title + description on all of them (duplicate titles, generic
 * descriptions). This registry gives the prerender per-route meta so each
 * static HTML file ships its own accurate, aligned, ≤158-char description and a
 * unique title. Values mirror each page's real on-page meta.
 *
 * Keep every `description` ≤158 characters (Ahrefs/Google snippet limit).
 */
export interface RouteSeo {
  path: string;
  title: string;
  description: string;
  /**
   * Optional pre-hydration body paragraphs. The prerender renders these (plus a
   * unique h1 and an internal-links nav) into the static HTML so crawlers see
   * real per-page content. When omitted, the description is used as the intro.
   */
  body?: string[];
  /**
   * Optional authoritative outbound links rendered (crawler-visible) into the
   * prerendered page — used where genuinely relevant (e.g. IRS pages for tax
   * tools, platform sites for gig tools) to give each page a real outbound
   * link profile and improve E-E-A-T.
   */
  externalLinks?: { label: string; url: string }[];
}

// Reusable authoritative outbound links.
const IRS = {
  mileage: {
    label: "IRS standard mileage rates",
    url: "https://www.irs.gov/tax-professionals/standard-mileage-rates",
  },
  estimated: {
    label: "IRS estimated taxes",
    url: "https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes",
  },
  seTax: {
    label: "IRS self-employment tax",
    url: "https://www.irs.gov/businesses/small-businesses-self-employed/self-employment-tax-social-security-and-medicare-taxes",
  },
  selfEmployedCenter: {
    label: "IRS Self-Employed Individuals Tax Center",
    url: "https://www.irs.gov/businesses/small-businesses-self-employed/self-employed-individuals-tax-center",
  },
};
const PLATFORMS = [
  { label: "DoorDash", url: "https://www.doordash.com" },
  { label: "Uber Eats", url: "https://www.ubereats.com" },
  { label: "Instacart", url: "https://www.instacart.com" },
];

// Authoritative resources for the platform-specific tax guides: the IRS
// self-employed center + estimated taxes, plus the relevant platform site.
const DOORDASH_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.mileage,
  { label: "DoorDash", url: "https://www.doordash.com" },
];
const UBER_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.mileage,
  { label: "Uber", url: "https://www.uber.com" },
];
const INSTACART_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.mileage,
  { label: "Instacart", url: "https://www.instacart.com" },
];

// ── Gig-tax cluster: state guides, platform comparisons, explainers ──────────
// State tax-agency links for the state-level gig-worker tax guides. Each guide
// pairs the IRS self-employed/estimated/SE-tax links with its state's agency so
// the prerendered page ships an authoritative outbound link profile.
const CA_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "California Franchise Tax Board (Form 540-ES)",
    url: "https://www.ftb.ca.gov/pay/estimated-tax-payments.html",
  },
];
const TX_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  { label: "Texas Comptroller", url: "https://comptroller.texas.gov/" },
];
const FL_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Florida Department of Revenue",
    url: "https://floridarevenue.com/",
  },
];
const NY_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "NY Dept. of Taxation and Finance (Form IT-2105)",
    url: "https://www.tax.ny.gov/pit/estimated_tax/default.htm",
  },
];
const IL_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Illinois Department of Revenue (Form IL-1040-ES)",
    url: "https://tax.illinois.gov/individuals/estimatedpayments.html",
  },
];
const WA_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Washington Department of Revenue",
    url: "https://dor.wa.gov/",
  },
];
const GA_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Georgia Department of Revenue (Form 500-ES)",
    url: "https://dor.georgia.gov/500-es-individual-and-fiduciary-estimated-tax-payment-voucher",
  },
];
const PA_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Pennsylvania Department of Revenue (Form PA-40 ES)",
    url: "https://www.pa.gov/agencies/revenue/forms-and-publications.html",
  },
];
const NJ_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "NJ Division of Taxation (Form NJ-1040-ES)",
    url: "https://www.nj.gov/treasury/taxation/njit20.shtml",
  },
];
const AZ_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Arizona Department of Revenue (Form 140ES)",
    url: "https://azdor.gov/forms/individual/individual-estimated-tax-payment-form",
  },
];
const OH_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Ohio Department of Taxation (Form IT 1040ES)",
    url: "https://tax.ohio.gov/individual/resources/estimated-payments",
  },
];
const NC_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "North Carolina Department of Revenue (Form NC-40)",
    url: "https://www.ncdor.gov/taxes-forms/individual-income-tax/estimated-income-tax",
  },
];
const MI_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Michigan Department of Treasury (Form MI-1040ES)",
    url: "https://www.michigan.gov/taxes/iit/estimated-payments",
  },
];
const CO_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Colorado Department of Revenue (Form DR 0104EP)",
    url: "https://tax.colorado.gov/individual-income-tax-estimated-payments",
  },
];
const VA_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Virginia Department of Taxation (Form 760ES)",
    url: "https://www.tax.virginia.gov/individual-estimated-tax-payments",
  },
];
const MA_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Massachusetts DOR (Form 1-ES)",
    url: "https://www.mass.gov/info-details/dor-estimated-tax-payment-vouchers",
  },
];
const MD_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Comptroller of Maryland (Form PV)",
    url: "https://www.marylandtaxes.gov/individual/income/filing/estimated-tax.php",
  },
];
const MN_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Minnesota Department of Revenue (Form M14)",
    url: "https://www.revenue.state.mn.us/estimated-tax",
  },
];
const MO_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Missouri Department of Revenue (Form MO-1040ES)",
    url: "https://dor.mo.gov/taxation/individual/tax-types/income/",
  },
];
const IN_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Indiana Department of Revenue (Form ES-40)",
    url: "https://www.in.gov/dor/individual-income-taxes/",
  },
];
const TN_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Tennessee Department of Revenue",
    url: "https://www.tn.gov/revenue.html",
  },
];
const NV_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  { label: "Nevada Department of Taxation", url: "https://tax.nv.gov/" },
];
const WI_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Wisconsin Department of Revenue (Form 1-ES)",
    url: "https://www.revenue.wi.gov/",
  },
];
const OR_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Oregon Department of Revenue (estimated income tax)",
    url: "https://www.oregon.gov/dor/",
  },
];
const SC_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "South Carolina Department of Revenue (Form SC1040ES)",
    url: "https://dor.sc.gov/",
  },
];
const AL_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Alabama Department of Revenue (Form 40ES)",
    url: "https://www.revenue.alabama.gov/",
  },
];
const LA_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Louisiana Department of Revenue (Form IT-540ES)",
    url: "https://revenue.louisiana.gov/",
  },
];
const KY_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Kentucky Department of Revenue (Form 740-ES)",
    url: "https://revenue.ky.gov/",
  },
];
const OK_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Oklahoma Tax Commission (Form OW-8-ES)",
    url: "https://oklahoma.gov/tax.html",
  },
];
const CT_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Connecticut Department of Revenue Services (Form CT-1040ES)",
    url: "https://portal.ct.gov/DRS",
  },
];
const UT_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Utah State Tax Commission (Form TC-546)",
    url: "https://tax.utah.gov/",
  },
];
const IA_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Iowa Department of Revenue (Form IA 1040ES)",
    url: "https://revenue.iowa.gov/",
  },
];
const KS_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Kansas Department of Revenue (Form K-40ES)",
    url: "https://www.ksrevenue.gov/",
  },
];
const NM_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "New Mexico Taxation and Revenue Department (Form PIT-ES)",
    url: "https://www.tax.newmexico.gov/",
  },
];
const NE_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Nebraska Department of Revenue (Form 1040N-ES)",
    url: "https://revenue.nebraska.gov/",
  },
];
const MS_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Mississippi Department of Revenue (Form 80-106)",
    url: "https://www.dor.ms.gov/",
  },
];
const AR_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Arkansas Dept. of Finance and Administration (Form AR1000ES)",
    url: "https://www.dfa.arkansas.gov/income-tax/individual-income-tax/",
  },
];
const WV_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "West Virginia Tax Division (Form IT-140ES)",
    url: "https://tax.wv.gov/",
  },
];
const ID_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Idaho State Tax Commission (Form 51)",
    url: "https://tax.idaho.gov/",
  },
];
const HI_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Hawaii Department of Taxation",
    url: "https://tax.hawaii.gov/",
  },
];
const ME_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Maine Revenue Services (Form 1040ES-ME)",
    url: "https://www.maine.gov/revenue/",
  },
];
const RI_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Rhode Island Division of Taxation (Form RI-1040ES)",
    url: "https://tax.ri.gov/",
  },
];
const AK_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  { label: "Alaska Department of Revenue", url: "https://dor.alaska.gov/" },
];
const NH_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "New Hampshire Department of Revenue Administration",
    url: "https://www.revenue.nh.gov/",
  },
];
const SD_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  { label: "South Dakota Department of Revenue", url: "https://dor.sd.gov/" },
];
const WY_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  { label: "Wyoming Department of Revenue", url: "https://revenue.wyo.gov/" },
];
const DE_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Delaware Division of Revenue (Form 200-ES)",
    url: "https://revenue.delaware.gov/",
  },
];
const MT_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Montana Department of Revenue (estimated income tax)",
    url: "https://mtrevenue.gov/",
  },
];
const ND_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "North Dakota Office of State Tax Commissioner (Form ND-1ES)",
    url: "https://www.tax.nd.gov/",
  },
];
const VT_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Vermont Department of Taxes (Form IN-114)",
    url: "https://tax.vermont.gov/",
  },
];
const DC_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "DC Office of Tax and Revenue (Form D-40ES)",
    url: "https://otr.cfo.dc.gov/",
  },
];

// Authoritative resources for the gig platform comparison guides. The IRS
// self-employed center + estimated taxes anchor the (educational, not advice)
// tax framing; the two platform sites being compared give each page a real,
// relevant outbound link profile.
const PLATFORM_LINKS = {
  doordash: { label: "DoorDash", url: "https://www.doordash.com" },
  uberEats: { label: "Uber Eats", url: "https://www.ubereats.com" },
  uber: { label: "Uber", url: "https://www.uber.com" },
  lyft: { label: "Lyft", url: "https://www.lyft.com" },
  instacart: { label: "Instacart", url: "https://www.instacart.com" },
  grubhub: { label: "Grubhub", url: "https://www.grubhub.com" },
  amazonFlex: { label: "Amazon Flex", url: "https://flex.amazon.com" },
  spark: { label: "Walmart Spark", url: "https://drive4spark.walmart.com" },
  shipt: { label: "Shipt", url: "https://www.shipt.com" },
  taskrabbit: { label: "TaskRabbit", url: "https://www.taskrabbit.com" },
  gopuff: { label: "Gopuff Driver", url: "https://driver.gopuff.com" },
  rover: { label: "Rover", url: "https://www.rover.com" },
  wag: { label: "Wag", url: "https://wagwalking.com" },
  upwork: { label: "Upwork", url: "https://www.upwork.com" },
  fiverr: { label: "Fiverr", url: "https://www.fiverr.com" },
};
const DOORDASH_VS_UBER_EATS_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  PLATFORM_LINKS.doordash,
  PLATFORM_LINKS.uberEats,
];
const INSTACART_VS_DOORDASH_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  PLATFORM_LINKS.instacart,
  PLATFORM_LINKS.doordash,
];
const UBER_VS_LYFT_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  PLATFORM_LINKS.uber,
  PLATFORM_LINKS.lyft,
];
const DOORDASH_VS_GRUBHUB_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  PLATFORM_LINKS.doordash,
  PLATFORM_LINKS.grubhub,
];
const AMAZON_FLEX_VS_SPARK_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  PLATFORM_LINKS.amazonFlex,
  PLATFORM_LINKS.spark,
];
const INSTACART_VS_SHIPT_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  PLATFORM_LINKS.instacart,
  PLATFORM_LINKS.shipt,
];
const UBER_VS_DOORDASH_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  PLATFORM_LINKS.uber,
  PLATFORM_LINKS.doordash,
];
const UBER_EATS_VS_GRUBHUB_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  PLATFORM_LINKS.uberEats,
  PLATFORM_LINKS.grubhub,
];
const DOORDASH_VS_SPARK_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  PLATFORM_LINKS.doordash,
  PLATFORM_LINKS.spark,
];
const AMAZON_FLEX_VS_DOORDASH_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  PLATFORM_LINKS.amazonFlex,
  PLATFORM_LINKS.doordash,
];
const UPWORK_VS_FIVERR_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  PLATFORM_LINKS.upwork,
  PLATFORM_LINKS.fiverr,
];
const GOPUFF_VS_DOORDASH_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  PLATFORM_LINKS.gopuff,
  PLATFORM_LINKS.doordash,
];
const ROVER_VS_WAG_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  PLATFORM_LINKS.rover,
  PLATFORM_LINKS.wag,
];
const LYFT_VS_UBER_EATS_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  PLATFORM_LINKS.lyft,
  PLATFORM_LINKS.uberEats,
];

// Additional platform-specific tax-guide link bundles (Amazon Flex, Grubhub,
// Lyft, Spark, Shipt) — IRS resources + the relevant platform's driver site.
const AMAZON_FLEX_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.mileage,
  { label: "Amazon Flex", url: "https://flex.amazon.com" },
];
const GRUBHUB_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.mileage,
  { label: "Grubhub for Drivers", url: "https://driver.grubhub.com" },
];
const LYFT_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.mileage,
  { label: "Lyft", url: "https://www.lyft.com" },
];
const SPARK_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.mileage,
  { label: "Spark Driver", url: "https://drive4spark.walmart.com" },
];
const SHIPT_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.mileage,
  { label: "Shipt", url: "https://www.shipt.com" },
];
const ROADIE_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.mileage,
  { label: "Roadie", url: "https://www.roadie.com" },
];
const GOPUFF_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.mileage,
  { label: "Gopuff Driver", url: "https://driver.gopuff.com" },
];
const TASKRABBIT_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.mileage,
  { label: "TaskRabbit", url: "https://www.taskrabbit.com" },
];
const ROVER_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.mileage,
  { label: "Rover", url: "https://www.rover.com" },
];
const UPWORK_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  { label: "Upwork", url: "https://www.upwork.com" },
];
const FIVERR_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  { label: "Fiverr", url: "https://www.fiverr.com" },
];
const FAVOR_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.mileage,
  { label: "Favor", url: "https://favordelivery.com" },
];
const VEHO_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.mileage,
  { label: "Veho", url: "https://shipveho.com" },
];
const DOLLY_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.mileage,
  { label: "Dolly", url: "https://dolly.com" },
];
const GOSHARE_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.mileage,
  { label: "GoShare", url: "https://goshare.co" },
];
const WAG_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.mileage,
  { label: "Wag", url: "https://wagwalking.com" },
];
// Marketplace-seller tax guides: the IRS self-employed center + the IRS 1099-K
// explainer anchor the (educational, not advice) framing for goods sellers, and
// the platform's own seller page gives each a relevant outbound link.
const IRS_1099K = {
  label: "IRS: Understanding your Form 1099-K",
  url: "https://www.irs.gov/businesses/understanding-your-form-1099-k",
};
const ETSY_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS_1099K,
  { label: "Sell on Etsy", url: "https://www.etsy.com/sell" },
];
const EBAY_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS_1099K,
  { label: "eBay Seller Center", url: "https://www.ebay.com/sellercenter" },
];
const POSHMARK_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS_1099K,
  { label: "Poshmark", url: "https://poshmark.com" },
];
const MERCARI_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS_1099K,
  { label: "Mercari", url: "https://www.mercari.com" },
];
const DEPOP_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS_1099K,
  { label: "Depop", url: "https://www.depop.com" },
];

// Getting-started ("how to make money on <platform>") guides: the platform's
// own signup/driver page anchors each page's outbound profile, paired with the
// IRS self-employed center so the (educational, not advice) tax framing is
// authoritative. No earnings figures are quoted on these pages.
const DOORDASH_START_LINKS = [
  { label: "Become a Dasher (DoorDash)", url: "https://dasher.doordash.com" },
  PLATFORM_LINKS.doordash,
  IRS.selfEmployedCenter,
];
const UBER_START_LINKS = [
  { label: "Drive with Uber", url: "https://www.uber.com/us/en/drive/" },
  PLATFORM_LINKS.uber,
  IRS.selfEmployedCenter,
];
const INSTACART_START_LINKS = [
  {
    label: "Become an Instacart shopper",
    url: "https://shoppers.instacart.com",
  },
  PLATFORM_LINKS.instacart,
  IRS.selfEmployedCenter,
];
const AMAZON_FLEX_START_LINKS = [
  { label: "Sign up for Amazon Flex", url: "https://flex.amazon.com" },
  PLATFORM_LINKS.amazonFlex,
  IRS.selfEmployedCenter,
];
const LYFT_START_LINKS = [
  { label: "Drive with Lyft", url: "https://www.lyft.com/drivers" },
  PLATFORM_LINKS.lyft,
  IRS.selfEmployedCenter,
];
const GRUBHUB_START_LINKS = [
  { label: "Become a Grubhub driver", url: "https://driver.grubhub.com" },
  PLATFORM_LINKS.grubhub,
  IRS.selfEmployedCenter,
];
const SPARK_START_LINKS = [
  {
    label: "Join the Spark Driver platform",
    url: "https://drive4spark.walmart.com",
  },
  PLATFORM_LINKS.spark,
  IRS.selfEmployedCenter,
];
const TASKRABBIT_START_LINKS = [
  {
    label: "Become a Tasker (TaskRabbit)",
    url: "https://www.taskrabbit.com/become-a-tasker",
  },
  PLATFORM_LINKS.taskrabbit,
  IRS.selfEmployedCenter,
];
const ROVER_START_LINKS = [
  {
    label: "Become a Rover sitter",
    url: "https://www.rover.com/become-a-sitter/",
  },
  PLATFORM_LINKS.rover,
  IRS.selfEmployedCenter,
];

// Gig finance cluster (money topics beyond taxes): IRS / HealthCare.gov / CFPB.
const RETIREMENT_LINKS = [
  {
    label: "IRS: Retirement plans for the self-employed",
    url: "https://www.irs.gov/retirement-plans/retirement-plans-for-self-employed-people",
  },
  IRS.selfEmployedCenter,
];
const HEALTH_LINKS = [
  {
    label: "HealthCare.gov: Coverage for self-employed people",
    url: "https://www.healthcare.gov/self-employed/coverage/",
  },
  IRS.selfEmployedCenter,
];
const BOOKKEEPING_LINKS = [
  {
    label: "IRS: Recordkeeping for businesses",
    url: "https://www.irs.gov/businesses/small-businesses-self-employed/recordkeeping",
  },
  IRS.selfEmployedCenter,
];
const BUDGETING_LINKS = [
  {
    label: "CFPB: Budgeting with an irregular income",
    url: "https://www.consumerfinance.gov/about-us/blog/budgeting-when-you-have-an-irregular-income/",
  },
  IRS.selfEmployedCenter,
];
const EMERGENCY_FUND_LINKS = [
  {
    label: "CFPB: Start Small, Save Up (emergency savings)",
    url: "https://www.consumerfinance.gov/start-small-save-up/",
  },
  IRS.selfEmployedCenter,
];
const DEBT_PAYOFF_LINKS = [
  {
    label: "FTC: Getting out of debt",
    url: "https://consumer.ftc.gov/articles/getting-out-debt",
  },
  IRS.selfEmployedCenter,
];
const SEP_SOLO_LINKS = [
  {
    label: "IRS: One-participant 401(k) plans",
    url: "https://www.irs.gov/retirement-plans/one-participant-401k-plans",
  },
  IRS.selfEmployedCenter,
];
const LLC_SOLEPROP_LINKS = [
  {
    label: "IRS: Business structures",
    url: "https://www.irs.gov/businesses/small-businesses-self-employed/business-structures",
  },
  IRS.selfEmployedCenter,
];
const W2_GIG_LINKS = [
  {
    label: "IRS: Tax Withholding Estimator",
    url: "https://www.irs.gov/individuals/tax-withholding-estimator",
  },
  IRS.selfEmployedCenter,
];
const MULTI_STATE_LINKS = [
  {
    label: "IRS: State government websites",
    url: "https://www.irs.gov/businesses/small-businesses-self-employed/state-government-websites",
  },
  IRS.selfEmployedCenter,
];
const NEW_GIG_CHECKLIST_LINKS = [IRS.estimated, IRS.selfEmployedCenter];

export const ROUTE_SEO: RouteSeo[] = [
  {
    path: "/gig-worker-retirement",
    externalLinks: RETIREMENT_LINKS,
    title:
      "Retirement Accounts for Gig Workers: SEP-IRA, Solo 401(k) & IRAs | UnifyOne",
    description:
      "Retirement options for self-employed gig workers: SEP-IRA, Solo 401(k), and Traditional vs Roth IRAs — how each works and how to choose. Not advice.",
    body: [
      "Gig platforms don't offer a 401(k) match, so as an independent contractor your retirement is up to you — but the self-employed get access to some of the most generous tax-advantaged accounts available.",
      "A SEP-IRA is the simplest to open and lets you contribute a percentage of net self-employment earnings, generally tax-deductible. A Solo 401(k) usually allows the largest total contribution because you save as both employee and employer, often with a Roth option.",
      "Traditional and Roth IRAs work alongside these at lower limits, with Roth growing tax-free. Contribution limits change yearly, so confirm the current figures with the IRS before contributing.",
      "Contributing a steady percentage of each payout — alongside your tax set-aside — builds the retirement an employer would otherwise help fund. This is educational information, not financial advice.",
    ],
  },
  {
    path: "/gig-worker-health-insurance",
    externalLinks: HEALTH_LINKS,
    title:
      "Health Insurance for Gig Workers: Options & the Self-Employed Deduction | UnifyOne",
    description:
      "Health insurance for gig workers: the ACA marketplace and subsidies, spouse/Medicaid coverage, HSAs, and the self-employed health deduction. Not advice.",
    body: [
      "Gig platforms classify you as an independent contractor, so they provide no health insurance — finding your own coverage is part of the job, but the self-employed have several routes and a tax break employees don't get.",
      "Most gig workers buy an individual plan on the ACA marketplace (HealthCare.gov), where income-based subsidies can cut the cost; estimate your variable income carefully. A spouse's employer plan or Medicaid may be cheaper if available.",
      "If you're not eligible for an employer or spouse's plan, you can often take the self-employed health insurance deduction — an above-the-line deduction for premiums that lowers income tax (not the 15.3% SE tax). Pairing a high-deductible plan with an HSA adds more tax-advantaged savings.",
      "Confirm current subsidy and deduction rules with HealthCare.gov and the IRS. This is educational information, not financial or tax advice.",
    ],
  },
  {
    path: "/gig-worker-bookkeeping",
    externalLinks: BOOKKEEPING_LINKS,
    title:
      "Bookkeeping for Gig Workers: Track Income, Expenses & Mileage | UnifyOne",
    description:
      "Simple bookkeeping for gig workers: separate accounts, tracking all income and expenses, mileage logs, and records that hold up in an audit. Not advice.",
    body: [
      "As a 1099 contractor you're running a small business, and a few bookkeeping habits turn tax season into a quick task while protecting your deductions if the IRS ever asks.",
      "Run gig income and expenses through a dedicated bank account so your statement doubles as a ledger, record income from every platform (even those that send no 1099), and reconcile monthly so you always know your true net for quarterly taxes.",
      "Capture every deductible expense with a receipt, and keep a contemporaneous mileage log — date, miles, and purpose of each trip — since mileage is usually the biggest deduction and the most audited. Estimated, reconstructed mileage is what gets disallowed.",
      "Keep records for at least several years (the IRS publishes specifics); digital copies are fine. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/gig-worker-budgeting",
    externalLinks: BUDGETING_LINKS,
    title:
      "Budgeting on Irregular Gig Income: Smooth Pay & Build a Buffer | UnifyOne",
    description:
      "How to budget on irregular gig income: pay yourself a steady amount, budget from a low baseline, separate your tax set-aside, and build a buffer. Not advice.",
    body: [
      "The hardest part of gig work is often that money arrives unevenly — a great week and a slow week fund the same rent. A simple system smooths the bumps so a slow stretch never becomes a crisis.",
      "Let earnings pool in a holding account and pay yourself a fixed, modest amount on a set schedule; good weeks build the account and slow weeks draw from it. Budget your essentials against a conservative, low-but-typical month rather than your best week.",
      "Because nothing is withheld, move your tax set-aside (commonly 25–30% of net) into a separate account the moment you're paid so quarterly estimates never compete with rent. Send surplus to a buffer, then retirement and goals.",
      "Aim for roughly a month of expenses as a buffer so a slow week or a repair is an inconvenience, not an emergency. This is educational information, not financial advice.",
    ],
  },
  {
    path: "/gig-worker-emergency-fund",
    externalLinks: EMERGENCY_FUND_LINKS,
    title:
      "Emergency Funds for Gig Workers: How Much to Save & Where | UnifyOne",
    description:
      "Why gig workers need a bigger emergency fund, how much to save on irregular income, where to keep it, and how to build one fast. Not advice.",
    body: [
      "Independent contractors usually have no paid sick leave, severance, or unemployment cushion, so if you can't work, the income stops — and a single event like a car repair can knock out both your earning ability and your budget at once.",
      "That's why gig workers often target the higher end of the usual three-to-six-months-of-expenses range. Base the figure on essentials — housing, food, utilities, insurance, minimum debt payments — not total spending.",
      "Keep the fund safe and liquid in a separate high-yield savings account, distinct from both your spending money and your tax set-aside (which is money you already owe, not savings). On variable income, save a percentage of every payout rather than a fixed monthly amount, and route windfalls straight in.",
      "Start with a small milestone, then a one-month buffer, then the full fund. This is educational information, not financial advice.",
    ],
  },
  {
    path: "/gig-worker-debt-payoff",
    externalLinks: DEBT_PAYOFF_LINKS,
    title:
      "Paying Off Debt on a Gig Income: Avalanche, Snowball & Cash Flow | UnifyOne",
    description:
      "How gig workers pay off debt on irregular income: budget from a low baseline, choose avalanche vs snowball, and use surplus weeks. Not advice.",
    body: [
      "Paying down debt on income that swings week to week takes a system. Build a small starter buffer first so a slow week doesn't put you right back on a credit card, and keep paying at least the minimum on every debt no matter what.",
      "Choose a method: the avalanche (highest interest first) saves the most money, while the snowball (smallest balance first) gives quicker motivating wins. Both work — pick the one you'll stick with.",
      "On variable income, commit a percentage of each payout to debt rather than a fixed monthly sum, budget essentials from a conservative low-but-typical month, and aim surplus weeks and windfalls at the target balance. Don't raid your tax set-aside — unpaid federal taxes carry penalties and are hard to discharge.",
      "If debt is overwhelming, a non-profit credit counselor can help. This is educational information, not financial advice.",
    ],
  },
  {
    path: "/sep-ira-vs-solo-401k",
    externalLinks: SEP_SOLO_LINKS,
    title:
      "SEP-IRA vs Solo 401(k): Which Is Better for Gig Workers? | UnifyOne",
    description:
      "SEP-IRA vs Solo 401(k) for self-employed gig workers: contributions, Roth options, paperwork, and deadlines compared — and how to choose. Not advice.",
    body: [
      "Both the SEP-IRA and the Solo 401(k) let self-employed gig workers shelter far more than a regular IRA, but they differ on contributions, Roth options, paperwork, and deadlines.",
      "The SEP-IRA is the simplest — free to open in minutes, employer-style percentage contribution only, flexible year to year, and fundable up to your extended filing deadline. The Solo 401(k) adds an employee elective deferral on top of an employer contribution, usually allowing a larger total (especially at moderate income) and often a Roth option.",
      "Trade-offs: the Solo 401(k) needs a bit more paperwork and generally must be established by December 31, while the SEP-IRA is more forgiving on deadlines. You can't max both on the same income, and limits change yearly — confirm them with the IRS.",
      "Pick the SEP-IRA for simplicity, the Solo 401(k) to contribute the most or get a Roth option. This is educational information, not investment advice.",
    ],
  },
  {
    path: "/llc-vs-sole-proprietorship",
    externalLinks: LLC_SOLEPROP_LINKS,
    title:
      "LLC vs Sole Proprietorship for Gig Workers: Do You Need an LLC? | UnifyOne",
    description:
      "LLC vs sole proprietorship for gig workers: liability, taxes, cost, and when an LLC is worth it (and the S-corp question). Not advice.",
    body: [
      "If you drive, deliver, or freelance without forming anything, you're already a sole proprietor: you report on Schedule C, pay self-employment tax, and can deduct the same business expenses. You don't need an LLC to claim deductions.",
      "An LLC is a state-level legal structure whose core benefit is liability protection — separating your personal assets from the business if it's sued or owes a debt. It adds a filing fee and some paperwork, and it adds credibility, but it isn't a tax shield.",
      "By default a single-member LLC is a 'disregarded entity,' taxed exactly like a sole proprietorship — forming one doesn't lower your federal income tax. Tax savings instead come from a separate S-corporation election, which only makes sense above a certain profit level and adds payroll and cost.",
      "Consider an LLC for real liability exposure, and the S-corp election only once profit is consistently high. This is educational information, not legal or tax advice.",
    ],
  },
  {
    path: "/gig-worker-w2-job-taxes",
    externalLinks: W2_GIG_LINKS,
    title: "Gig Work Plus a W-2 Job: How to Handle Taxes on Both | UnifyOne",
    description:
      "Have a W-2 job and gig income? Report gig income on Schedule C, owe self-employment tax, and use extra W-2 withholding to cover it. Not advice.",
    body: [
      "A W-2 job doesn't make your side income tax-free. You report gig (1099) earnings on Schedule C, deduct related expenses, and the net profit is added to your W-2 wages — even if a platform never sends a 1099.",
      "On that net gig profit you also owe self-employment tax (roughly 15.3%) via Schedule SE. Your paycheck already withholds the employee share of Social Security and Medicare on your wages, but your gig profit is separate and isn't covered by it.",
      "Instead of separate quarterly estimates, you can often file a new Form W-4 to withhold extra from your paycheck to cover the gig tax; withholding counts as paid evenly across the year, which helps avoid penalties. The IRS Tax Withholding Estimator helps size it.",
      "Both incomes stack to set your bracket, and W-2 Social Security tax already withheld counts toward the annual wage base. Confirm current figures with the IRS. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/multi-state-gig-taxes",
    externalLinks: MULTI_STATE_LINKS,
    title: "Multi-State Gig Taxes: Working Across State Lines | UnifyOne",
    description:
      "Gig work across state lines or moving mid-year: resident vs nonresident state tax, a credit for taxes paid to other states, and part-year rules. Not advice.",
    body: [
      "If you drive, deliver, or freelance across state lines — or moved partway through the year — your gig income can touch more than one state. The rules are designed so you're rarely taxed twice on the same dollar.",
      "As a general rule, your resident (home) state can tax all of your income wherever earned, while a nonresident state can tax income you physically earned within its borders — for gig workers, typically where the work actually happened.",
      "When both states tax the same income, your resident state usually grants a credit for taxes paid to the other state, offsetting the overlap (generally capped at your home state's tax on that income). Moving mid-year usually means part-year returns in both states.",
      "Reciprocity agreements mostly cover W-2 wages and often exclude gig income, so don't assume one protects you — confirm with each state's Department of Revenue. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/new-gig-worker-tax-checklist",
    externalLinks: NEW_GIG_CHECKLIST_LINKS,
    title:
      "New Gig Worker Tax Checklist: Your First Year of 1099 Income | UnifyOne",
    description:
      "New to gig work? A first-year tax checklist: report all income, set aside 25–30%, log mileage from day one, and learn the quarterly schedule. Not advice.",
    body: [
      "Your first year of gig work is when good habits or expensive mistakes get set. Nothing is withheld, no one hands you a system, and the IRS now treats you as a small business — this checklist covers what to do from day one.",
      "Report all income, even from platforms that send no 1099, and open a separate bank account so your statement doubles as a ledger. From your very first payout, set aside about 25–30% of net for taxes and treat it as money that was never yours.",
      "Start a contemporaneous mileage log immediately — date, miles, and purpose of each trip — since reconstructed mileage is what gets disallowed, and it's usually the biggest deduction. Learn the quarterly estimated-tax schedule and the roughly $1,000-owed threshold.",
      "At tax time you'll file Schedule C and Schedule SE; skipping the set-aside all year is the classic first-year surprise. Confirm current rules with the IRS. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/uber-vs-doordash",
    externalLinks: UBER_VS_DOORDASH_LINKS,
    title: "Uber vs DoorDash: Which Should You Drive For? | UnifyOne",
    description:
      "Uber (rideshare) vs DoorDash (delivery) compared on pay structure, requirements, 1099 forms, mileage, and scheduling — plus how to compute your net pay.",
    body: [
      "Uber and DoorDash are different jobs: Uber carries passengers, DoorDash carries food. Both pay you as an independent contractor with no taxes withheld, so your take-home depends on your market, hours, and vehicle costs — not the brand.",
      "Uber rideshare usually has a higher bar (often 21+ with a qualifying multi-door vehicle and a stricter inspection); DoorDash is often 18+ with a lower vehicle bar and, in some markets, bike delivery. Both pay per-offer/per-ride with upfront amounts plus 100% of tips.",
      "On taxes, DoorDash issues a 1099-NEC at $600+, while Uber often issues a 1099-K for gross fares plus a 1099-NEC for incentives. You owe income tax plus the 15.3% self-employment tax on net earnings from either, and you must report all income regardless of forms.",
      "To compare them honestly, run comparable shifts on each, track active hours and business miles, subtract mileage and expenses, and divide by hours — the free Real Hourly Rate and Earnings Consolidator calculators do the math. This is educational information, not financial or tax advice.",
    ],
  },
  {
    path: "/uber-eats-vs-grubhub",
    externalLinks: UBER_EATS_VS_GRUBHUB_LINKS,
    title: "Uber Eats vs Grubhub: Which Pays More for Drivers? | UnifyOne",
    description:
      "Uber Eats vs Grubhub compared on pay structure, scheduling blocks, 1099 forms, mileage, and payouts — plus how to compute your own net pay.",
    body: [
      "Uber Eats and Grubhub are both food-delivery apps that pay couriers as independent contractors, but they schedule drivers differently: Uber Eats is mostly on-demand, while Grubhub leans on scheduled blocks and a Premier/Pro priority tier.",
      "Both are per-offer with upfront amounts plus 100% of tips. Grubhub rewards higher acceptance and on-time scheduling with earlier block access; Uber Eats uses Surge/Boost zones and Quests during busy periods.",
      "Grubhub issues a 1099-NEC at $600+; Uber Eats often issues a 1099-NEC for incentives plus a 1099-K for processed fares. You owe income tax plus the 15.3% self-employment tax on net earnings from either, and you must report all income whether or not a form arrives.",
      "To compare, work comparable shifts on each, track active hours and business miles, subtract mileage and expenses, and divide by hours — the free Real Hourly Rate and Earnings Consolidator calculators handle it. This is educational information, not financial or tax advice.",
    ],
  },
  {
    path: "/doordash-vs-spark",
    externalLinks: DOORDASH_VS_SPARK_LINKS,
    title: "DoorDash vs Spark: Which Delivery Gig Is Better? | UnifyOne",
    description:
      "DoorDash vs Walmart Spark compared on order types, pay structure, 1099 forms, mileage, and payouts — plus how to compute your own net pay.",
    body: [
      "DoorDash and the Walmart Spark Driver program are both per-offer delivery apps that pay you as an independent contractor, but the order mix differs: DoorDash spans restaurants, convenience, and retail, while Spark delivers Walmart and Sam's Club orders (some offers include shopping the order).",
      "Both show pay before you accept and pass through 100% of tips. DoorDash's broad merchant base often means steadier volume; Spark availability is tied to nearby Walmart store zones and slot competition.",
      "Both issue a 1099-NEC if you earned $600 or more — DoorDash via Stripe, Spark via its payment partner. You owe income tax plus the 15.3% self-employment tax on net earnings from either, and you must report all income whether or not a form arrives.",
      "To compare, run comparable shifts on each, track active hours and business miles, subtract mileage and expenses, and divide by hours — the free Real Hourly Rate and Earnings Consolidator calculators do the math. This is educational information, not financial or tax advice.",
    ],
  },
  {
    path: "/amazon-flex-vs-doordash",
    externalLinks: AMAZON_FLEX_VS_DOORDASH_LINKS,
    title: "Amazon Flex vs DoorDash: Which Is Better for Drivers? | UnifyOne",
    description:
      "Amazon Flex vs DoorDash compared on block vs per-offer pay, requirements, 1099 forms, mileage, and scheduling — plus how to compute your own net pay.",
    body: [
      "Amazon Flex and DoorDash are both independent-contractor gigs that work very differently: Amazon Flex pays a set amount for a reserved block of package deliveries (tips uncommon), while DoorDash pays per food-delivery offer with tips and lets you log on any time.",
      "Amazon Flex usually requires 21+ and a mid-size or larger vehicle, and you commit to a whole block; DoorDash is often 18+ with a lower vehicle bar and no block commitment. One rewards predictability, the other flexibility.",
      "Both issue a 1099-NEC if you earned $600 or more — Amazon via its tax portal, DoorDash via Stripe. You owe income tax plus the 15.3% self-employment tax on net earnings from either, and you must report all income whether or not a form arrives.",
      "To compare, run comparable shifts on each, track active hours and business miles, subtract mileage and expenses, and divide by hours — the free Real Hourly Rate and Earnings Consolidator calculators handle it. This is educational information, not financial or tax advice.",
    ],
  },
  {
    path: "/upwork-vs-fiverr",
    externalLinks: UPWORK_VS_FIVERR_LINKS,
    title: "Upwork vs Fiverr: Which Is Better for Freelancers? | UnifyOne",
    description:
      "Upwork vs Fiverr compared on how you get work, platform fees, 1099-K forms, payout methods, and who each suits — plus how to compute your own net pay.",
    body: [
      "Upwork and Fiverr are the two largest freelance marketplaces, but they work differently: on Upwork you send proposals and bill clients on hourly or fixed-price contracts, while on Fiverr you publish fixed-price gigs that buyers order directly. Both pay you as a self-employed freelancer with nothing withheld.",
      "Both take a cut before you're paid — Upwork deducts a freelancer service fee from each contract, and Fiverr deducts a flat seller commission (around 20%) from each order, with buyers paying separate service fees on top. Those platform fees are a deductible business expense, so track them.",
      "As third-party settlement platforms, both issue a 1099-K once your processed payments pass the IRS reporting threshold for the year rather than a 1099-NEC. Thresholds have changed recently, and you owe income tax plus the 15.3% self-employment tax on net earnings — report all income whether or not a form arrives.",
      "To compare honestly, take comparable projects on each, log the hours you actually worked, subtract platform fees and expenses, and divide by hours — the free Real Hourly Rate and Earnings Consolidator calculators do the math. This is educational information, not financial or tax advice.",
    ],
  },
  {
    path: "/gopuff-vs-doordash",
    externalLinks: GOPUFF_VS_DOORDASH_LINKS,
    title: "Gopuff vs DoorDash: Which Delivery Gig Is Better? | UnifyOne",
    description:
      "Gopuff vs DoorDash compared on how offers/blocks work, what you carry, scheduling, 1099-NEC forms, mileage, and payouts — plus how to compute your net pay.",
    body: [
      "Gopuff and DoorDash are both independent-contractor delivery gigs, but the model differs: Gopuff delivers its own convenience and grocery stock from local micro-fulfillment centers, while DoorDash delivers orders from third-party restaurants and stores.",
      "That changes the work: on Gopuff you start each trip at the facility with the order already packed and tend to work scheduled blocks; on DoorDash you drive to the merchant first, sometimes wait, and can log on largely on-demand per offer with tips shown upfront.",
      "Both issue a 1099-NEC if you earn $600 or more in a year — Gopuff via its payment partner, DoorDash via Stripe. You owe income tax plus the 15.3% self-employment tax on net earnings from either, and you must report all income whether or not a form arrives.",
      "To compare, run comparable shifts on each, track active hours and business miles, subtract mileage and expenses, and divide by hours — the free Real Hourly Rate and Earnings Consolidator calculators handle it. This is educational information, not financial or tax advice.",
    ],
  },
  {
    path: "/rover-vs-wag",
    externalLinks: ROVER_VS_WAG_LINKS,
    title: "Rover vs Wag: Which Is Better for Pet Care? | UnifyOne",
    description:
      "Rover vs Wag compared on how clients are found, service types, platform cut, scheduling control, and 1099-K forms — plus how to compute your own net pay.",
    body: [
      "Rover and Wag are the two largest pet-care marketplaces, connecting independent sitters and walkers with owners for dog walking, drop-in visits, boarding, and house sitting. Both pay you as a self-employed contractor with nothing withheld and take a cut of what owners pay.",
      "On Rover you build a profile, set your own services and rates, and owners book you directly, so you tend to build repeat clients and control your calendar. Wag leans more on-demand, surfacing nearby requests you accept as they come in — quicker bookings, but less control over timing and pricing.",
      "As third-party platforms, both issue a 1099-K once your processed payments pass the IRS reporting threshold for the year rather than a 1099-NEC. Thresholds have changed recently, and you owe income tax plus the 15.3% self-employment tax on net earnings — report all income whether or not a form arrives.",
      "To compare, take comparable bookings on each, track the time you spent and any travel miles, subtract the platform's fee and supply costs, and divide by hours — the free Real Hourly Rate and Earnings Consolidator calculators do the math. This is educational information, not financial or tax advice.",
    ],
  },
  {
    path: "/lyft-vs-uber-eats",
    externalLinks: LYFT_VS_UBER_EATS_LINKS,
    title: "Lyft vs Uber Eats: Which Should You Drive For? | UnifyOne",
    description:
      "Lyft (rideshare) vs Uber Eats (food delivery) compared on the work, requirements, 1099 forms, vehicle wear, and scheduling — plus how to compute your net pay.",
    body: [
      "Lyft and Uber Eats are both independent-contractor driving gigs, but they're different jobs: Lyft is rideshare — you carry passengers — while Uber Eats is food delivery, so you carry orders and never have a rider in the car. Both pay you with nothing withheld.",
      "Lyft's requirements are usually stricter (often 21+ with a qualifying multi-door vehicle and a vehicle inspection), and passengers mean more miles and vehicle wear; Uber Eats has a lower bar and, in some markets, bike or scooter delivery. Both show pay before you accept and pass through 100% of tips.",
      "On taxes, each typically issues a 1099-K for the fares the platform processes plus a 1099-NEC for incentives and referrals, reconciled on your Lyft Annual Summary or Uber Tax Summary. Thresholds change yearly, and you owe income tax plus the 15.3% self-employment tax on net earnings — report all income regardless.",
      "To compare, work comparable hours on each, track active time and business miles, subtract mileage and expenses, and divide by hours — the free Real Hourly Rate and Earnings Consolidator calculators do the math. This is educational information, not financial or tax advice.",
    ],
  },
  {
    path: "/virginia-gig-worker-taxes",
    externalLinks: VA_TAX_LINKS,
    title:
      "Virginia Gig Worker Taxes: State Income Tax + Federal SE Tax | UnifyOne",
    description:
      "Virginia gig worker taxes: a progressive state income tax (up to 5.75%) plus the 15.3% federal SE tax, with Form 760ES estimates. Not tax advice.",
    body: [
      "Virginia gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "Virginia has a progressive state income tax topping out at 5.75%; because its brackets are compressed, most gig workers' net profit is taxed near that rate, on top of federal tax. Pay state estimates to the Department of Taxation using Form 760ES.",
      "Deduct business mileage at the IRS standard mileage rate — usually the biggest deduction — plus the business-use share of your phone, supplies, tolls, and parking, lowering both your federal and Virginia taxable income.",
      "Federal and Virginia estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/massachusetts-gig-worker-taxes",
    externalLinks: MA_TAX_LINKS,
    title:
      "Massachusetts Gig Worker Taxes: Flat State Tax + Federal SE Tax | UnifyOne",
    description:
      "Massachusetts gig worker taxes: a flat 5% state income tax plus the 15.3% federal SE tax, with Form 1-ES estimates. Not tax advice.",
    body: [
      "Massachusetts gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "Massachusetts taxes most income at a flat 5% rate that applies to your net gig profit on top of federal tax; a separate 4% surtax applies only above roughly $1 million and rarely affects gig workers. Pay state estimates using Form 1-ES.",
      "Deduct business mileage at the IRS standard mileage rate — usually the biggest deduction — plus the business-use share of your phone, supplies, tolls, and parking, lowering the federal taxable income Massachusetts starts from.",
      "Federal and Massachusetts estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/maryland-gig-worker-taxes",
    externalLinks: MD_TAX_LINKS,
    title:
      "Maryland Gig Worker Taxes: State + County Tax & Federal SE Tax | UnifyOne",
    description:
      "Maryland gig worker taxes: state income tax plus a county/local income tax and the 15.3% federal SE tax, with Form PV estimates. Not tax advice.",
    body: [
      "Maryland gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "Maryland adds two layers: a progressive state income tax (about 2%–5.75%) and a county (or Baltimore City) local income tax, commonly around 2.25%–3.2%, both on your net gig profit. Pay state estimates to the Comptroller using Form PV; the county tax files with your state return.",
      "Deduct business mileage at the IRS standard mileage rate — usually the biggest deduction — plus the business-use share of your phone, supplies, tolls, and parking, lowering the federal taxable income Maryland builds on.",
      "Federal and Maryland estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/minnesota-gig-worker-taxes",
    externalLinks: MN_TAX_LINKS,
    title:
      "Minnesota Gig Worker Taxes: State Income Tax + Federal SE Tax | UnifyOne",
    description:
      "Minnesota gig worker taxes: a progressive state income tax (5.35%–9.85%) plus the 15.3% federal SE tax, with Form M14 estimates. Not tax advice.",
    body: [
      "Minnesota gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "Minnesota has a progressive state income tax from about 5.35% to 9.85% — among the higher state rates — applied to your net gig profit on top of federal tax. Pay state estimates to the Department of Revenue using Form M14.",
      "Deduct business mileage at the IRS standard mileage rate — usually the biggest deduction — plus the business-use share of your phone, supplies, tolls, and parking, lowering both your federal and Minnesota taxable income.",
      "Federal and Minnesota estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/missouri-gig-worker-taxes",
    externalLinks: MO_TAX_LINKS,
    title:
      "Missouri Gig Worker Taxes: State Income Tax + Federal SE Tax | UnifyOne",
    description:
      "Missouri gig worker taxes: a progressive state income tax (top rate ~4.7%, declining) plus the 15.3% federal SE tax, with Form MO-1040ES. Not tax advice.",
    body: [
      "Missouri gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "Missouri has a progressive state income tax with a top rate around 4.7% (being reduced); compressed brackets mean most gig profit is taxed near the top rate, on top of federal tax. Kansas City and St. Louis also levy a ~1% local earnings tax on income earned there. Pay state estimates using Form MO-1040ES.",
      "Deduct business mileage at the IRS standard mileage rate — usually the biggest deduction — plus the business-use share of your phone, supplies, tolls, and parking, lowering the federal taxable income Missouri starts from.",
      "Federal and Missouri estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/indiana-gig-worker-taxes",
    externalLinks: IN_TAX_LINKS,
    title:
      "Indiana Gig Worker Taxes: Flat State + County Tax & Federal SE Tax | UnifyOne",
    description:
      "Indiana gig worker taxes: a flat state income tax plus a county income tax and the 15.3% federal SE tax, with Form ES-40 estimates. Not tax advice.",
    body: [
      "Indiana gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "Indiana adds two flat layers: a low flat state income tax (around 3.05%, declining) and a county income tax that varies by where you live, both on your net gig profit. Pay state estimates to the Department of Revenue using Form ES-40; the county tax reconciles with your state return.",
      "Deduct business mileage at the IRS standard mileage rate — usually the biggest deduction — plus the business-use share of your phone, supplies, tolls, and parking, lowering the federal taxable income Indiana's state and county taxes build on.",
      "Federal and Indiana estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/tennessee-gig-worker-taxes",
    externalLinks: TN_TAX_LINKS,
    title:
      "Tennessee Gig Worker Taxes: No State Income Tax, Federal & SE Tax | UnifyOne",
    description:
      "Tennessee gig worker taxes: no state income tax, but you still owe federal income tax plus the 15.3% self-employment tax. Not tax advice.",
    body: [
      "Tennessee has no personal state income tax, so you won't file a state income-tax return on your gig earnings and there are no state estimated payments to make. The former Hall tax on investment income has been fully repealed.",
      "Your gig income is not tax-free, though. The federal rules are the same in every state: federal income tax on your net profit plus the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare), with nothing withheld from your payouts.",
      "Deduct business mileage at the IRS standard mileage rate — typically your largest deduction — plus the business-use share of your phone, supplies, tolls, and parking. Report all income whether or not a platform sends a 1099.",
      "If you expect to owe $1,000 or more in federal tax, the IRS generally expects quarterly estimated payments around April 15, June 15, September 15, and January 15. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/nevada-gig-worker-taxes",
    externalLinks: NV_TAX_LINKS,
    title:
      "Nevada Gig Worker Taxes: No State Income Tax, Federal & SE Tax | UnifyOne",
    description:
      "Nevada gig worker taxes: no state income tax, but you still owe federal income tax plus the 15.3% self-employment tax. Not tax advice.",
    body: [
      "Nevada has no personal state income tax, so you won't file a state income-tax return on your gig earnings and there are no state estimated payments to make.",
      "Your gig income is not tax-free, though. The federal rules are the same in every state: federal income tax on your net profit plus the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare), with nothing withheld from your payouts.",
      "Deduct business mileage at the IRS standard mileage rate — typically your largest deduction — plus the business-use share of your phone, supplies, tolls, and parking. Report all income whether or not a platform sends a 1099.",
      "If you expect to owe $1,000 or more in federal tax, the IRS generally expects quarterly estimated payments around April 15, June 15, September 15, and January 15. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/wisconsin-gig-worker-taxes",
    externalLinks: WI_TAX_LINKS,
    title:
      "Wisconsin Gig Worker Taxes: State Income Tax + Federal SE Tax | UnifyOne",
    description:
      "Wisconsin gig worker taxes: a progressive state income tax (up to ~7.65%) plus the 15.3% federal SE tax, with Form 1-ES estimates. Not tax advice.",
    body: [
      "Wisconsin gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "Wisconsin layers on a progressive state income tax topping out around 7.65%, applied to your net gig profit on top of federal tax. Pay state estimates to the Department of Revenue using Form 1-ES, generally on the same quarterly schedule as your federal estimates.",
      "Deduct business mileage at the IRS standard mileage rate — usually the biggest deduction — plus the business-use share of your phone, supplies, tolls, and parking, lowering the federal taxable income Wisconsin starts from.",
      "Federal and Wisconsin estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/oregon-gig-worker-taxes",
    externalLinks: OR_TAX_LINKS,
    title:
      "Oregon Gig Worker Taxes: State Income Tax + Federal SE Tax | UnifyOne",
    description:
      "Oregon gig worker taxes: a progressive income tax (up to ~9.9%) plus the 15.3% federal SE tax, and Portland-area local taxes. Not tax advice.",
    body: [
      "Oregon gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "Oregon has one of the highest state income taxes, progressive up to around 9.9%, and no general sales tax. If you work in the Portland metro, you may also owe local taxes such as the Metro Supportive Housing Services and Multnomah County Preschool for All taxes on higher earnings. Pay state estimates through the Department of Revenue.",
      "Deduct business mileage at the IRS standard mileage rate — usually the biggest deduction — plus the business-use share of your phone, supplies, tolls, and parking, lowering the federal taxable income Oregon starts from.",
      "Federal and Oregon estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/south-carolina-gig-worker-taxes",
    externalLinks: SC_TAX_LINKS,
    title:
      "South Carolina Gig Worker Taxes: State Income Tax + Federal SE Tax | UnifyOne",
    description:
      "South Carolina gig worker taxes: a progressive state income tax (top ~6.2%) plus the 15.3% federal SE tax, with SC1040ES estimates. Not tax advice.",
    body: [
      "South Carolina gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "South Carolina has a progressive state income tax with a top rate around 6.2% (being reduced over time), applied to your net gig profit on top of federal tax. Pay state estimates to the Department of Revenue using Form SC1040ES, and confirm the current rate.",
      "Deduct business mileage at the IRS standard mileage rate — usually the biggest deduction — plus the business-use share of your phone, supplies, tolls, and parking, lowering the federal taxable income South Carolina starts from.",
      "Federal and South Carolina estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/alabama-gig-worker-taxes",
    externalLinks: AL_TAX_LINKS,
    title:
      "Alabama Gig Worker Taxes: State Income Tax + Federal SE Tax | UnifyOne",
    description:
      "Alabama gig worker taxes: a state income tax (up to 5%) plus possible city occupational taxes and the 15.3% federal SE tax. Not tax advice.",
    body: [
      "Alabama gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "Alabama has a progressive state income tax topping out at 5%, and some cities (such as Birmingham) levy a local occupational or business tax on earnings made there. Pay state estimates to the Department of Revenue using Form 40ES.",
      "Deduct business mileage at the IRS standard mileage rate — usually the biggest deduction — plus the business-use share of your phone, supplies, tolls, and parking, lowering the federal taxable income Alabama starts from.",
      "Federal and Alabama estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/louisiana-gig-worker-taxes",
    externalLinks: LA_TAX_LINKS,
    title:
      "Louisiana Gig Worker Taxes: Flat State Income Tax + Federal SE Tax | UnifyOne",
    description:
      "Louisiana gig worker taxes: a flat ~3% state income tax plus the 15.3% federal SE tax, with Form IT-540ES estimates. Not tax advice.",
    body: [
      "Louisiana gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "Louisiana recently moved to a flat individual income tax of about 3% (replacing its graduated brackets), applied to your net gig profit on top of federal tax. Pay state estimates to the Department of Revenue using Form IT-540ES, and confirm the current rate.",
      "Deduct business mileage at the IRS standard mileage rate — usually the biggest deduction — plus the business-use share of your phone, supplies, tolls, and parking, lowering the federal taxable income Louisiana starts from.",
      "Federal and Louisiana estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/kentucky-gig-worker-taxes",
    externalLinks: KY_TAX_LINKS,
    title:
      "Kentucky Gig Worker Taxes: Flat State + Local Tax & Federal SE Tax | UnifyOne",
    description:
      "Kentucky gig worker taxes: a flat state income tax (~4%) plus local occupational taxes and the 15.3% federal SE tax. Not tax advice.",
    body: [
      "Kentucky gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "Kentucky has a flat state income tax (around 3.5–4% and declining), plus many counties and cities levy a local occupational license tax on net self-employment profit earned there. Pay state estimates to the Department of Revenue using Form 740-ES, and confirm the current rate.",
      "Deduct business mileage at the IRS standard mileage rate — usually the biggest deduction — plus the business-use share of your phone, supplies, tolls, and parking, lowering the federal taxable income Kentucky starts from.",
      "Federal and Kentucky estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/oklahoma-gig-worker-taxes",
    externalLinks: OK_TAX_LINKS,
    title:
      "Oklahoma Gig Worker Taxes: State Income Tax + Federal SE Tax | UnifyOne",
    description:
      "Oklahoma gig worker taxes: a progressive state income tax (top ~4.75%) plus the 15.3% federal SE tax, with Form OW-8-ES. Not tax advice.",
    body: [
      "Oklahoma gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "Oklahoma has a progressive state income tax with a top rate around 4.75%, applied to your net gig profit on top of federal tax. Pay state estimates to the Oklahoma Tax Commission using Form OW-8-ES, generally on the same quarterly schedule as your federal estimates.",
      "Deduct business mileage at the IRS standard mileage rate — usually the biggest deduction — plus the business-use share of your phone, supplies, tolls, and parking, lowering the federal taxable income Oklahoma starts from.",
      "Federal and Oklahoma estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/connecticut-gig-worker-taxes",
    externalLinks: CT_TAX_LINKS,
    title:
      "Connecticut Gig Worker Taxes: State Income Tax + Federal SE Tax | UnifyOne",
    description:
      "Connecticut gig worker taxes: a progressive state income tax (up to ~6.99%) plus the 15.3% federal SE tax, with Form CT-1040ES. Not tax advice.",
    body: [
      "Connecticut gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "Connecticut has a progressive state income tax topping out at 6.99%, applied to your net gig profit on top of federal tax. Pay state estimates to the Department of Revenue Services using Form CT-1040ES, generally on the same quarterly schedule as your federal estimates.",
      "Deduct business mileage at the IRS standard mileage rate — usually the biggest deduction — plus the business-use share of your phone, supplies, tolls, and parking, lowering the federal taxable income Connecticut starts from.",
      "Federal and Connecticut estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/utah-gig-worker-taxes",
    externalLinks: UT_TAX_LINKS,
    title:
      "Utah Gig Worker Taxes: Flat State Income Tax + Federal SE Tax | UnifyOne",
    description:
      "Utah gig worker taxes: a flat state income tax (~4.55%) plus the 15.3% federal SE tax, with TC-546 prepayments. Not tax advice.",
    body: [
      "Utah gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "Utah has a flat state income tax (around 4.5%), applied to your net gig profit on top of federal tax. Utah uses a prepayment system (Form TC-546) rather than traditional quarterly vouchers — pay in enough during the year to avoid an underpayment penalty, and confirm the current rate.",
      "Deduct business mileage at the IRS standard mileage rate — usually the biggest deduction — plus the business-use share of your phone, supplies, tolls, and parking, lowering the federal taxable income Utah starts from.",
      "Federal estimates are generally due around April 15, June 15, September 15, and January 15; make your Utah prepayments on a similar schedule. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/iowa-gig-worker-taxes",
    externalLinks: IA_TAX_LINKS,
    title:
      "Iowa Gig Worker Taxes: Flat State Income Tax + Federal SE Tax | UnifyOne",
    description:
      "Iowa gig worker taxes: a flat ~3.8% state income tax plus the 15.3% federal SE tax, with IA 1040ES estimates. Not tax advice.",
    body: [
      "Iowa gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "Iowa recently moved to a flat individual income tax of about 3.8% (replacing its graduated brackets), applied to your net gig profit on top of federal tax. Pay state estimates to the Department of Revenue using Form IA 1040ES, and confirm the current rate.",
      "Deduct business mileage at the IRS standard mileage rate — usually the biggest deduction — plus the business-use share of your phone, supplies, tolls, and parking, lowering the federal taxable income Iowa starts from.",
      "Federal and Iowa estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/kansas-gig-worker-taxes",
    externalLinks: KS_TAX_LINKS,
    title:
      "Kansas Gig Worker Taxes: State Income Tax + Federal SE Tax | UnifyOne",
    description:
      "Kansas gig worker taxes: a two-bracket state income tax (top ~5.58%) plus the 15.3% federal SE tax, with Form K-40ES. Not tax advice.",
    body: [
      "Kansas gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "Kansas has a two-bracket state income tax with a top rate around 5.58%, applied to your net gig profit on top of federal tax. Pay state estimates to the Department of Revenue using Form K-40ES, generally on the same quarterly schedule as your federal estimates.",
      "Deduct business mileage at the IRS standard mileage rate — usually the biggest deduction — plus the business-use share of your phone, supplies, tolls, and parking, lowering the federal taxable income Kansas starts from.",
      "Federal and Kansas estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/new-mexico-gig-worker-taxes",
    externalLinks: NM_TAX_LINKS,
    title:
      "New Mexico Gig Worker Taxes: Income Tax, Gross Receipts Tax & SE Tax | UnifyOne",
    description:
      "New Mexico gig worker taxes: state income tax (up to ~5.9%), the 15.3% federal SE tax, and a gross receipts tax on many services. Not tax advice.",
    body: [
      "New Mexico gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "New Mexico has a progressive state income tax topping out around 5.9%, applied to your net gig profit on top of federal tax. It also has a gross receipts tax (GRT) that can apply to many services performed in the state — some independent contractors must register for and pay GRT on their receipts. Pay income-tax estimates using Form PIT-ES, and check your GRT obligations with the Taxation and Revenue Department.",
      "Deduct business mileage at the IRS standard mileage rate — usually the biggest deduction — plus the business-use share of your phone, supplies, tolls, and parking, lowering the federal taxable income New Mexico starts from.",
      "Federal and New Mexico income-tax estimates are generally due around April 15, June 15, September 15, and January 15; GRT, if it applies, is filed separately. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/nebraska-gig-worker-taxes",
    externalLinks: NE_TAX_LINKS,
    title:
      "Nebraska Gig Worker Taxes: State Income Tax + Federal SE Tax | UnifyOne",
    description:
      "Nebraska gig worker taxes: a progressive state income tax (top ~4.55%, declining) plus the 15.3% federal SE tax, with Form 1040N-ES. Not tax advice.",
    body: [
      "Nebraska gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "Nebraska has a progressive state income tax with a top rate around 4.55% and scheduled to fall to 3.99%, applied to your net gig profit on top of federal tax. Pay state estimates to the Department of Revenue using Form 1040N-ES, and confirm the current rate.",
      "Deduct business mileage at the IRS standard mileage rate — usually the biggest deduction — plus the business-use share of your phone, supplies, tolls, and parking, lowering the federal taxable income Nebraska starts from.",
      "Federal and Nebraska estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/mississippi-gig-worker-taxes",
    externalLinks: MS_TAX_LINKS,
    title:
      "Mississippi Gig Worker Taxes: Flat State Income Tax + Federal SE Tax | UnifyOne",
    description:
      "Mississippi gig worker taxes: a flat ~4% state income tax (declining) plus the 15.3% federal SE tax, with Form 80-106. Not tax advice.",
    body: [
      "Mississippi gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "Mississippi has a flat state income tax around 4% on income above a threshold, applied to your net gig profit on top of federal tax. Under recent legislation the rate is scheduled to decline over time, so confirm the current rate. Pay state estimates to the Department of Revenue using Form 80-106.",
      "Deduct business mileage at the IRS standard mileage rate — usually the biggest deduction — plus the business-use share of your phone, supplies, tolls, and parking, lowering the federal taxable income Mississippi starts from.",
      "Federal and Mississippi estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/arkansas-gig-worker-taxes",
    externalLinks: AR_TAX_LINKS,
    title:
      "Arkansas Gig Worker Taxes: State Income Tax + Federal SE Tax | UnifyOne",
    description:
      "Arkansas gig worker taxes: a state income tax (top ~3.9%, declining) plus the 15.3% federal SE tax, with Form AR1000ES. Not tax advice.",
    body: [
      "Arkansas gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "Arkansas has a state income tax with a top rate around 3.9% (reduced in recent years), applied to your net gig profit on top of federal tax. Pay state estimates to the Department of Finance and Administration using Form AR1000ES, and confirm the current rate.",
      "Deduct business mileage at the IRS standard mileage rate — usually the biggest deduction — plus the business-use share of your phone, supplies, tolls, and parking, lowering the federal taxable income Arkansas starts from.",
      "Federal and Arkansas estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/west-virginia-gig-worker-taxes",
    externalLinks: WV_TAX_LINKS,
    title:
      "West Virginia Gig Worker Taxes: State Income Tax + Federal SE Tax | UnifyOne",
    description:
      "West Virginia gig worker taxes: a progressive state income tax (top ~5%, declining) plus the 15.3% federal SE tax, with Form IT-140ES. Not tax advice.",
    body: [
      "West Virginia gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "West Virginia has a progressive state income tax with a top rate around 5% (cut in recent years and subject to further reductions), applied to your net gig profit on top of federal tax. Pay state estimates to the Tax Division using Form IT-140ES, and confirm the current rate.",
      "Deduct business mileage at the IRS standard mileage rate — usually the biggest deduction — plus the business-use share of your phone, supplies, tolls, and parking, lowering the federal taxable income West Virginia starts from.",
      "Federal and West Virginia estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/idaho-gig-worker-taxes",
    externalLinks: ID_TAX_LINKS,
    title:
      "Idaho Gig Worker Taxes: Flat State Income Tax + Federal SE Tax | UnifyOne",
    description:
      "Idaho gig worker taxes: a flat state income tax (~5.3%) plus the 15.3% federal SE tax, with Form 51 estimates. Not tax advice.",
    body: [
      "Idaho gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "Idaho has a flat state income tax around 5.3% (reduced in recent years), applied to your net gig profit on top of federal tax. Pay state estimates to the State Tax Commission using Form 51, and confirm the current rate.",
      "Deduct business mileage at the IRS standard mileage rate — usually the biggest deduction — plus the business-use share of your phone, supplies, tolls, and parking, lowering the federal taxable income Idaho starts from.",
      "Federal and Idaho estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/hawaii-gig-worker-taxes",
    externalLinks: HI_TAX_LINKS,
    title:
      "Hawaii Gig Worker Taxes: Income Tax, General Excise Tax & SE Tax | UnifyOne",
    description:
      "Hawaii gig worker taxes: a progressive income tax (up to 11%), the 15.3% federal SE tax, and a general excise tax on business. Not tax advice.",
    body: [
      "Hawaii gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "Hawaii has a progressive state income tax topping out at 11% — one of the highest in the country — plus a general excise tax (GET) on nearly all business activity, typically 4% (4.5% on Oahu) charged on gross income rather than profit. Most independent contractors must register for a GET license. Pay income-tax estimates using Form N-200V and check your GET obligations with the Department of Taxation.",
      "For income tax, deduct business mileage at the IRS standard mileage rate plus the business-use share of your phone, supplies, tolls, and parking. Note GET is generally based on gross receipts, so those deductions don't reduce it.",
      "Federal and Hawaii income-tax estimates are generally due around April 15, June 15, September 15, and January 15; GET is filed periodically. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/maine-gig-worker-taxes",
    externalLinks: ME_TAX_LINKS,
    title:
      "Maine Gig Worker Taxes: State Income Tax + Federal SE Tax | UnifyOne",
    description:
      "Maine gig worker taxes: a progressive state income tax (up to ~7.15%) plus the 15.3% federal SE tax, with Form 1040ES-ME. Not tax advice.",
    body: [
      "Maine gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "Maine has a progressive state income tax topping out around 7.15%, applied to your net gig profit on top of federal tax. Pay state estimates to Maine Revenue Services using Form 1040ES-ME, generally on the same quarterly schedule as your federal estimates.",
      "Deduct business mileage at the IRS standard mileage rate — usually the biggest deduction — plus the business-use share of your phone, supplies, tolls, and parking, lowering the federal taxable income Maine starts from.",
      "Federal and Maine estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/rhode-island-gig-worker-taxes",
    externalLinks: RI_TAX_LINKS,
    title:
      "Rhode Island Gig Worker Taxes: State Income Tax + Federal SE Tax | UnifyOne",
    description:
      "Rhode Island gig worker taxes: a progressive state income tax (up to ~5.99%) plus the 15.3% federal SE tax, with Form RI-1040ES. Not tax advice.",
    body: [
      "Rhode Island gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "Rhode Island has a progressive state income tax topping out around 5.99%, applied to your net gig profit on top of federal tax. Pay state estimates to the Division of Taxation using Form RI-1040ES, generally on the same quarterly schedule as your federal estimates.",
      "Deduct business mileage at the IRS standard mileage rate — usually the biggest deduction — plus the business-use share of your phone, supplies, tolls, and parking, lowering the federal taxable income Rhode Island starts from.",
      "Federal and Rhode Island estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/alaska-gig-worker-taxes",
    externalLinks: AK_TAX_LINKS,
    title:
      "Alaska Gig Worker Taxes: No State Income Tax, Federal & SE Tax | UnifyOne",
    description:
      "Alaska gig worker taxes: no state income tax, but you still owe federal income tax plus the 15.3% self-employment tax. Not tax advice.",
    body: [
      "Alaska has no personal state income tax — and no statewide sales tax — so you won't file a state income-tax return on your gig earnings and there are no state estimated payments to make.",
      "Your gig income is not tax-free, though. The federal rules are the same in every state: federal income tax on your net profit plus the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare), with nothing withheld from your payouts.",
      "Deduct business mileage at the IRS standard mileage rate — typically your largest deduction — plus the business-use share of your phone, supplies, tolls, and parking. Report all income whether or not a platform sends a 1099.",
      "If you expect to owe $1,000 or more in federal tax, the IRS generally expects quarterly estimated payments around April 15, June 15, September 15, and January 15. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/new-hampshire-gig-worker-taxes",
    externalLinks: NH_TAX_LINKS,
    title:
      "New Hampshire Gig Worker Taxes: No Income Tax on Earnings + SE Tax | UnifyOne",
    description:
      "New Hampshire gig worker taxes: no income tax on earned income; federal income tax + the 15.3% SE tax still apply. Not tax advice.",
    body: [
      "New Hampshire doesn't tax earned income, and its separate tax on interest and dividends was fully repealed effective 2025 — so your gig earnings face no New Hampshire income tax and there are no state estimated payments to make.",
      "Your gig income is not tax-free, though. The federal rules are the same in every state: federal income tax on your net profit plus the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare), with nothing withheld from your payouts.",
      "Deduct business mileage at the IRS standard mileage rate — typically your largest deduction — plus the business-use share of your phone, supplies, tolls, and parking. Report all income whether or not a platform sends a 1099.",
      "If you expect to owe $1,000 or more in federal tax, the IRS generally expects quarterly estimated payments around April 15, June 15, September 15, and January 15. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/south-dakota-gig-worker-taxes",
    externalLinks: SD_TAX_LINKS,
    title:
      "South Dakota Gig Worker Taxes: No State Income Tax, Federal & SE Tax | UnifyOne",
    description:
      "South Dakota gig worker taxes: no state income tax, but you still owe federal income tax plus the 15.3% self-employment tax. Not tax advice.",
    body: [
      "South Dakota has no personal state income tax, so you won't file a state income-tax return on your gig earnings and there are no state estimated payments to make.",
      "Your gig income is not tax-free, though. The federal rules are the same in every state: federal income tax on your net profit plus the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare), with nothing withheld from your payouts.",
      "Deduct business mileage at the IRS standard mileage rate — typically your largest deduction — plus the business-use share of your phone, supplies, tolls, and parking. Report all income whether or not a platform sends a 1099.",
      "If you expect to owe $1,000 or more in federal tax, the IRS generally expects quarterly estimated payments around April 15, June 15, September 15, and January 15. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/wyoming-gig-worker-taxes",
    externalLinks: WY_TAX_LINKS,
    title:
      "Wyoming Gig Worker Taxes: No State Income Tax, Federal & SE Tax | UnifyOne",
    description:
      "Wyoming gig worker taxes: no state income tax, but you still owe federal income tax plus the 15.3% self-employment tax. Not tax advice.",
    body: [
      "Wyoming has no personal state income tax, so you won't file a state income-tax return on your gig earnings and there are no state estimated payments to make.",
      "Your gig income is not tax-free, though. The federal rules are the same in every state: federal income tax on your net profit plus the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare), with nothing withheld from your payouts.",
      "Deduct business mileage at the IRS standard mileage rate — typically your largest deduction — plus the business-use share of your phone, supplies, tolls, and parking. Report all income whether or not a platform sends a 1099.",
      "If you expect to owe $1,000 or more in federal tax, the IRS generally expects quarterly estimated payments around April 15, June 15, September 15, and January 15. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/delaware-gig-worker-taxes",
    externalLinks: DE_TAX_LINKS,
    title:
      "Delaware Gig Worker Taxes: State Income Tax + Federal SE Tax | UnifyOne",
    description:
      "Delaware gig worker taxes: a progressive state income tax (up to ~6.6%) plus the 15.3% federal SE tax, with Form 200-ES. Not tax advice.",
    body: [
      "Delaware gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "Delaware has a progressive state income tax topping out around 6.6%, applied to your net gig profit on top of federal tax (the city of Wilmington also levies a local earned-income tax on work performed there). Pay state estimates to the Division of Revenue using Form 200-ES.",
      "Deduct business mileage at the IRS standard mileage rate — usually the biggest deduction — plus the business-use share of your phone, supplies, tolls, and parking, lowering the federal taxable income Delaware starts from.",
      "Federal and Delaware estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/montana-gig-worker-taxes",
    externalLinks: MT_TAX_LINKS,
    title:
      "Montana Gig Worker Taxes: State Income Tax + Federal SE Tax | UnifyOne",
    description:
      "Montana gig worker taxes: a state income tax (top ~5.65%, declining) plus the 15.3% federal SE tax, with estimated payments. Not tax advice.",
    body: [
      "Montana gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "Montana has a two-bracket state income tax with a top rate around 5.65% (reduced from 5.9% and scheduled to fall further), applied to your net gig profit on top of federal tax. Montana has no general sales tax. Pay state estimates to the Department of Revenue, and confirm the current rate.",
      "Deduct business mileage at the IRS standard mileage rate — usually the biggest deduction — plus the business-use share of your phone, supplies, tolls, and parking, lowering the federal taxable income Montana starts from.",
      "Federal and Montana estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/north-dakota-gig-worker-taxes",
    externalLinks: ND_TAX_LINKS,
    title:
      "North Dakota Gig Worker Taxes: Low State Income Tax + Federal SE Tax | UnifyOne",
    description:
      "North Dakota gig worker taxes: a low state income tax (top ~2.5%) plus the 15.3% federal SE tax, with Form ND-1ES. Not tax advice.",
    body: [
      "North Dakota gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "After a 2023 reform, North Dakota has just three brackets — 0%, about 1.95%, and a top of around 2.5%, among the lowest in the country — applied to your net gig profit on top of federal tax. Pay state estimates to the Office of State Tax Commissioner using Form ND-1ES.",
      "Deduct business mileage at the IRS standard mileage rate — usually the biggest deduction — plus the business-use share of your phone, supplies, tolls, and parking, lowering the federal taxable income North Dakota starts from.",
      "Federal and North Dakota estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/vermont-gig-worker-taxes",
    externalLinks: VT_TAX_LINKS,
    title:
      "Vermont Gig Worker Taxes: State Income Tax + Federal SE Tax | UnifyOne",
    description:
      "Vermont gig worker taxes: a progressive state income tax (up to ~8.75%) plus the 15.3% federal SE tax, with Form IN-114. Not tax advice.",
    body: [
      "Vermont gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "Vermont has a progressive state income tax topping out around 8.75%, applied to your net gig profit on top of federal tax. Pay state estimates to the Department of Taxes using Form IN-114, generally on the same quarterly schedule as your federal estimates.",
      "Deduct business mileage at the IRS standard mileage rate — usually the biggest deduction — plus the business-use share of your phone, supplies, tolls, and parking, lowering the federal taxable income Vermont starts from.",
      "Federal and Vermont estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/washington-dc-gig-worker-taxes",
    externalLinks: DC_TAX_LINKS,
    title:
      "Washington D.C. Gig Worker Taxes: Local Income Tax + Federal SE Tax | UnifyOne",
    description:
      "Washington D.C. gig worker taxes: a progressive local income tax (up to ~10.75%) plus the 15.3% federal SE tax, with Form D-40ES. Not tax advice.",
    body: [
      "In Washington, D.C., gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "The District of Columbia has a progressive local income tax topping out around 10.75%, applied to D.C. residents' net gig profit on top of federal tax. Pay estimates to the D.C. Office of Tax and Revenue using Form D-40ES, generally on the same quarterly schedule as your federal estimates.",
      "Deduct business mileage at the IRS standard mileage rate — usually the biggest deduction — plus the business-use share of your phone, supplies, tolls, and parking, lowering the federal taxable income D.C. starts from.",
      "Federal and D.C. estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/amazon-flex-taxes",
    externalLinks: AMAZON_FLEX_TAX_LINKS,
    title:
      "Amazon Flex Taxes: A Driver's Guide to 1099 Filing & Deductions | UnifyOne",
    description:
      "How Amazon Flex taxes work: the 1099-NEC, self-employment tax, what to set aside, mileage deductions, and quarterly payments. Not tax advice.",
    body: [
      "Amazon Flex pays you as an independent contractor, so no taxes are withheld from your delivery blocks. You owe federal and state income tax plus the 15.3% self-employment tax (12.4% Social Security + 2.9% Medicare) on your net earnings.",
      "If you earned $600 or more, Amazon issues a 1099-NEC through its tax-document portal. Below that you may not get a form — but you still have to report all income to the IRS.",
      "Your largest deduction is business mileage at the IRS standard mileage rate for every mile driven during a block, including between stops. Phone use, tolls, parking, and supplies are deductible too. A common rule of thumb is to set aside 25–30% of net earnings for taxes.",
      "Independent contractors generally pay estimated taxes four times a year — around April 15, June 15, September 15, and January 15 — to avoid an IRS underpayment penalty. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/grubhub-taxes",
    externalLinks: GRUBHUB_TAX_LINKS,
    title:
      "Grubhub Taxes: A Driver's Guide to 1099 Filing & Deductions | UnifyOne",
    description:
      "How Grubhub taxes work for drivers: the 1099-NEC, self-employment tax, what to set aside, mileage deductions, and quarterly payments. Not tax advice.",
    body: [
      "Grubhub pays you as an independent contractor, so nothing is withheld from your delivery pay. You owe federal and state income tax plus the 15.3% self-employment tax (12.4% Social Security + 2.9% Medicare) on your net earnings.",
      "If you earned $600 or more, Grubhub issues a 1099-NEC through its payment processor. Below that you may not get a form — but you still have to report all income to the IRS.",
      "Your largest deduction is business mileage at the IRS standard mileage rate for every mile driven while delivering. Phone use, insulated bags, tolls, and parking are deductible too. A common rule of thumb is to set aside 25–30% of net earnings for taxes.",
      "Independent contractors generally pay estimated taxes four times a year — around April 15, June 15, September 15, and January 15 — to avoid an IRS underpayment penalty. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/lyft-driver-taxes",
    externalLinks: LYFT_TAX_LINKS,
    title:
      "Lyft Driver Taxes: 1099-K vs 1099-NEC, Deductions & Estimates | UnifyOne",
    description:
      "Lyft driver taxes explained: the 1099-K vs 1099-NEC, your Annual Summary, self-employment tax, mileage deductions, and quarterly estimates. Not tax advice.",
    body: [
      "Lyft treats drivers as independent contractors and withholds no taxes, so you owe income tax plus the 15.3% self-employment tax (12.4% Social Security + 2.9% Medicare) on your net earnings.",
      "Lyft may send two forms: a 1099-K for the gross fares riders paid, and a 1099-NEC for bonuses, referrals, and incentives. Your Lyft Annual Summary reconciles both — and you must report all earnings regardless of which forms arrive.",
      "Business mileage at the IRS standard mileage rate is usually the biggest deduction, and because Lyft reports only online miles, your real deductible mileage is often higher. Service fees, phone use, tolls, and rider amenities are deductible too.",
      "If you expect to owe $1,000 or more for the year, the IRS generally expects quarterly estimated payments — around April 15, June 15, September 15, and January 15. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/spark-driver-taxes",
    externalLinks: SPARK_TAX_LINKS,
    title: "Spark Driver Taxes: A Guide to 1099 Filing & Deductions | UnifyOne",
    description:
      "How Walmart Spark driver taxes work: the 1099-NEC, self-employment tax, what to set aside, mileage deductions, and quarterly payments. Not tax advice.",
    body: [
      "The Walmart Spark Driver program pays you as an independent contractor, so no taxes are withheld from your deliveries. You owe federal and state income tax plus the 15.3% self-employment tax (12.4% Social Security + 2.9% Medicare) on your net earnings.",
      "If you earned $600 or more, the Spark Driver program issues a 1099-NEC through its payment partner. Below that you may not get a form — but you still have to report all income to the IRS.",
      "Your largest deduction is business mileage at the IRS standard mileage rate for every mile driven while delivering. Phone use, insulated bags, tolls, and parking are deductible too. A common rule of thumb is to set aside 25–30% of net earnings for taxes.",
      "Independent contractors generally pay estimated taxes four times a year — around April 15, June 15, September 15, and January 15 — to avoid an IRS underpayment penalty. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/shipt-shopper-taxes",
    externalLinks: SHIPT_TAX_LINKS,
    title: "Shipt Taxes: A Shopper's Guide to 1099s & Deductions | UnifyOne",
    description:
      "Shipt taxes for shoppers: the 1099-NEC, self-employment tax, mileage and supply deductions, and quarterly payments. Not tax advice.",
    body: [
      "Shipt shoppers are independent contractors, so Shipt withholds no taxes from your pay. You owe federal and state income tax plus the 15.3% self-employment tax (12.4% Social Security + 2.9% Medicare) on your net earnings.",
      "Shoppers who earned $600 or more receive a 1099-NEC, usually delivered through Shipt's payment processor by late January. You must report all income whether or not a form arrives.",
      "Because you both shop and drive, track every working mile and deduct it at the IRS standard mileage rate — typically the largest deduction — plus phone use, insulated bags, tolls, and parking. A common rule of thumb is to set aside 25–30% of net earnings for taxes.",
      "Independent contractors generally pay estimated taxes four times a year — around April 15, June 15, September 15, and January 15 — to avoid an IRS underpayment penalty. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/roadie-taxes",
    externalLinks: ROADIE_TAX_LINKS,
    title:
      "Roadie Taxes: A Driver's Guide to 1099 Filing & Deductions | UnifyOne",
    description:
      "How Roadie taxes work: the 1099, self-employment tax, what to set aside, mileage deductions, and quarterly payments. Not tax advice.",
    body: [
      "Roadie (a UPS company) pays drivers as independent contractors, so no taxes are withheld from your deliveries. You owe federal and state income tax plus the 15.3% self-employment tax (12.4% Social Security + 2.9% Medicare) on your net earnings.",
      "If you meet the reporting threshold, Roadie issues a 1099 (typically a 1099-NEC) through its payment processor. Below that you may not get a form — but you still have to report all income to the IRS.",
      "Your largest deduction is business mileage at the IRS standard mileage rate for every mile driven to pick up and drop off gigs. Phone use, hauling supplies, tolls, and parking are deductible too. A common rule of thumb is to set aside 25–30% of net earnings for taxes.",
      "Independent contractors generally pay estimated taxes four times a year — around April 15, June 15, September 15, and January 15 — to avoid an IRS underpayment penalty. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/gopuff-taxes",
    externalLinks: GOPUFF_TAX_LINKS,
    title:
      "Gopuff Taxes: A Driver's Guide to 1099 Filing & Deductions | UnifyOne",
    description:
      "How Gopuff driver taxes work: the 1099-NEC, self-employment tax, what to set aside, mileage deductions, and quarterly payments. Not tax advice.",
    body: [
      "Gopuff pays its delivery drivers as independent contractors, so no taxes are withheld. You owe federal and state income tax plus the 15.3% self-employment tax (12.4% Social Security + 2.9% Medicare) on your net earnings.",
      "If you earned $600 or more, Gopuff issues a 1099-NEC through its payment partner. Below that you may not get a form — but you still have to report all income to the IRS.",
      "Your largest deduction is business mileage at the IRS standard mileage rate for every mile driven from the fulfillment center to customers. Phone use, insulated bags, tolls, and parking are deductible too. A common rule of thumb is to set aside 25–30% of net earnings for taxes.",
      "Independent contractors generally pay estimated taxes four times a year — around April 15, June 15, September 15, and January 15 — to avoid an IRS underpayment penalty. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/taskrabbit-taxes",
    externalLinks: TASKRABBIT_TAX_LINKS,
    title:
      "TaskRabbit Taxes: A Tasker's Guide to 1099-K & Deductions | UnifyOne",
    description:
      "How TaskRabbit taxes work for Taskers: the 1099-K, self-employment tax, tool and mileage deductions, and quarterly payments. Not tax advice.",
    body: [
      "TaskRabbit treats Taskers as independent contractors, so no taxes are withheld. You owe federal and state income tax plus the 15.3% self-employment tax (12.4% Social Security + 2.9% Medicare) on your net earnings.",
      "TaskRabbit processes client payments as a third-party platform, so it generally reports earnings on a Form 1099-K (not a 1099-NEC) when you meet the IRS threshold for the year. Thresholds have changed recently, so you may not always get one — report all income regardless.",
      "Big deductions for Taskers are tools and equipment, job supplies and materials, and TaskRabbit's service fees, plus the business-use share of your phone. If you drive to jobs or haul materials, business mileage at the IRS standard mileage rate is deductible too. A common rule of thumb is to set aside 25–30% of net earnings for taxes.",
      "Independent contractors generally pay estimated taxes four times a year — around April 15, June 15, September 15, and January 15 — to avoid an IRS underpayment penalty. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/rover-taxes",
    externalLinks: ROVER_TAX_LINKS,
    title:
      "Rover Taxes: A Pet Sitter's Guide to 1099-K & Deductions | UnifyOne",
    description:
      "How Rover taxes work for sitters and walkers: the 1099-K, self-employment tax, pet-care and mileage deductions, and quarterly payments. Not tax advice.",
    body: [
      "Rover treats sitters and walkers as independent contractors, so no taxes are withheld. You owe federal and state income tax plus the 15.3% self-employment tax (12.4% Social Security + 2.9% Medicare) on your net earnings.",
      "Rover processes payments as a third-party platform, so it generally reports earnings on a Form 1099-K when you meet the IRS threshold for the year. Thresholds have changed recently, so you may not always get one — report all income regardless.",
      "Deduct pet-care supplies, Rover's service fees, and the business-use share of your phone. Mileage to walks and client homes is deductible at the IRS standard mileage rate, and if you board pets in your home, part of your home expenses may qualify (the rules are strict — get advice). A common rule of thumb is to set aside 25–30% of net earnings for taxes.",
      "Independent contractors generally pay estimated taxes four times a year — around April 15, June 15, September 15, and January 15 — to avoid an IRS underpayment penalty. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/upwork-taxes",
    externalLinks: UPWORK_TAX_LINKS,
    title:
      "Upwork Taxes: A Freelancer's Guide to 1099-K & Deductions | UnifyOne",
    description:
      "How Upwork taxes work for freelancers: the 1099-K, self-employment tax, home-office and software deductions, and quarterly payments. Not tax advice.",
    body: [
      "Upwork treats freelancers as independent contractors, so no taxes are withheld. You owe federal and state income tax plus the 15.3% self-employment tax (12.4% Social Security + 2.9% Medicare) on your net earnings.",
      "Upwork processes client payments as a third-party platform, so it issues US freelancers a Form 1099-K when they meet the IRS threshold for the year. Thresholds have changed recently, so you may not always get one — report all income regardless.",
      "Because the work is desk-based, the biggest deductions are usually the home office, your computer and software, internet and phone, and Upwork's service fees — not mileage. A common rule of thumb is to set aside 25–30% of net earnings for taxes.",
      "Independent contractors generally pay estimated taxes four times a year — around April 15, June 15, September 15, and January 15 — to avoid an IRS underpayment penalty. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/fiverr-taxes",
    externalLinks: FIVERR_TAX_LINKS,
    title: "Fiverr Taxes: A Seller's Guide to 1099-K & Deductions | UnifyOne",
    description:
      "How Fiverr taxes work for sellers: the 1099-K, self-employment tax, home-office and software deductions, and quarterly payments. Not tax advice.",
    body: [
      "Fiverr treats sellers as independent contractors, so no taxes are withheld. You owe federal and state income tax plus the 15.3% self-employment tax (12.4% Social Security + 2.9% Medicare) on your net earnings.",
      "Fiverr processes buyer payments as a third-party platform, so it issues US sellers a Form 1099-K when they meet the IRS threshold for the year. Thresholds have changed recently, so you may not always get one — report all income regardless.",
      "Because gigs are delivered from a desk, the biggest deductions are usually the home office, software and tools, internet and phone, and the commission Fiverr keeps — not mileage. A common rule of thumb is to set aside 25–30% of net earnings for taxes.",
      "Independent contractors generally pay estimated taxes four times a year — around April 15, June 15, September 15, and January 15 — to avoid an IRS underpayment penalty. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/favor-taxes",
    externalLinks: FAVOR_TAX_LINKS,
    title:
      "Favor Taxes: A Runner's Guide to 1099 Filing & Deductions | UnifyOne",
    description:
      "How Favor taxes work for Runners: the 1099-NEC, self-employment tax, what to set aside, mileage deductions, and quarterly payments. Not tax advice.",
    body: [
      "Favor pays its Runners as independent contractors, so no taxes are withheld from your deliveries. You owe federal and state income tax plus the 15.3% self-employment tax (12.4% Social Security + 2.9% Medicare) on your net earnings.",
      "If you earned $600 or more, Favor issues a 1099-NEC through its payment processor. Below that you may not get a form — but you still have to report all income to the IRS.",
      "Your largest deduction is business mileage at the IRS standard mileage rate for every mile driven while delivering across Texas. Phone use, insulated bags, tolls, and parking are deductible too. A common rule of thumb is to set aside 25–30% of net earnings for taxes.",
      "Independent contractors generally pay estimated taxes four times a year — around April 15, June 15, September 15, and January 15 — to avoid an IRS underpayment penalty. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/veho-taxes",
    externalLinks: VEHO_TAX_LINKS,
    title:
      "Veho Taxes: A Driver's Guide to 1099 Filing & Deductions | UnifyOne",
    description:
      "How Veho taxes work for drivers: the 1099-NEC, self-employment tax, what to set aside, mileage deductions, and quarterly payments. Not tax advice.",
    body: [
      "Veho pays its drivers as independent contractors, so no taxes are withheld from your routes. You owe federal and state income tax plus the 15.3% self-employment tax (12.4% Social Security + 2.9% Medicare) on your net earnings.",
      "If you earned $600 or more, Veho issues a 1099-NEC through its payment processor. Below that you may not get a form — but you still have to report all income to the IRS.",
      "Your largest deduction is business mileage at the IRS standard mileage rate for every mile driven while delivering packages, including between stops. Phone use, supplies, tolls, and parking are deductible too. A common rule of thumb is to set aside 25–30% of net earnings for taxes.",
      "Independent contractors generally pay estimated taxes four times a year — around April 15, June 15, September 15, and January 15 — to avoid an IRS underpayment penalty. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/dolly-taxes",
    externalLinks: DOLLY_TAX_LINKS,
    title:
      "Dolly Taxes: A Helper's Guide to 1099 Filing & Deductions | UnifyOne",
    description:
      "How Dolly taxes work for Helpers: the 1099, self-employment tax, equipment and mileage deductions, and quarterly payments. Not tax advice.",
    body: [
      "Dolly pays its Helpers as independent contractors, so no taxes are withheld from your jobs. You owe federal and state income tax plus the 15.3% self-employment tax (12.4% Social Security + 2.9% Medicare) on your net earnings.",
      "If you meet the reporting threshold, Dolly issues a 1099 through its payment processor. Below that you may not get a form — but you still have to report all income to the IRS.",
      "Because you supply your own vehicle and moving gear, your biggest deductions are usually business mileage at the IRS standard mileage rate (or actual vehicle expenses) plus moving equipment like hand trucks, dollies, and blankets, along with phone use, tolls, and parking. A common rule of thumb is to set aside 25–30% of net earnings for taxes.",
      "Independent contractors generally pay estimated taxes four times a year — around April 15, June 15, September 15, and January 15 — to avoid an IRS underpayment penalty. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/goshare-taxes",
    externalLinks: GOSHARE_TAX_LINKS,
    title:
      "GoShare Taxes: A Driver's Guide to 1099 Filing & Deductions | UnifyOne",
    description:
      "How GoShare taxes work for drivers: the 1099-NEC, self-employment tax, moving-equipment and mileage deductions, and quarterly payments. Not tax advice.",
    body: [
      "GoShare pays its drivers as independent contractors, so no taxes are withheld from your jobs. You owe federal and state income tax plus the 15.3% self-employment tax (12.4% Social Security + 2.9% Medicare) on your net earnings.",
      "If you earned $600 or more, GoShare issues a 1099-NEC through its payment processor. Below that you may not get a form — but you still have to report all income to the IRS.",
      "Because you supply your own truck or van and moving gear, your biggest deductions are usually business mileage at the IRS standard mileage rate (or actual vehicle expenses) plus moving equipment like hand trucks and blankets, along with phone use, tolls, and parking. A common rule of thumb is to set aside 25–30% of net earnings for taxes.",
      "Independent contractors generally pay estimated taxes four times a year — around April 15, June 15, September 15, and January 15 — to avoid an IRS underpayment penalty. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/wag-taxes",
    externalLinks: WAG_TAX_LINKS,
    title: "Wag Taxes: A Dog Walker's Guide to 1099-K & Deductions | UnifyOne",
    description:
      "How Wag taxes work for walkers and sitters: the 1099-K, self-employment tax, pet-care and mileage deductions, and quarterly payments. Not tax advice.",
    body: [
      "Wag treats walkers and sitters as independent contractors, so no taxes are withheld. You owe federal and state income tax plus the 15.3% self-employment tax (12.4% Social Security + 2.9% Medicare) on your net earnings.",
      "Wag processes payments as a third-party platform, so it generally reports earnings on a Form 1099-K when you meet the IRS threshold for the year. Thresholds have changed recently, so you may not always get one — report all income regardless.",
      "Deduct pet-care supplies, Wag's service fees, and the business-use share of your phone. Mileage to walks and client homes is deductible at the IRS standard mileage rate, and if you board pets in your home, part of your home expenses may qualify (the rules are strict — get advice). A common rule of thumb is to set aside 25–30% of net earnings for taxes.",
      "Independent contractors generally pay estimated taxes four times a year — around April 15, June 15, September 15, and January 15 — to avoid an IRS underpayment penalty. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/etsy-taxes",
    externalLinks: ETSY_TAX_LINKS,
    title:
      "Etsy Taxes: A Seller's Guide to the 1099-K, COGS & Deductions | UnifyOne",
    description:
      "How Etsy seller taxes work: the 1099-K, hobby vs business, deducting materials and fees as a self-employed maker, and quarterly taxes. Not tax advice.",
    body: [
      "Etsy doesn't withhold taxes. If you sell as a business — making goods to sell for profit — you owe income tax plus the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) on your net profit: sales minus your cost of materials and expenses.",
      "Etsy processes buyer payments, so it issues a Form 1099-K when your sales reach the IRS reporting threshold for the year. That threshold has changed recently, so you may get one for modest sales — or not get one and still owe tax. It reports gross sales before fees, so it isn't your taxable profit.",
      "Casually selling your own used items for less than you paid generally isn't taxable (and the loss isn't deductible), but making items to sell for profit is a business. Deduct your cost of materials (COGS), Etsy's fees, shipping, packaging, and a qualifying home studio. A common rule of thumb is to set aside 25–30% of net profit for taxes.",
      "Report all business income on Schedule C whether or not a 1099-K arrives, and pay estimated taxes quarterly — around April 15, June 15, September 15, and January 15 — to avoid an IRS underpayment penalty. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/ebay-taxes",
    externalLinks: EBAY_TAX_LINKS,
    title:
      "eBay Taxes: A Reseller's Guide to the 1099-K & Deductions | UnifyOne",
    description:
      "How eBay taxes work for resellers: the 1099-K, hobby vs business, cost of goods, deductible fees and shipping, and quarterly taxes. Not tax advice.",
    body: [
      "eBay doesn't withhold taxes. If you sell as a business — buying items to resell for profit — you owe income tax plus the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) on your net profit: sales minus your cost of goods and expenses.",
      "eBay processes buyer payments, so it issues a Form 1099-K when your sales reach the IRS reporting threshold for the year. That threshold has changed recently, so you may get one for modest sales — or not get one and still owe tax. It reports gross sales before fees and shipping, so it isn't your taxable profit.",
      "Selling your own used belongings for less than you paid generally isn't taxable (and the loss isn't deductible), but reselling for profit is a business. Deduct your cost of goods sold (COGS), eBay and payment fees, shipping, packaging, a qualifying home office, and sourcing mileage. A common rule of thumb is to set aside 25–30% of net profit for taxes.",
      "Report all business income on Schedule C whether or not a 1099-K arrives, and pay estimated taxes quarterly — around April 15, June 15, September 15, and January 15 — to avoid an IRS underpayment penalty. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/poshmark-taxes",
    externalLinks: POSHMARK_TAX_LINKS,
    title:
      "Poshmark Taxes: A Seller's Guide to the 1099-K & Deductions | UnifyOne",
    description:
      "How Poshmark taxes work: the 1099-K, hobby vs business, cost of goods, deductible commission and shipping, and quarterly taxes. Not tax advice.",
    body: [
      "Poshmark doesn't withhold taxes. If you sell as a business — buying clothing to resell for profit — you owe income tax plus the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) on your net profit: sales minus your cost of goods and expenses.",
      "Poshmark processes buyer payments, so it issues a Form 1099-K when your sales reach the IRS reporting threshold for the year. That threshold has changed recently, so you may get one for modest sales — or not get one and still owe tax. It reports gross sales before commission and shipping, so it isn't your taxable profit.",
      "Reselling your own used clothing for less than you paid generally isn't taxable (and the loss isn't deductible), but buying to resell for profit is a business. Deduct your cost of goods (COGS), Poshmark's commission, any shipping you cover, packaging, a qualifying home office, and sourcing mileage. A common rule of thumb is to set aside 25–30% of net profit for taxes.",
      "Report all business income on Schedule C whether or not a 1099-K arrives, and pay estimated taxes quarterly — around April 15, June 15, September 15, and January 15 — to avoid an IRS underpayment penalty. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/mercari-taxes",
    externalLinks: MERCARI_TAX_LINKS,
    title:
      "Mercari Taxes: A Seller's Guide to the 1099-K & Deductions | UnifyOne",
    description:
      "How Mercari taxes work for sellers: the 1099-K, hobby vs business, cost of goods, deductible fees, and quarterly taxes. Not tax advice.",
    body: [
      "Mercari doesn't withhold taxes. If you sell as a business — buying items to resell for profit — you owe income tax plus the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) on your net profit: sales minus your cost of goods and expenses.",
      "Mercari processes buyer payments, so it issues a Form 1099-K when your sales reach the IRS reporting threshold for the year. That threshold has changed recently, so you may get one for modest sales — or not get one and still owe tax. It reports gross sales before fees, so it isn't your taxable profit.",
      "Selling your own used items for less than you paid generally isn't taxable (and the loss isn't deductible), but reselling for profit is a business. Deduct your cost of goods (COGS), Mercari's selling and processing fees, any shipping you cover, packaging, a qualifying home office, and sourcing mileage. A common rule of thumb is to set aside 25–30% of net profit for taxes.",
      "Report all business income on Schedule C whether or not a 1099-K arrives, and pay estimated taxes quarterly — around April 15, June 15, September 15, and January 15 — to avoid an IRS underpayment penalty. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/depop-taxes",
    externalLinks: DEPOP_TAX_LINKS,
    title:
      "Depop Taxes: A Seller's Guide to the 1099-K & Deductions | UnifyOne",
    description:
      "How Depop taxes work for sellers: the 1099-K, hobby vs business, cost of goods, deductible fees and shipping, and quarterly taxes. Not tax advice.",
    body: [
      "Depop doesn't withhold taxes. If you sell as a business — sourcing items to resell for profit — you owe income tax plus the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) on your net profit: sales minus your cost of goods and expenses.",
      "Depop processes buyer payments, so it issues a Form 1099-K when your sales reach the IRS reporting threshold for the year. That threshold has changed recently, so you may get one for modest sales — or not get one and still owe tax. It reports gross sales before fees and shipping, so it isn't your taxable profit.",
      "Reselling your own used clothing for less than you paid generally isn't taxable (and the loss isn't deductible), but buying or sourcing to resell for profit is a business. Deduct your cost of goods (COGS), Depop's fees, any shipping you cover, packaging, a qualifying home office, and sourcing mileage. A common rule of thumb is to set aside 25–30% of net profit for taxes.",
      "Report all business income on Schedule C whether or not a 1099-K arrives, and pay estimated taxes quarterly — around April 15, June 15, September 15, and January 15 — to avoid an IRS underpayment penalty. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/california-gig-worker-taxes",
    externalLinks: CA_TAX_LINKS,
    title:
      "California Gig Worker Taxes: SE Tax, State Income Tax & Estimates | UnifyOne",
    description:
      "California gig worker taxes: the 15.3% federal SE tax plus CA state income tax, FTB estimated payments (Form 540-ES), mileage deductions. Not tax advice.",
    body: [
      "Gig platforms pay California workers as independent contractors and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "California also has a progressive state income tax, with rates reaching roughly 13.3% at the very top, that applies to your net gig profit on top of federal tax. Pay California estimates to the Franchise Tax Board using Form 540-ES.",
      "Your biggest deduction is business mileage at the IRS standard mileage rate, alongside the business-use share of your phone, supplies, tolls, and parking. App-based drivers are generally treated as independent contractors under Proposition 22.",
      "Federal and California estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/texas-gig-worker-taxes",
    externalLinks: TX_TAX_LINKS,
    title:
      "Texas Gig Worker Taxes: No State Income Tax, but SE Tax Still Applies | UnifyOne",
    description:
      "Texas gig worker taxes: there's no Texas state income tax, but you still owe federal income tax plus the 15.3% self-employment tax. Not tax advice.",
    body: [
      "Texas has no personal state income tax, so you won't file a state income-tax return on your gig earnings and there are no state estimated payments to make.",
      "Your gig income is not tax-free, though. The federal rules are the same in every state: federal income tax on your net profit plus the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare), with nothing withheld from your payouts.",
      "Track business mileage and deduct it at the IRS standard mileage rate — usually the largest deduction — along with the business-use share of your phone, supplies, tolls, and parking. Report all income whether or not you get a 1099.",
      "If you expect to owe $1,000 or more in federal tax, the IRS generally expects quarterly estimated payments around April 15, June 15, September 15, and January 15. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/florida-gig-worker-taxes",
    externalLinks: FL_TAX_LINKS,
    title:
      "Florida Gig Worker Taxes: No State Income Tax, Federal & SE Tax Only | UnifyOne",
    description:
      "Florida gig worker taxes: no Florida state income tax, but you still owe federal income tax plus the 15.3% self-employment tax. Not tax advice.",
    body: [
      "Florida has no personal state income tax, so there's no state income-tax return on your gig earnings and no state estimated payments to make.",
      "Federal taxes still apply the same as everywhere else: federal income tax on your net profit plus the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare), with nothing withheld from your payouts.",
      "Deduct business mileage at the IRS standard mileage rate — typically your biggest deduction — plus the business-use share of your phone, supplies, tolls, and parking. You must report all income whether or not a platform sends a 1099.",
      "If you expect to owe $1,000 or more in federal tax, the IRS generally expects quarterly estimated payments around April 15, June 15, September 15, and January 15. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/new-york-gig-worker-taxes",
    externalLinks: NY_TAX_LINKS,
    title:
      "New York Gig Worker Taxes: State & NYC Income Tax, SE Tax, IT-2105 | UnifyOne",
    description:
      "New York gig worker taxes: the 15.3% federal SE tax plus NY state income tax (and NYC local tax for city residents), estimated via Form IT-2105. Not advice.",
    body: [
      "New York gig platforms pay you as an independent contractor with nothing withheld, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "New York also levies a progressive state income tax on your net gig profit, and New York City residents owe an additional NYC local income tax on the same earnings. Pay state estimates to the Department of Taxation and Finance using Form IT-2105.",
      "Your largest deduction is business mileage at the IRS standard mileage rate, plus the business-use share of your phone, supplies, tolls, and parking — lowering both federal and New York taxable income.",
      "Federal and state estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/illinois-gig-worker-taxes",
    externalLinks: IL_TAX_LINKS,
    title:
      "Illinois Gig Worker Taxes: Flat State Income Tax + Federal SE Tax | UnifyOne",
    description:
      "Illinois gig worker taxes: a flat state income tax (around 4.95%) plus the 15.3% federal SE tax, with IL-1040-ES estimates. Not tax advice.",
    body: [
      "Illinois gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "Illinois has a flat state income tax of roughly 4.95% (confirm the current rate with the Illinois Department of Revenue) that applies to your net gig profit on top of federal tax. Pay state estimates using Form IL-1040-ES.",
      "Deduct business mileage at the IRS standard mileage rate — usually the biggest deduction — plus the business-use share of your phone, supplies, tolls, and parking, lowering your federal and Illinois taxable income.",
      "Federal and Illinois estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/washington-gig-worker-taxes",
    externalLinks: WA_TAX_LINKS,
    title:
      "Washington Gig Worker Taxes: No State Income Tax, Federal & SE Tax | UnifyOne",
    description:
      "Washington gig worker taxes: no personal state income tax, but you still owe federal income tax plus the 15.3% self-employment tax. Not tax advice.",
    body: [
      "Washington has no personal state income tax, so you won't file a state income-tax return on your ordinary gig earnings and there are no state income-tax estimates to make.",
      "Federal taxes still apply in full: federal income tax on your net profit plus the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare), with nothing withheld from your payouts.",
      "Deduct business mileage at the IRS standard mileage rate — typically your largest deduction — plus the business-use share of your phone, supplies, tolls, and parking. Report all income whether or not a platform sends a 1099.",
      "If you expect to owe $1,000 or more in federal tax, the IRS generally expects quarterly estimated payments around April 15, June 15, September 15, and January 15. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/georgia-gig-worker-taxes",
    externalLinks: GA_TAX_LINKS,
    title:
      "Georgia Gig Worker Taxes: Flat State Income Tax + Federal SE Tax | UnifyOne",
    description:
      "Georgia gig worker taxes: a flat state income tax (around 5.39%, phasing down) plus the 15.3% federal SE tax, with Form 500-ES estimates. Not tax advice.",
    body: [
      "Georgia gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "Georgia has a flat state income tax — roughly 5.39% in recent years and being phased down under scheduled reductions, so confirm the current rate with the Georgia Department of Revenue — that applies to your net gig profit on top of federal tax. Pay state estimates using Form 500-ES.",
      "Deduct business mileage at the IRS standard mileage rate — usually the biggest deduction — plus the business-use share of your phone, supplies, tolls, and parking, lowering your federal taxable income and Georgia's.",
      "Federal and Georgia estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/pennsylvania-gig-worker-taxes",
    externalLinks: PA_TAX_LINKS,
    title:
      "Pennsylvania Gig Worker Taxes: Flat 3.07% Tax + Federal SE Tax | UnifyOne",
    description:
      "Pennsylvania gig worker taxes: a flat 3.07% state income tax plus the 15.3% federal SE tax, with PA-40 ES estimates and possible local EIT. Not tax advice.",
    body: [
      "Pennsylvania gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "Pennsylvania has a flat state income tax of 3.07% that applies to your net gig profit on top of federal tax; confirm the current rate with the Pennsylvania Department of Revenue. Pay state estimates using the PA-40 ES vouchers.",
      "Many Pennsylvania municipalities and school districts also levy a local earned-income tax (EIT), commonly around 1%, that can apply to self-employment net profits — check your local rate with your municipality or its appointed tax collector.",
      "Deduct business mileage at the IRS standard mileage rate plus the business-use share of your phone, supplies, tolls, and parking. Federal and state estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/new-jersey-gig-worker-taxes",
    externalLinks: NJ_TAX_LINKS,
    title:
      "New Jersey Gig Worker Taxes: Progressive State Tax + Federal SE Tax | UnifyOne",
    description:
      "New Jersey gig worker taxes: the 15.3% federal SE tax plus NJ's progressive state income tax, with Form NJ-1040-ES estimates. Not tax advice.",
    body: [
      "New Jersey gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "New Jersey has a progressive state income tax that applies to your net gig profit on top of federal tax; your rate depends on your total income and bracket, so confirm the current brackets with the New Jersey Division of Taxation. Pay state estimates using Form NJ-1040-ES.",
      "New Jersey computes business net profit under its own rules, so the income figure on your state return may differ from your federal Schedule C. Deduct business mileage at the IRS standard mileage rate plus the business-use share of your phone, supplies, tolls, and parking.",
      "Federal and New Jersey estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/arizona-gig-worker-taxes",
    externalLinks: AZ_TAX_LINKS,
    title:
      "Arizona Gig Worker Taxes: Flat 2.5% State Tax + Federal SE Tax | UnifyOne",
    description:
      "Arizona gig worker taxes: a flat 2.5% state income tax plus the 15.3% federal SE tax, with Form 140ES estimates and mileage deductions. Not tax advice.",
    body: [
      "Arizona gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "Arizona has a flat state income tax of 2.5% — one of the lowest in the country — that applies to your net gig profit on top of federal tax. Confirm the current rate with the Arizona Department of Revenue, and pay state estimates using Form 140ES.",
      "Deduct business mileage at the IRS standard mileage rate — usually the biggest deduction — plus the business-use share of your phone, supplies, tolls, and parking, lowering your federal taxable income and Arizona's.",
      "Federal and Arizona estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/ohio-gig-worker-taxes",
    externalLinks: OH_TAX_LINKS,
    title:
      "Ohio Gig Worker Taxes: State & Local Income Tax + Federal SE Tax | UnifyOne",
    description:
      "Ohio gig worker taxes: the 15.3% federal SE tax plus Ohio's state income tax and possible city municipal tax, with Form IT 1040ES estimates. Not tax advice.",
    body: [
      "Ohio gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "Ohio has a progressive state income tax with an exemption for income below a set threshold, so low earners may owe little or none; above that it applies to your net gig profit on top of federal tax. Confirm current figures with the Ohio Department of Taxation, and pay state estimates using Form IT 1040ES.",
      "Many Ohio cities also levy a local municipal income tax — commonly around 1.5%–3% — that can apply to self-employment net profits, administered separately (often through RITA or CCA). Check your municipality's rate and filing rules.",
      "Deduct business mileage at the IRS standard mileage rate plus the business-use share of your phone, supplies, tolls, and parking. Federal and state estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/north-carolina-gig-worker-taxes",
    externalLinks: NC_TAX_LINKS,
    title:
      "North Carolina Gig Worker Taxes: Flat State Tax + Federal SE Tax | UnifyOne",
    description:
      "North Carolina gig worker taxes: a flat state income tax (around 4.5%, declining) plus the 15.3% federal SE tax, with Form NC-40 estimates. Not tax advice.",
    body: [
      "North Carolina gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "North Carolina has a flat state income tax — roughly 4.5% in recent years and declining under scheduled reductions — that applies to your net gig profit on top of federal tax. Confirm the current rate with the North Carolina Department of Revenue, and pay state estimates using Form NC-40.",
      "Deduct business mileage at the IRS standard mileage rate — usually the biggest deduction — plus the business-use share of your phone, supplies, tolls, and parking, lowering your federal taxable income and North Carolina's.",
      "Federal and North Carolina estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/michigan-gig-worker-taxes",
    externalLinks: MI_TAX_LINKS,
    title:
      "Michigan Gig Worker Taxes: Flat State & Local Tax + Federal SE Tax | UnifyOne",
    description:
      "Michigan gig worker taxes: a flat state income tax (around 4.25%) plus possible city tax and the 15.3% federal SE tax, with Form MI-1040ES. Not tax advice.",
    body: [
      "Michigan gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "Michigan has a flat state income tax of roughly 4.25% that applies to your net gig profit on top of federal tax. Confirm the current rate with the Michigan Department of Treasury, and pay state estimates using Form MI-1040ES.",
      "Some Michigan cities — including Detroit and Grand Rapids — also levy a local city income tax that can apply to self-employment net profits, filed separately with that city. Check whether the city where you live or work imposes one and at what rate.",
      "Deduct business mileage at the IRS standard mileage rate plus the business-use share of your phone, supplies, tolls, and parking. Federal and state estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/colorado-gig-worker-taxes",
    externalLinks: CO_TAX_LINKS,
    title:
      "Colorado Gig Worker Taxes: Flat 4.4% State Tax + Federal SE Tax | UnifyOne",
    description:
      "Colorado gig worker taxes: a flat state income tax (around 4.4%) plus the 15.3% federal SE tax, with Form DR 0104EP estimates. Not tax advice.",
    body: [
      "Colorado gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "Colorado has a flat state income tax of roughly 4.4%, applied to your federal taxable income with state adjustments, so your net gig profit flows through on top of federal tax. The rate can be adjusted, so confirm the current figure with the Colorado Department of Revenue, and pay state estimates using Form DR 0104EP.",
      "Deduct business mileage at the IRS standard mileage rate — usually the biggest deduction — plus the business-use share of your phone, supplies, tolls, and parking, lowering the federal taxable income Colorado's flat tax is built on.",
      "Federal and Colorado estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/doordash-vs-uber-eats",
    externalLinks: DOORDASH_VS_UBER_EATS_LINKS,
    title: "DoorDash vs Uber Eats: Which Pays More for Drivers? | UnifyOne",
    description:
      "DoorDash vs Uber Eats compared on how pay is structured, fees, 1099 forms, mileage, scheduling, and payout speed — plus how to compute your own net pay.",
    body: [
      "DoorDash and Uber Eats both pay couriers as independent contractors, so neither withholds taxes and your take-home depends far more on your market and hours than on the app. There's no universal winner — the only number that matters is what you net per hour, which we show you how to compute rather than quoting figures that go stale.",
      "Both apps are per-offer: each delivery shows a base or upfront amount plus promotions and tips before you accept. DoorDash adds Peak Pay and Challenges in busy periods; Uber Eats adds Surge/Boost zones and Quests. Neither deducts the restaurant's commission from your courier pay, and both default to weekly deposits with faster cash-out options for a possible fee.",
      "On taxes, DoorDash issues a 1099-NEC if you earn $600 or more in a year. Uber may issue a 1099-NEC for incentives and referrals plus a 1099-K for processed delivery fares, with thresholds that change yearly. You owe income tax plus the 15.3% self-employment tax on net earnings from either, and you must report all income whether or not a form arrives.",
      "To compare them honestly, run a few similar shifts on each, track your active hours and the business miles you drove, subtract mileage and expenses, and divide by hours. The free Real Hourly Rate calculator and Earnings Consolidator do that math. This is educational information, not financial or tax advice.",
    ],
  },
  {
    path: "/instacart-vs-doordash",
    externalLinks: INSTACART_VS_DOORDASH_LINKS,
    title: "Instacart vs DoorDash: Which Is Better for Gig Workers? | UnifyOne",
    description:
      "Instacart vs DoorDash compared on how pay works (batches vs offers), fees, 1099 forms, mileage, scheduling, and payouts — plus how to compute your net pay.",
    body: [
      "Instacart and DoorDash are both independent-contractor gig apps, but the work differs: Instacart full-service shoppers shop a cart and deliver groceries, while DoorDash Dashers pick up and drop off prepared orders. That changes how pay is structured and what your time and mileage look like, so which one is better depends on your market and how you value your time — not on a single pay figure.",
      "Instacart pays per batch, an estimated amount based on factors like item count and distance plus tips, and your time includes shopping in-store. DoorDash pays per delivery offer with a base plus promotions and tips, and your time is mostly driving. Because Instacart batches include shopping time, compare them on net pay per active hour rather than per delivery.",
      "Both withhold no taxes and issue a 1099-NEC at $600 or more in earnings; Instacart in-store-only shoppers are W-2 employees instead, while full-service shoppers who also deliver get the 1099-NEC. You owe income tax plus the 15.3% self-employment tax on combined net earnings, and you must report all income even if no form arrives.",
      "To decide, work comparable shifts on each, log your active hours (shopping plus driving for Instacart) and your business miles, subtract mileage and expenses, and divide by hours. The free Real Hourly Rate calculator and Earnings Consolidator compute this for you. This is educational information, not financial or tax advice.",
    ],
  },
  {
    path: "/uber-vs-lyft-driver",
    externalLinks: UBER_VS_LYFT_LINKS,
    title: "Uber vs Lyft: Which Is Better for Drivers? | UnifyOne",
    description:
      "Uber vs Lyft for drivers, compared on how pay works, fees, 1099-K vs 1099-NEC, mileage, scheduling, and payout speed — plus how to compute your own net pay.",
    body: [
      "Uber and Lyft are the two largest US rideshare platforms, and both pay drivers as independent contractors. The apps are structurally similar — upfront fares, surge-style bonuses, and weekly or instant payouts — so which one nets you more comes down to your local market, the hours you drive, and your vehicle costs rather than the brand.",
      "On both, you see an upfront estimated fare and trip details before accepting and keep 100% of tips, and both raise pay during high demand (Uber surge and promotions; Lyft Personal Power Zones and bonuses). Each takes a service fee out of every fare, which is a deductible business expense itemized on your Uber Tax Summary or Lyft Annual Summary.",
      "Both issue similar tax forms: a 1099-K reporting the gross ride fares processed through the platform, plus a 1099-NEC for incentives, referrals, and bonuses; reporting thresholds change by year. You owe income tax plus the 15.3% self-employment tax on net earnings, and you must report all income regardless of which forms you receive.",
      "To compare your own pay, drive comparable hours on each, log your active time and the business miles you drove (including miles between trips, which are often deductible), subtract fees, mileage, and expenses, and divide by hours. The free Real Hourly Rate calculator and Earnings Consolidator do this. This is educational information, not financial or tax advice.",
    ],
  },
  {
    path: "/doordash-vs-grubhub",
    externalLinks: DOORDASH_VS_GRUBHUB_LINKS,
    title: "DoorDash vs Grubhub: Which Pays More for Drivers? | UnifyOne",
    description:
      "DoorDash vs Grubhub compared on how pay is structured, fees, 1099 forms, mileage, scheduling, and payout speed — plus how to compute your own net pay.",
    body: [
      "DoorDash and Grubhub both pay couriers as independent contractors to deliver prepared food, so neither withholds taxes and your take-home depends far more on your market and hours than on the app. There's no universal winner — the only number that matters is what you net per hour, which we show you how to compute rather than quoting figures that go stale.",
      "Both apps are per-offer: each delivery shows an amount plus promotions and tips before you accept. DoorDash shows a guaranteed base plus Peak Pay and Challenges; Grubhub calculates base pay from mileage and time and adds Special Offers and Missions. Neither deducts the restaurant's commission from your courier pay, and both default to weekly deposits with faster cash-out options for a possible fee.",
      "On taxes, both treat you as an independent contractor and issue a 1099-NEC if you earn $600 or more in a year — DoorDash through Stripe, Grubhub through its payment processor. You owe income tax plus the 15.3% self-employment tax on net earnings from either, and you must report all income whether or not a form arrives.",
      "To compare them honestly, run a few similar shifts on each, track your active hours and the business miles you drove, subtract mileage and expenses, and divide by hours. The free Real Hourly Rate calculator and Earnings Consolidator do that math. This is educational information, not financial or tax advice.",
    ],
  },
  {
    path: "/amazon-flex-vs-spark",
    externalLinks: AMAZON_FLEX_VS_SPARK_LINKS,
    title: "Amazon Flex vs Spark: Which Delivery Gig Is Better? | UnifyOne",
    description:
      "Amazon Flex vs Walmart Spark compared on how pay works (blocks vs offers), fees, 1099 forms, mileage, scheduling, and payouts — plus how to find your net pay.",
    body: [
      "Amazon Flex and the Walmart Spark Driver program are both independent-contractor delivery gigs, but they're structured differently: Amazon Flex pays for reserved delivery blocks of a set length, while Spark pays per accepted delivery offer. That changes what your time and mileage look like, so which one is better depends on your market and how you value your time — not on a single pay figure.",
      "Amazon Flex shows an estimated total for a block before you reserve it, with tips added afterward on eligible deliveries; Spark shows an estimate plus tips on each offer before you accept. Neither deducts a separate platform commission from your driver pay, and both default to direct deposit, with instant cash-out availability that varies. Because a Flex block is a fixed time commitment, compare the two on net pay per active hour rather than per stop.",
      "On taxes, both pay you as an independent contractor with nothing withheld and issue a 1099-NEC if you earn $600 or more in a year — Amazon through its tax-document portal, Spark through its payment partner. You owe income tax plus the 15.3% self-employment tax on net earnings, and you must report all income whether or not a form arrives.",
      "To decide, work comparable shifts on each, log your active hours and the business miles you drove (including miles between stops), subtract mileage and expenses, and divide by hours. The free Real Hourly Rate calculator and Earnings Consolidator compute this for you. This is educational information, not financial or tax advice.",
    ],
  },
  {
    path: "/instacart-vs-shipt",
    externalLinks: INSTACART_VS_SHIPT_LINKS,
    title: "Instacart vs Shipt: Which Is Better for Shoppers? | UnifyOne",
    description:
      "Instacart vs Shipt compared on how pay works, fees, 1099 forms, mileage, scheduling, and payout speed — plus how to compute your own net pay as a shopper.",
    body: [
      "Instacart and Shipt are the two largest grocery-shopping gig apps, and both pay shoppers as independent contractors to shop a cart and deliver it. The work is similar — you shop in-store, then drive the order to the customer — so which one nets you more comes down to your market, the hours you work, and your vehicle costs rather than the brand.",
      "Instacart pays per batch, an estimated amount based on factors like item count and distance plus tips; Shipt pays per order with an estimate that factors in the order's effort, plus tips. Because both bundle shopping time into the job, compare them on net pay per active hour rather than per order. Neither deducts customer fees from your shopper pay, and both default to weekly deposits with faster cash-out options for a possible fee.",
      "On taxes, both pay you as an independent contractor and issue a 1099-NEC at $600 or more in earnings. One nuance: Instacart in-store-only shoppers are W-2 employees, while full-service shoppers who also deliver get the 1099-NEC; Shipt shoppers who deliver are independent contractors. You owe income tax plus the 15.3% self-employment tax on net earnings, and you must report all income even if no form arrives.",
      "To compare your own pay, work comparable shifts on each, log your active hours (shopping plus driving) and the business miles you drove, subtract mileage and expenses, and divide by hours. The free Real Hourly Rate calculator and Earnings Consolidator do this. This is educational information, not financial or tax advice.",
    ],
  },
  {
    path: "/1099-nec-vs-1099-k",
    externalLinks: [IRS.selfEmployedCenter, IRS.estimated],
    title: "1099-NEC vs 1099-K: What Gig Workers Need to Know | UnifyOne",
    description:
      "1099-NEC vs 1099-K for gig workers: what each form is, who issues which, why thresholds change yearly, and how both flow onto Schedule C. Not tax advice.",
    body: [
      "Gig workers can receive a 1099-NEC, a 1099-K, both, or neither. A 1099-NEC reports nonemployee compensation — money a business paid you directly for your services, such as DoorDash or Instacart delivery earnings. A 1099-K reports the gross amount of payments settled through a third-party platform or card processor, like the fares riders pay through Uber or Lyft. The forms describe how money reached you, not whether it is taxable.",
      "Which form you get depends on how the platform pays you. DoorDash and Instacart generally issue a 1099-NEC; Uber and Lyft often send a 1099-K for gross fares plus a 1099-NEC for incentives and referrals. Their annual tax summaries reconcile the two so you can report each dollar once without double-counting overlapping amounts.",
      "The IRS reporting thresholds that decide whether a platform must issue a form change from year to year, especially for the 1099-K — so confirm the current figures on IRS.gov rather than relying on a number you read online. Critically, a threshold only governs whether a form is sent; it never changes whether income is taxable. If no form arrives, you still owe income tax and the 15.3% self-employment tax on your net profit.",
      "Both forms flow to the same place: gross income goes on Schedule C, where you subtract business expenses like the standard mileage deduction to reach net profit. That net profit carries to Schedule SE for self-employment tax and to Form 1040 for income tax. This page is educational, not tax advice — verify your situation with the IRS or a qualified professional.",
    ],
  },
  {
    path: "/how-to-file-gig-worker-taxes",
    externalLinks: [IRS.selfEmployedCenter, IRS.estimated, IRS.seTax],
    title: "How to File Taxes as a Gig Worker: Step-by-Step | UnifyOne",
    description:
      "File gig worker taxes step by step: gather 1099s, total income, complete Schedule C and Schedule SE, finish Form 1040, and set up quarterly payments.",
    body: [
      "Filing as a 1099 gig worker follows a predictable order. Start by gathering every 1099-NEC and 1099-K your platforms issued, plus your own earnings records and mileage log — then total your gross income and report all of it, even amounts under $600 or income that never generated a form.",
      "Report that income and your business deductions on Schedule C to arrive at your net profit. Deductions like business mileage at the IRS standard mileage rate, phone use, supplies, tolls, and platform fees lower the profit you're taxed on, so accurate year-round records matter.",
      "Calculate self-employment tax on Schedule SE — 15.3% (12.4% Social Security + 2.9% Medicare) on your net earnings — then carry your net profit and SE tax to Form 1040, where you deduct half of the self-employment tax. File a state return too if your state has an income tax.",
      "Going forward, the IRS generally expects quarterly estimated payments via Form 1040-ES if you'll owe $1,000 or more, due around April 15, June 15, September 15, and January 15. The annual return is generally due around April 15. You can file with IRS Free File, commercial software, or a tax professional.",
    ],
  },
  {
    path: "/gig-quarterly-taxes",
    externalLinks: [IRS.estimated, IRS.selfEmployedCenter, IRS.seTax],
    title:
      "Quarterly Estimated Taxes for Gig Workers: A Practical Guide | UnifyOne",
    description:
      "How quarterly estimated taxes work for gig workers: who pays, the four due dates, the safe-harbor rule, how to estimate and pay, and the underpayment penalty.",
    body: [
      "Gig platforms like DoorDash, Uber, and Instacart withhold no tax, so independent contractors pay the IRS in four installments through the year instead of once in April. As a general rule you should make estimated payments if you expect to owe $1,000 or more for the year after withholding and credits — and most gig workers do, because gig income carries both income tax and the 15.3% self-employment tax.",
      "Federal estimated taxes are due four times a year, with deadlines that usually fall around April 15, June 15, September 15, and January 15 of the following year. Each date shifts to the next business day when it lands on a weekend or holiday, so confirm the current year's exact dates with the IRS.",
      "To avoid an underpayment penalty, the safe-harbor rule says your payments and withholding should cover at least 90% of this year's tax or 100% of last year's tax — 110% if your prior-year adjusted gross income was over $150,000. Estimate each payment from your net earnings (income after deductions like mileage), then pay via IRS Direct Pay, EFTPS, or by mailing Form 1040-ES.",
      "If you fall short, the IRS charges an underpayment penalty calculated like interest on the amount underpaid for the time it was late, not a flat fine. This guide is educational information, not tax advice — confirm thresholds, due dates, and rates with the IRS or a qualified tax professional.",
    ],
  },
  {
    path: "/gig-worker-tax-deductions",
    externalLinks: [IRS.selfEmployedCenter, IRS.mileage, IRS.seTax],
    title: "Gig Worker Tax Deductions: The Complete Checklist | UnifyOne",
    description:
      "The business expenses gig workers most often miss: mileage, phone, hot bags, tolls, platform fees, health insurance, half of SE tax & home office.",
    body: [
      "Gig workers are taxed on profit, not gross payouts, so every legitimate business expense you track lowers the income you pay tax on. This checklist covers the deductions DoorDash, Uber, Instacart, and other 1099 workers most commonly miss.",
      "Business mileage is usually the largest deduction. You pick one method per vehicle for the year — the IRS standard mileage rate (70¢ per mile for 2025) or the actual-expense method for the business-use share of gas, insurance, repairs, and depreciation. You can't combine them, and the rate changes annually.",
      "Other commonly missed write-offs include the business-use share of your phone and data, hot bags and equipment, tolls and parking paid while working, platform service fees, supplies, the self-employed health insurance deduction, and the deductible half of the 15.3% self-employment tax. A home office is deductible only with a space used regularly and exclusively for the business.",
      "Deductions only count if you can substantiate them. Keep a contemporaneous mileage log noting the date, miles, and purpose of each trip, and save receipts for every expense. This is educational information, not tax advice — confirm current figures with the IRS or a tax professional.",
    ],
  },
  {
    path: "/architecture",
    title: "Architecture | UnifyOne by 1Commerce",
    description:
      "Explore UnifyOne's structural pillars — multi-tenant foundation, payment orchestration, automation mesh, social intelligence, and Kai AI.",
  },
  {
    path: "/the-system",
    title: "The System | UnifyOne",
    description:
      "How UnifyOne works: four sequential build phases, ten integrations, and six features that replace three separate SaaS tools.",
  },
  {
    path: "/pricing",
    title: "Pricing | UnifyOne",
    description:
      "UnifyOne pricing: Starter (free forever), Pro ($19/mo), and Scale ($99/mo). Multi-tenant commerce, AI insights, and every payment rail.",
  },
  {
    path: "/about",
    title: "About | UnifyOne by 1Commerce",
    description:
      "UnifyOne is built by 1Commerce (PNW Enterprises) — AI-powered, multi-tenant commerce infrastructure for gig operators and e-commerce teams.",
  },
  {
    path: "/press",
    title: "Press & Media Kit | UnifyOne by 1Commerce",
    description:
      "UnifyOne press and media kit: download brand logos, copy-paste boilerplate, company facts, and category tags. By 1Commerce LLC (PNW Enterprises).",
    body: [
      "UnifyOne is an AI-powered multi-tenant commerce platform by 1Commerce LLC (PNW Enterprises) of Canby, Oregon. This media kit gives press, software directories, and reviewers everything needed to cover or list us accurately.",
      "Download the brand logo (SVG and transparent PNG) and the boilerplate file with the canonical product name, 60-character, 160-character, and 80-word descriptions, category tags, and brand colors. For anything else, email support@1commerce.online.",
    ],
  },
  {
    path: "/contact",
    title: "Contact | UnifyOne",
    description:
      "Get in touch with the UnifyOne team at 1Commerce — questions on multi-tenant commerce, pricing, integrations, partnerships, and support.",
  },
  {
    path: "/tithes",
    title: "Tithes | UnifyOne",
    description:
      "UnifyOne's Tithes program and transparent pricing — Starter free, Pro $19/mo, Scale $99/mo, all driven by one canonical catalog.",
  },
  {
    path: "/documents",
    title: "Documentation | UnifyOne",
    description:
      "UnifyOne documentation — guides, integrations, case studies, and the full build timeline for the multi-tenant commerce platform.",
  },
  {
    path: "/documents/case-studies",
    title: "Case Studies | UnifyOne",
    description:
      "Detailed case studies of UnifyOne platform features: Cathedral Framework, Kai, multi-tenant architecture, Stripe CAPI bridge, and scroll reveals.",
  },
  {
    path: "/documents/integrations",
    title: "Integration Guides | UnifyOne",
    description:
      "Complete integration guides for UnifyOne — Kai, Claude, n8n, Stripe, PayPal, Square, and Shopify connections for operators.",
  },
  {
    path: "/documents/work-proof",
    title: "Build Timeline & Work Proof | UnifyOne",
    description:
      "Complete timeline of 36 development phases, deliverables, and technical achievements for the UnifyOne platform.",
  },
  {
    path: "/tools",
    title: "Free Tools for Gig Workers & Sellers | UnifyOne",
    description:
      "Free tools for 1099 gig workers: mileage, quarterly tax, earnings consolidation, break-even pricing, and cash-flow tracking. No account required.",
  },
  {
    path: "/blog",
    title: "Blog | UnifyOne by 1Commerce",
    description:
      "UnifyOne blog — multi-tenant commerce, gig-economy earnings, AI automation, and digital retail strategy for operators and e-commerce teams.",
  },
  {
    path: "/blog/gig-worker-shift-intelligence",
    title: "Gig Worker Shift Intelligence | UnifyOne Blog",
    description:
      "How shift intelligence turns DoorDash, Uber Eats, and Instacart history into higher net pay — the data gig workers need to optimize shifts.",
  },
  {
    path: "/tools/mileage-deduction-calculator",
    externalLinks: [IRS.mileage],
    title: "IRS Mileage Deduction Calculator for Gig Workers 2025 | UnifyOne",
    description:
      "Free IRS mileage deduction calculator for gig workers. Enter miles driven to see your $0.70/mile deduction and estimated tax savings at 4 federal brackets.",
    body: [
      "Every mile you drive for DoorDash, Uber Eats, Instacart, Amazon Flex, or any 1099 gig is deductible at the IRS standard mileage rate. This free calculator turns your miles into a dollar deduction and shows the estimated tax it saves across four common federal brackets.",
      "Enter your business miles for the year to see your total deduction and how much it lowers your taxable income. For drivers who want their mileage tracked automatically alongside real earnings, UnifyOne consolidates miles, payouts, and expenses in one place.",
    ],
  },
  {
    path: "/tools/quarterly-tax-estimator",
    externalLinks: [IRS.estimated],
    title: "Quarterly Estimated Tax Calculator — 1099 Self-Employed | UnifyOne",
    description:
      "Free 1099 quarterly tax calculator for gig workers. See your SE tax + income tax and exact quarterly payment amounts with 2026 due dates.",
    body: [
      "1099 gig workers owe taxes four times a year, not just in April. This calculator estimates your self-employment tax and federal income tax from your net earnings, then breaks the total into the four quarterly payments the IRS expects — with the 2026 due dates.",
      "Knowing each quarter's number in advance prevents underpayment penalties and April surprises. UnifyOne can derive these estimates from your live earnings so the amount is always current.",
    ],
  },
  {
    path: "/tools/earnings-consolidator",
    externalLinks: PLATFORMS,
    title:
      "Multi-Platform Gig Earnings Consolidator | True Hourly Rate | UnifyOne",
    description:
      "Free gig earnings calculator. See your true hourly rate after expenses across DoorDash, Uber Eats, Instacart, and more — no account required.",
    body: [
      "Gross pay from gig apps hides what you actually keep. This consolidator combines earnings from DoorDash, Uber Eats, Instacart, and more, subtracts mileage and expenses, and shows your true net hourly rate across every platform.",
      "Seeing real net-per-hour side by side reveals which apps and hours are worth your time. UnifyOne keeps this view live by syncing payouts and costs automatically.",
    ],
  },
  {
    path: "/tools/reseller-break-even",
    externalLinks: [
      { label: "eBay", url: "https://www.ebay.com" },
      { label: "Etsy", url: "https://www.etsy.com/sell" },
      { label: "Amazon Seller", url: "https://sell.amazon.com" },
    ],
    title:
      "Reseller Break-Even & Pricing Calculator — eBay, Etsy, Amazon | UnifyOne",
    description:
      "Free reseller pricing calculator. Enter item cost, fees, shipping, and return rate to find your break-even price and target margin on eBay, Etsy, or Amazon.",
    body: [
      "Marketplace fees, shipping, and returns quietly erode reseller margins. This calculator takes your item cost, platform fees, shipping, and expected return rate and tells you the exact break-even price plus the list price you need for a target margin on eBay, Etsy, or Amazon.",
      "Price above break-even with confidence instead of guessing. UnifyOne helps resellers track costs and margins across every channel from one dashboard.",
    ],
  },
  {
    path: "/tools/cashflow-tracker",
    externalLinks: PLATFORMS,
    title:
      "Gig Payout Timing & Cash-Flow Tracker | DoorDash, Uber, Instacart | UnifyOne",
    description:
      "Free gig cash-flow tool. Model when DoorDash, Uber Eats, Instacart, and Lyft payouts hit your bank and forecast your 30-day income rhythm.",
    body: [
      "Gig pay arrives on different schedules — instant cash-outs, weekly deposits, and platform delays all collide. This tool models when DoorDash, Uber Eats, Instacart, and Lyft payouts actually land in your bank so you can forecast your 30-day income rhythm.",
      "A clear payout timeline makes it easier to cover bills and avoid overdrafts between deposits. UnifyOne extends this with live earnings tracking across every platform.",
    ],
  },
  {
    path: "/tools/se-tax-calculator",
    externalLinks: [IRS.seTax],
    title:
      "Self-Employment Tax Calculator for 1099 Gig Workers 2025 | UnifyOne",
    description:
      "Free self-employment tax calculator for DoorDash, Uber, and Instacart 1099 workers. See your SE tax (Social Security + Medicare) and quarterly estimates.",
    body: [
      "Self-employed gig workers pay the full 15.3% self-employment tax — both halves of Social Security and Medicare — on top of income tax. This calculator breaks down your SE tax from net earnings, shows the deductible employer-equivalent half, and estimates your quarterly payments.",
      "Understanding the SE portion separately from income tax makes your real tax burden clear. UnifyOne keeps the numbers current by computing them from your actual platform earnings.",
    ],
  },
  {
    path: "/tools/gig-hourly-rate",
    externalLinks: PLATFORMS,
    title:
      "Gig Worker Real Hourly Rate Calculator — DoorDash, Uber Eats, Instacart | UnifyOne",
    description:
      "Find your true hourly rate from DoorDash, Uber Eats, Instacart, and Grubhub after vehicle costs and miles. Free gig earnings optimizer — compare platforms.",
    body: [
      "The hourly rate a gig app advertises ignores gas, depreciation, and dead miles. This calculator factors vehicle cost-per-mile and your actual driving into a true hourly rate for DoorDash, Uber Eats, Instacart, and Grubhub.",
      "Comparing real net-per-hour across platforms shows where your time pays best. UnifyOne turns this one-off check into continuous optimization across every app you run.",
    ],
  },
  {
    path: "/tools/tax-set-aside",
    externalLinks: [IRS.selfEmployedCenter],
    title:
      "1099 Tax Set-Aside Calculator — How Much to Save for Gig Taxes | UnifyOne",
    description:
      "Find the exact percentage of each gig payment to set aside for taxes. Free calculator for DoorDash, Uber, and Instacart 1099 workers — SE + federal tax.",
    body: [
      "The safest way to avoid a tax-season shortfall is to set aside a percentage of every gig payment as it arrives. This calculator combines self-employment tax and federal income tax to give you one set-aside percentage for DoorDash, Uber, Instacart, and any 1099 income.",
      "Move that share into a separate account each time you cash out and quarterly taxes take care of themselves. UnifyOne can automate the set-aside from your live earnings.",
    ],
  },
  {
    path: "/gig-income-aggregator",
    externalLinks: PLATFORMS,
    title:
      "Gig Income Aggregator — Consolidate DoorDash, Uber, Instacart Earnings | UnifyOne",
    description:
      "Consolidate DoorDash, Uber Eats, Instacart, Stripe, PayPal, and Square income in one dashboard. See true net earnings after expenses and true hourly rate.",
  },
  {
    path: "/1099-tax-management",
    externalLinks: [IRS.selfEmployedCenter, IRS.estimated],
    title:
      "1099 Tax Management for Gig Workers — Quarterly Estimates & Deductions | UnifyOne",
    description:
      "Automated 1099 tax management for gig workers: quarterly payments from live earnings, SE tax, mileage deductions, and IRS-ready records.",
  },
  {
    path: "/gig-earnings-optimizer",
    externalLinks: PLATFORMS,
    title:
      "Gig Earnings Optimizer — Maximize Net Pay Across DoorDash, Uber, Instacart | UnifyOne",
    description:
      "Find which gig apps and shifts generate the highest net pay after expenses. UnifyOne compares real net earnings per hour across all platforms.",
  },
  {
    path: "/financial-intelligence-gig-workers",
    title:
      "Financial Intelligence for Gig Workers — AI-Powered Earnings Analytics | UnifyOne",
    description:
      "AI-powered financial intelligence for gig workers: real-time earnings analysis, tax forecasting, and net income visibility across all platforms.",
  },
  {
    path: "/gig-route-intelligence",
    externalLinks: PLATFORMS,
    title:
      "Gig Route Intelligence — Optimize Delivery Zones for Higher Net Pay | UnifyOne",
    description:
      "Discover which delivery zones generate your highest net pay per hour. UnifyOne maps your actual earnings history to show where your time is worth most.",
  },
  {
    path: "/gig-taxes",
    externalLinks: [IRS.selfEmployedCenter, IRS.estimated, IRS.seTax],
    title: "Gig Worker Taxes: The Complete Guide for 1099 Earners | UnifyOne",
    description:
      "How gig worker taxes work: self-employment tax, 1099-NEC vs 1099-K, deductions, and quarterly payments — plus guides for DoorDash, Uber & Instacart.",
    body: [
      "Driving for DoorDash, Uber, or Instacart makes you an independent contractor — nobody withholds taxes for you. You owe federal and state income tax plus the 15.3% self-employment tax (12.4% Social Security + 2.9% Medicare) on your net earnings, and you pay it yourself as you go.",
      "You're taxed on profit, not gross payouts. Deductions — business mileage at the IRS standard mileage rate, phone use, hot bags, tolls, and platform fees — lower the income you're taxed on, so tracking them all year is the single biggest way to cut your bill.",
      "A common rule of thumb is to set aside 25–30% of net earnings for taxes. If you expect to owe $1,000 or more, the IRS expects quarterly estimated payments around April 15, June 15, September 15, and January 15 to avoid an underpayment penalty.",
      "A 1099-NEC reports direct pay for your services; a 1099-K reports payments processed through a platform (like Uber's gross fares). You must report all income whether or not a form arrives. See the platform-specific guides for DoorDash, Uber, and Instacart.",
    ],
  },
  {
    path: "/doordash-taxes",
    externalLinks: DOORDASH_TAX_LINKS,
    title:
      "DoorDash Taxes: A Dasher's Guide to 1099 Filing & Deductions | UnifyOne",
    description:
      "How DoorDash taxes work for Dashers: the 1099-NEC, self-employment tax, what to set aside, mileage deductions, and quarterly payments. Not tax advice.",
    body: [
      "DoorDash doesn't withhold taxes from your pay. As a Dasher you're an independent contractor, so you owe federal and state income tax plus the 15.3% self-employment tax on your net earnings.",
      "If you earned $600 or more, DoorDash issues a 1099-NEC through Stripe. Below that you may not get a form — but you still have to report all income to the IRS.",
      "Your largest deduction is business mileage at the IRS standard mileage rate for every mile driven while dashing. Phone use, hot bags, tolls, and parking are deductible too. A common rule of thumb is to set aside 25–30% of net earnings for taxes.",
      "Independent contractors generally pay estimated taxes four times a year — around April 15, June 15, September 15, and January 15 — to avoid an IRS underpayment penalty.",
    ],
  },
  {
    path: "/uber-driver-taxes",
    externalLinks: UBER_TAX_LINKS,
    title:
      "Uber Driver Taxes: 1099-K vs 1099-NEC, Deductions & Estimates | UnifyOne",
    description:
      "Uber driver taxes explained: the 1099-K vs 1099-NEC, your Tax Summary, self-employment tax, mileage deductions, and quarterly estimates. Not tax advice.",
    body: [
      "Uber treats drivers as independent contractors and withholds no taxes. You owe income tax plus the 15.3% self-employment tax on your net earnings, whether you drive UberX, Uber Eats, or both.",
      "Uber may send two forms: a 1099-K for the gross fares riders and customers paid, and a 1099-NEC for incentives, referrals, and bonuses. Your Uber Tax Summary reconciles both — and you must report all earnings regardless of which forms arrive.",
      "Business mileage at the IRS standard mileage rate is usually the biggest deduction, and because Uber only reports online miles, your real deductible mileage is often higher. Service fees, phone use, tolls, and rider amenities are deductible too.",
      "If you expect to owe $1,000 or more for the year, the IRS generally expects quarterly estimated payments — around April 15, June 15, September 15, and January 15.",
    ],
  },
  {
    path: "/instacart-taxes",
    externalLinks: INSTACART_TAX_LINKS,
    title:
      "Instacart Taxes: A Shopper's Guide to 1099s & Deductions | UnifyOne",
    description:
      "Instacart taxes for full-service shoppers: the 1099-NEC, self-employment tax, mileage and supply deductions, and quarterly payments. Not tax advice.",
    body: [
      "How you're taxed on Instacart depends on your role. Full-service shoppers who shop and deliver are independent contractors responsible for their own taxes; in-store-only shoppers are part-time W-2 employees with taxes withheld.",
      "Full-service shoppers who earned $600 or more receive a 1099-NEC, usually delivered through Stripe by late January. You must report all income even if a form doesn't arrive.",
      "Full-service shoppers can deduct business mileage at the IRS standard mileage rate, plus phone use, insulated bags, and other supplies. A common rule of thumb is to set aside 25–30% of net earnings for self-employment and income tax.",
      "Independent-contractor shoppers generally pay estimated taxes four times a year — around April 15, June 15, September 15, and January 15 — to avoid an underpayment penalty.",
    ],
  },
  {
    path: "/how-to-make-money-on-doordash",
    externalLinks: DOORDASH_START_LINKS,
    title: "How to Make Money on DoorDash: A Beginner's Guide | UnifyOne",
    description:
      "How to make money on DoorDash: requirements, how to sign up, how Dasher pay works, and how to compute your real net hourly rate. Beginner's guide.",
    body: [
      "DoorDash lets you earn on your own schedule by delivering food and other orders nearby. Dashers are independent contractors who use their own car, bike, or scooter, choose when to work, and accept or decline each delivery offer.",
      "To start you generally need to be at least 18, have a way to deliver, carry a smartphone, and pass a background check. Requirements vary by market and change over time, so confirm the current criteria with DoorDash before applying.",
      "Pay is per delivery — base pay plus any active promotions, with 100% of customer tips on top — and there is no guaranteed wage. Because no taxes are withheld and you cover your own gas and vehicle wear, your gross earnings overstate your take-home.",
      "To know what you'd really make, track a few shifts and use the free Real Hourly Rate calculator and Earnings Consolidator to compute your net pay. This is educational information, not financial advice, and not a guarantee of income.",
    ],
  },
  {
    path: "/how-to-make-money-driving-for-uber",
    externalLinks: UBER_START_LINKS,
    title: "How to Make Money Driving for Uber: A Beginner's Guide | UnifyOne",
    description:
      "How to make money driving for Uber: requirements, how to sign up, how driver pay works, and how to compute your real net hourly rate. Beginner's guide.",
    body: [
      "Driving for Uber lets you earn by giving rides on your own schedule in your own car. Drivers are independent contractors who decide when to go online, where to drive, and which trips to accept in the app.",
      "Rideshare driving typically requires you to be at least 21, have an eligible four-door vehicle, carry valid insurance and registration, and pass a background and driving-record check. Requirements vary by city and change, so confirm the current criteria with Uber.",
      "Uber shows an upfront fare before you accept, with surge pricing and promotions during high demand and 100% of tips on top. There's no guaranteed wage, Uber takes a service fee from fares, and you pay for your own gas and vehicle costs.",
      "To understand your real earnings, track a few shifts and use the free Real Hourly Rate calculator and Earnings Consolidator to compute your net pay after costs. This is educational information, not financial advice, and not a guarantee of income.",
    ],
  },
  {
    path: "/how-to-make-money-with-instacart",
    externalLinks: INSTACART_START_LINKS,
    title: "How to Make Money with Instacart: A Shopper's Guide | UnifyOne",
    description:
      "How to make money with Instacart: requirements, how to sign up, how full-service shopper pay works, and how to compute your real net hourly rate.",
    body: [
      "Instacart lets you earn by shopping for groceries and delivering them on your own schedule. Full-service shoppers are independent contractors who use their own car to shop a customer's order in-store and drive it to the door.",
      "To start as a full-service shopper you generally need to be at least 18, have a car and a smartphone, be able to lift and carry groceries, and pass a background check. Requirements vary by market and change, so confirm the current criteria with Instacart.",
      "Instacart pays per batch, an estimated amount based on factors like item count and distance, with 100% of tips on top and no guaranteed wage. Your working time includes shopping in-store, not just driving, and you cover your own fuel and vehicle costs.",
      "To know your real take-home, track your active hours and expenses and use the free Real Hourly Rate calculator and Earnings Consolidator to compute net pay. This is educational information, not financial advice, and not a guarantee of income.",
    ],
  },
  {
    path: "/how-to-make-money-with-amazon-flex",
    externalLinks: AMAZON_FLEX_START_LINKS,
    title: "How to Make Money with Amazon Flex: A Beginner's Guide | UnifyOne",
    description:
      "How to make money with Amazon Flex: requirements, how to sign up, how delivery-block pay works, and how to compute your real net hourly rate.",
    body: [
      "Amazon Flex lets you earn by delivering Amazon packages during scheduled blocks of time in your own vehicle. Drivers are independent contractors who reserve the blocks that fit their schedule and get paid for the block.",
      "To start you generally need to be at least 21, have a qualifying vehicle (often mid-size or larger with adequate cargo space), carry valid insurance, have a compatible smartphone, and pass a background check. Requirements vary by location and change, so confirm them with Amazon Flex.",
      "Amazon Flex pays per block, showing an estimated pay before you reserve it; most package-delivery blocks don't include tips. If a route runs long your effective rate drops, no taxes are withheld, and you cover your own fuel and vehicle costs.",
      "To understand your real earnings, track your actual block time and expenses and use the free Real Hourly Rate calculator and Earnings Consolidator to compute net pay. This is educational information, not financial advice, and not a guarantee of income.",
    ],
  },
  {
    path: "/how-to-make-money-with-lyft",
    externalLinks: LYFT_START_LINKS,
    title: "How to Make Money with Lyft: A Beginner's Guide | UnifyOne",
    description:
      "How to make money with Lyft: requirements, how to sign up, how driver pay works, and how to compute your real net hourly rate. Beginner's guide.",
    body: [
      "Driving with Lyft lets you earn by giving rides on your own schedule in your own car. Drivers are independent contractors who decide when to go online, where to drive, and which ride requests to accept in the app.",
      "Rideshare driving typically requires you to be at least 21, have an eligible four-door vehicle, carry valid insurance and registration, and pass a background and driving-record check. Requirements vary by city and change, so confirm the current criteria with Lyft.",
      "Lyft shows upfront trip details before you accept, with Prime Time and promotions during busy periods and 100% of tips on top. There's no guaranteed wage, Lyft takes a service fee from fares, and you pay for your own gas and vehicle costs.",
      "To understand your real earnings, track a few shifts and use the free Real Hourly Rate calculator and Earnings Consolidator to compute your net pay after costs. This is educational information, not financial advice, and not a guarantee of income.",
    ],
  },
  {
    path: "/how-to-make-money-delivering-for-grubhub",
    externalLinks: GRUBHUB_START_LINKS,
    title:
      "How to Make Money Delivering for Grubhub: A Beginner's Guide | UnifyOne",
    description:
      "How to make money delivering for Grubhub: requirements, how to sign up, how driver pay works, and how to compute your real net hourly rate.",
    body: [
      "Grubhub lets you earn on your own schedule by delivering food orders to customers nearby. Drivers are independent contractors who use their own car, bike, or scooter, choose when to work, and accept or decline each offer.",
      "To start you generally need to be at least 18, have a way to deliver, carry a smartphone, and pass a background check. Requirements vary by market and change over time, so confirm the current criteria with Grubhub before applying.",
      "Pay is per delivery — a base amount plus any bonuses, with 100% of customer tips on top — and there is no guaranteed wage. Because no taxes are withheld and you cover your own gas and vehicle wear, your gross earnings overstate your take-home.",
      "To know what you'd really make, track a few shifts and use the free Real Hourly Rate calculator and Earnings Consolidator to compute your net pay. This is educational information, not financial advice, and not a guarantee of income.",
    ],
  },
  {
    path: "/how-to-make-money-as-a-spark-driver",
    externalLinks: SPARK_START_LINKS,
    title: "How to Make Money as a Spark Driver: A Beginner's Guide | UnifyOne",
    description:
      "How to make money as a Spark driver: requirements, how to sign up, how Walmart delivery pay works, and how to compute your real net hourly rate.",
    body: [
      "The Spark Driver platform lets you earn by delivering orders for Walmart and other businesses in your own car. Drivers are independent contractors who accept or decline offers in the app and deliver them along a route.",
      "To start you generally need to be at least 18, have a reliable vehicle, carry valid insurance, have a smartphone, and pass a background check. Requirements vary by location and change, so confirm the current criteria on the Spark Driver platform.",
      "Each offer shows estimated pay and details before you accept; some are single deliveries and others are batched, with 100% of customer tips on top. There's no guaranteed wage, no taxes are withheld, and you cover your own fuel and vehicle costs.",
      "To understand your real earnings, track a few shifts and use the free Real Hourly Rate calculator and Earnings Consolidator to compute your net pay after costs. This is educational information, not financial advice, and not a guarantee of income.",
    ],
  },
  {
    path: "/how-to-make-money-on-taskrabbit",
    externalLinks: TASKRABBIT_START_LINKS,
    title: "How to Make Money on TaskRabbit: A Beginner's Guide | UnifyOne",
    description:
      "How to make money on TaskRabbit: requirements, how to sign up, how Tasker pay works, and how to compute your real net hourly rate. Beginner's guide.",
    body: [
      "TaskRabbit lets you earn by doing tasks for clients — assembly, moving help, mounting, cleaning, and handyman work. Taskers are independent contractors who list their categories, set their own hourly rates, and accept the jobs they want in the app.",
      "To start you generally need to be at least 18, bring the skills and tools for your categories, have a smartphone and a way to reach jobs, complete registration, and pass a background check. Requirements vary by market and change, so confirm them with TaskRabbit.",
      "You set your own rates and are paid for the time a job takes, minus a TaskRabbit service fee, with any client tips on top. There's no guaranteed wage, no taxes are withheld, and you cover your own tools, supplies, and travel.",
      "To know what you'd really make, track your active hours and expenses and use the free Real Hourly Rate calculator and Earnings Consolidator to compute your net pay. This is educational information, not financial advice, and not a guarantee of income.",
    ],
  },
  {
    path: "/how-to-make-money-with-rover",
    externalLinks: ROVER_START_LINKS,
    title: "How to Make Money with Rover: A Beginner's Guide | UnifyOne",
    description:
      "How to make money with Rover: requirements, how to sign up, how sitter and walker pay works, and how to compute your real net hourly rate.",
    body: [
      "Rover lets you earn by caring for pets — boarding, house sitting, drop-in visits, day care, and dog walking — on your own schedule. Sitters are independent contractors who list services, set their own prices, and accept or decline bookings in the app.",
      "To start you generally need to be at least 18, be comfortable and reliable with animals (and have a pet-friendly space if you board), have a smartphone, build a profile for approval, and pass a background check. Requirements vary by market and change, so confirm them with Rover.",
      "You set your own prices and are paid for completed bookings, minus a Rover service fee, with any owner tips on top. There's no guaranteed wage, no taxes are withheld, and you cover your own supplies, travel, and any boarding costs.",
      "To know what you'd really make, track your active hours and expenses and use the free Real Hourly Rate calculator and Earnings Consolidator to compute your net pay. This is educational information, not financial advice, and not a guarantee of income.",
    ],
  },
  {
    path: "/blog/gig-economy-commerce-platform",
    title: "Gig Economy Commerce Platform | UnifyOne Blog",
    description:
      "Why gig-economy operators need a unified commerce platform — consolidating earnings, orders, and analytics across DoorDash, Uber, and more.",
  },
  {
    path: "/blog/multi-tenant-ecommerce-saas",
    title: "Multi-Tenant Ecommerce SaaS | UnifyOne Blog",
    description:
      "What multi-tenant ecommerce SaaS means, how tenant isolation and RBAC work, and how UnifyOne runs many stores from one secure backend.",
  },
  {
    path: "/blog/digital-retail-guide",
    title: "Digital Retail Guide | UnifyOne Blog",
    description:
      "A practical digital retail guide for operators — unifying storefronts, marketplaces, and POS into one multi-tenant commerce system.",
  },
  {
    path: "/privacy",
    title: "Privacy Policy | UnifyOne",
    description:
      "UnifyOne Privacy Policy — how 1Commerce LLC collects, uses, and protects your data in compliance with CCPA and GDPR. Last updated March 2026.",
  },
  {
    path: "/terms",
    title: "Terms of Service | UnifyOne",
    description:
      "UnifyOne Terms of Service — usage terms, subscription billing, the Promote & Earn program, data ownership, and liability limits. 1Commerce LLC.",
  },
  {
    path: "/themes",
    title: "Theme Store | UnifyOne — Commerce Themes & Storefront Designs",
    description:
      "Browse free and paid themes for your UnifyOne storefront. Professionally designed for e-commerce and gig worker platforms — preview and install in minutes.",
  },
  {
    path: "/docs-chat",
    title: "Docs Chat | UnifyOne",
    description:
      "Ask questions about UnifyOne documentation — answered instantly by Kai, the built-in Claude-powered AI assistant.",
  },
  {
    path: "/resources",
    title: "Resources | UnifyOne",
    description:
      "Operating excellence resources for gig operators and commerce teams — playbooks, templates, analytics guides, and video walkthroughs. Download free.",
  },
  {
    path: "/sovereign",
    title: "The Sovereign Stack | 1Commerce",
    description:
      "The Sovereign Stack gives gig operators legal protection, financial independence, and resilience. Break free from platform lock-in. Waitlist open.",
  },
  {
    path: "/design-system",
    title: "Design System | UnifyOne",
    description:
      "The UnifyOne design system — Cathedral Framework tokens for color, typography, spacing, and radii, plus the full component library used in the product.",
  },
  {
    path: "/login",
    title: "Sign In | UnifyOne",
    description:
      "Sign in to your UnifyOne workspace — multi-tenant commerce, AI earnings insights, and all your connected stores in one place.",
  },
  {
    path: "/register",
    title: "Create Your Account | UnifyOne",
    description:
      "Start free on UnifyOne — the multi-tenant commerce platform for gig operators and e-commerce teams. No credit card required.",
  },
];
