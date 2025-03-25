import { Devvit } from '@devvit/public-api';
import axios from 'axios';

// Perspective API configuration
const PERSPECTIVE_API_KEY = 'AIzaSyAop4DmntFZIkTYStw7mw7D7bVlnaDHVEQ'; // Replace with your actual API key
const PERSPECTIVE_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=GEMINI_API_KEY" ;

// Toxicity thresholds (adjustable)
const TOXICITY_THRESHOLDS = {
  TOXICITY: 0.7,
  SEVERE_TOXICITY: 0.6,
  THREAT: 0.5,
  INSULT: 0.6,
  PROFANITY: 0.7,
  IDENTITY_ATTACK: 0.6
};

// Interface for Perspective API response
interface PerspectiveResponse {
  attributeScores: {
    TOXICITY?: { summaryScore: { value: number } };
    SEVERE_TOXICITY?: { summaryScore: { value: number } };
    THREAT?: { summaryScore: { value: number } };
    INSULT?: { summaryScore: { value: number } };
    PROFANITY?: { summaryScore: { value: number } };
    IDENTITY_ATTACK?: { summaryScore: { value: number } };
  };
}

// Function to check comment toxicity
async function checkCommentToxicity(comment: string): Promise<boolean> {
  try {
    const response = await axios.post(
      `${PERSPECTIVE_API_URL}?key=${PERSPECTIVE_API_KEY}`,
      {
        comment: { text: comment },
        requestedAttributes: {
          TOXICITY: {},
          SEVERE_TOXICITY: {},
          THREAT: {},
          INSULT: {},
          PROFANITY: {},
          IDENTITY_ATTACK: {}
        },
        languages: ['en']
      }
    );

    const perspectiveData = response.data as PerspectiveResponse;
    const scores = perspectiveData.attributeScores;

    // Check if any toxicity attribute exceeds its threshold
    return Object.entries(TOXICITY_THRESHOLDS).some(([attribute, threshold]) => {
      const score = scores[attribute as keyof typeof scores]?.summaryScore.value || 0;
      return score >= threshold;
    });
  } catch (error) {
    console.error('Error checking comment toxicity:', error);
    return false;
  }
}

// Devvit app configuration
Devvit.configure({
  name: 'Toxicity Moderator',
  modules: [
    Devvit.redditAPI,
    Devvit.httpClient
  ]
});

// Trigger for new comments
Devvit.addTrigger({
  event: 'CommentSubmit',
  handler: async (event, context) => {
    const { comment } = event;

    try {
      // Check comment toxicity
      const isToxic = await checkCommentToxicity(comment.body);

      if (isToxic) {
        // Remove toxic comment
        await context.reddit.removeComment(comment.id);

        // Optional: Send a moderation log or notification
        await context.reddit.sendModmail({
          subredditName: comment.subreddit.name,
          subject: 'Toxic Comment Removed',
          body: `A toxic comment by u/${comment.author.name} was automatically removed from r/${comment.subreddit.name}.`
        });
      }
    } catch (error) {
      console.error('Error processing comment:', error);
    }
  }
});

export default Devvit.app;