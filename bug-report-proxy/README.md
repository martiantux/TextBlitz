# TextBlitz Bug Report Proxy

This is a simple Vercel serverless function that creates GitHub issues from bug reports submitted via the TextBlitz extension.

## Why this exists

GitHub doesn't allow unauthenticated issue creation. This proxy:
- Handles authentication securely on the server
- Rate-limits requests to prevent spam (5 reports/hour per IP)
- Validates input before submitting to GitHub

## Setup (15 minutes)

### 1. Create a GitHub Personal Access Token

1. Go to https://github.com/settings/tokens/new
2. Name it "TextBlitz Bug Reports"
3. Set expiration to "No expiration" (or your preference)
4. Select scopes:
   - `public_repo` (to create issues in public repos)
5. Click "Generate token"
6. **Copy the token** (you won't see it again)

### 2. Deploy to Vercel

```bash
cd bug-report-proxy
npm install
npx vercel login
npx vercel
```

Follow the prompts:
- Set up and deploy? **Y**
- Which scope? (select your account)
- Link to existing project? **N**
- Project name? **textblitz-bug-reports** (or whatever you want)
- Directory? **./** (current directory)
- Override settings? **N**

### 3. Add GitHub Token to Vercel

```bash
npx vercel env add GITHUB_TOKEN
```

- Paste your GitHub token when prompted
- Select **Production, Preview, Development** (all environments)

### 4. Redeploy with environment variable

```bash
npx vercel --prod
```

Vercel will output your production URL, something like:
```
https://textblitz-bug-reports.vercel.app
```

### 5. Update the extension

Edit `src/ui/popup/popup.ts` and replace:

```typescript
const BUG_REPORT_API_URL = 'https://YOUR_VERCEL_FUNCTION_URL/api/create-issue';
```

with:

```typescript
const BUG_REPORT_API_URL = 'https://textblitz-bug-reports.vercel.app/api/create-issue';
```

Then rebuild the extension:

```bash
npm run build
```

## Testing

You can test the endpoint with curl:

```bash
curl -X POST https://textblitz-bug-reports.vercel.app/api/create-issue \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test bug report",
    "body": "This is a test\n\n## Logs\n\nTest logs here"
  }'
```

If it works, you'll get back:

```json
{
  "success": true,
  "issueNumber": 123,
  "issueUrl": "https://github.com/martiantux/TextBlitz/issues/123"
}
```

## Rate Limiting

- Max 5 bug reports per hour per IP address
- Prevents spam and abuse
- Rate limit window resets after 1 hour

## Security

- GitHub token is stored in Vercel environment variables (encrypted)
- Never exposed to the client
- Rate limiting prevents abuse
- Input validation on title/body length
- CORS not needed (extension makes request from background context)

## Maintenance

- Logs available in Vercel dashboard
- Can adjust rate limits in `api/create-issue.ts`
- Can rotate GitHub token anytime (just update env var in Vercel)

## Cost

Vercel free tier includes:
- 100GB bandwidth/month
- 100,000 function invocations/month

More than enough for bug reports. This should cost $0.
