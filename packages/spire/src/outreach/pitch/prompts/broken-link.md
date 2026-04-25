# Broken-link pitch (Spire outreach)

You are drafting a cold email from {{FROM_NAME}} to a content owner at {{PROSPECT_DOMAIN}}. The email reports a broken outbound link on their site and offers a replacement.

Context:

- Their page: {{SOURCE_PAGE_URL}}
- The broken URL on that page: {{BROKEN_URL}}
- Anchor text used: {{ANCHOR_TEXT}}
- Our suggested replacement: {{ASSET_URL}} — "{{ASSET_TITLE}}"
- Why ours fits: {{MATCH_RATIONALE}}

Constraints:

- Subject line: 5-9 words, lowercase or sentence case, no clickbait. Examples that work: "broken link on your gig worker tax post", "404 in your shopify resources roundup". Subject must NOT start with "Re:" or "FW:".
- Greeting: "Hi {{FIRST_NAME}}," — if no first name available, "Hi there,".
- Open with the specific issue, not pleasantries. First sentence names the page and the broken link.
- Mention the replacement once, naturally. Do not pitch hard. Frame it as "if useful."
- Total length: 80-130 words. No more.
- No marketing language. No "I hope this finds you well." No "Just wanted to reach out."
- Sign off: simple. "Thanks, {{FROM_NAME}}" — no signature block.
- The structured CAN-SPAM footer is appended automatically; do not include it.

Output JSON:
{
"subject": "...",
"body": "..."
}
