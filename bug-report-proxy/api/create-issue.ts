// Vercel Serverless Function for creating GitHub issues from bug reports
// Deploy this to Vercel and update BUG_REPORT_API_URL in src/ui/popup/popup.ts

import { Octokit } from '@octokit/rest';

// Rate limiting: Store IPs and their request counts
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const MAX_REQUESTS_PER_HOUR = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

interface BugReportRequest {
  title: string;
  body: string;
}

export default async function handler(req: any, res: any) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get client IP for rate limiting
  const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  // Check rate limit
  const now = Date.now();
  const rateLimit = rateLimitMap.get(clientIP);

  if (rateLimit) {
    if (now < rateLimit.resetTime) {
      if (rateLimit.count >= MAX_REQUESTS_PER_HOUR) {
        return res.status(429).json({
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((rateLimit.resetTime - now) / 1000 / 60) // minutes
        });
      }
      rateLimit.count++;
    } else {
      // Reset window
      rateLimitMap.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    }
  } else {
    rateLimitMap.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
  }

  // Validate request body
  const { title, body }: BugReportRequest = req.body;

  if (!title || !body) {
    return res.status(400).json({ error: 'Missing title or body' });
  }

  if (title.length > 200 || body.length > 50000) {
    return res.status(400).json({ error: 'Title or body too long' });
  }

  try {
    // Initialize Octokit with GitHub PAT from environment variable
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN
    });

    // Create GitHub issue
    const response = await octokit.rest.issues.create({
      owner: 'martiantux', // Your GitHub username
      repo: 'TextBlitz',   // Your repo name
      title,
      body,
      labels: ['bug', 'user-reported'] // Automatic labels
    });

    // Return success with issue number
    return res.status(200).json({
      success: true,
      issueNumber: response.data.number,
      issueUrl: response.data.html_url
    });

  } catch (error: any) {
    console.error('Failed to create GitHub issue:', error);

    // Don't expose internal error details to client
    return res.status(500).json({
      error: 'Failed to create issue. Please try again or report directly on GitHub.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
