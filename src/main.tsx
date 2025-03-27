import { Devvit } from '@devvit/public-api';
import axios from 'axios';

// Replace with your actual Gemini API Key
const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// Function to check comment toxicity using Gemini API
async function checkCommentToxicity(comment: string): Promise<boolean> {
  try {
    const response = await axios.post(GEMINI_API_URL, {
      contents: [
        {
          parts: [
            {
              text: `Analyze this comment and return only "yes" if it contains toxic language, otherwise return "no". Comment: "${comment}"`
            }
          ]
        }
      ]
    });

    const resultText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.toLowerCase();

    return resultText?.includes('yes');
  } catch (error) {
    console.error('Error checking comment toxicity:', error);
    return false;
  }
}

// Devvit app configuration
Devvit.configure({
  redditAPI: true
});

// ✅ Corrected Event Trigger
Devvit.addTrigger({
  event: 'CommentSubmit',
  onEvent: async ({ comment }) => {
    try {
      if (!comment) {
        console.error("Error: Comment object is undefined.");
        return;
      }

      const isToxic = await checkCommentToxicity(comment.body);

      if (isToxic) {
        // ✅ Correct method to remove a comment
        await comment.remove();

        // ✅ Correct method to add a moderator note (since modmail isn't available)
        await comment.subreddit.modNotes.create({
          user: comment.author,
          note: `Toxic comment removed: "${comment.body}"`
        });

        console.log(`Removed toxic comment: ${comment.body}`);
      }
    } catch (error) {
      console.error('Error processing comment:', error);
    }
  }
});

// Export the app
export default Devvit;
