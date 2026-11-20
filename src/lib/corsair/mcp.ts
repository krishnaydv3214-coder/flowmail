import OpenAI from 'openai';
import { sendEmail, listEmails } from './gmail';
import { createEvent, listEvents, deleteEvent } from './calendar';

const apiKey = process.env.OPENAI_API_KEY;
// Valid OpenAI keys start with 'sk-' — initialize the client when a real key is present
const openai = apiKey && apiKey.startsWith('sk-') ? new OpenAI({ apiKey }) : null;

export interface AgentResponse {
  message: string;
  actionsExecuted: Array<{
    type: 'send_email' | 'schedule_meeting' | 'delete_event';
    details: any;
    status: 'success' | 'failed';
  }>;
}

export async function runAgentChat(
  userId: string,
  userPrompt: string,
  chatHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<AgentResponse> {
  const actionsExecuted: AgentResponse['actionsExecuted'] = [];
  let agentMessage = '';

  // 1. If OpenAI API Key is configured and valid, run LLM-based tool calling
  if (openai) {
    try {
      const messages: any[] = [
        {
          role: 'system',
          content: `You are the FlowMail AI Assistant. You have access to Gmail and Google Calendar tools via Corsair.
When the user wants to perform an action (e.g. send an email or schedule a meeting), use the tools provided.
Always output a helpful, human-friendly summary of what you did.
Current local time is: ${new Date().toISOString()}.
`
        },
        ...chatHistory,
        { role: 'user', content: userPrompt }
      ];

      const tools: any[] = [
        {
          type: 'function',
          function: {
            name: 'send_email',
            description: 'Send an email to a recipient',
            parameters: {
              type: 'object',
              properties: {
                to: { type: 'string', description: 'Recipient email address' },
                subject: { type: 'string', description: 'Subject line' },
                body: { type: 'string', description: 'Email body content' }
              },
              required: ['to', 'subject', 'body']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'schedule_meeting',
            description: 'Schedule a calendar meeting event',
            parameters: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'Title of the meeting' },
                description: { type: 'string', description: 'Description/agenda' },
                startTime: { type: 'string', description: 'Start time in ISO 8601 format' },
                endTime: { type: 'string', description: 'End time in ISO 8601 format' },
                location: { type: 'string', description: 'Location or conference link' },
                attendees: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of email addresses to invite as guests'
                }
              },
              required: ['title', 'startTime', 'endTime']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'delete_event',
            description: 'Delete or cancel a calendar event by title',
            parameters: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'Title of the event to delete (case-insensitive)' }
              },
              required: ['title']
            }
          }
        }
      ];

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        tools,
        tool_choice: 'auto'
      });

      const responseMessage = response.choices[0].message;
      agentMessage = responseMessage.content || '';

      if (responseMessage.tool_calls) {
        for (const toolCall of responseMessage.tool_calls) {
          const tc = toolCall as any;
          const functionName = tc.function.name;
          const functionArgs = JSON.parse(tc.function.arguments);

          if (functionName === 'send_email') {
            try {
              const email = await sendEmail(userId, {
                to: functionArgs.to,
                subject: functionArgs.subject,
                body: functionArgs.body
              });
              actionsExecuted.push({
                type: 'send_email',
                details: { to: functionArgs.to, subject: functionArgs.subject },
                status: 'success'
              });
              agentMessage += `\n\n[Action Completed: Sent email to ${functionArgs.to} with subject "${functionArgs.subject}"]`;
            } catch (err) {
              actionsExecuted.push({
                type: 'send_email',
                details: { to: functionArgs.to },
                status: 'failed'
              });
            }
          } else if (functionName === 'schedule_meeting') {
            try {
              const event = await createEvent(userId, {
                title: functionArgs.title,
                description: functionArgs.description || '',
                startTime: functionArgs.startTime,
                endTime: functionArgs.endTime,
                location: functionArgs.location || 'Google Meet',
                status: 'confirmed',
                attendees: functionArgs.attendees || []
              });
              actionsExecuted.push({
                type: 'schedule_meeting',
                details: { title: functionArgs.title, start: functionArgs.startTime, attendees: functionArgs.attendees },
                status: 'success'
              });
              const guestMsg = functionArgs.attendees && functionArgs.attendees.length > 0
                ? ` and invited ${functionArgs.attendees.join(', ')}`
                : '';
              agentMessage += `\n\n[Action Completed: Scheduled meeting "${functionArgs.title}" for ${new Date(functionArgs.startTime).toLocaleString()}${guestMsg}]`;
            } catch (err) {
              actionsExecuted.push({
                type: 'schedule_meeting',
                details: { title: functionArgs.title },
                status: 'failed'
              });
            }
          } else if (functionName === 'delete_event') {
            try {
              const upcomingEvents = await listEvents(userId);
              const targetTitle = functionArgs.title.toLowerCase();
              const eventToDelete = upcomingEvents.find(ev => ev.title.toLowerCase().includes(targetTitle));

              if (eventToDelete) {
                await deleteEvent(userId, eventToDelete.id);
                actionsExecuted.push({
                  type: 'delete_event',
                  details: { title: eventToDelete.title, id: eventToDelete.id },
                  status: 'success'
                });
                agentMessage += `\n\n[Action Completed: Canceled/Deleted meeting "${eventToDelete.title}"]`;
              } else {
                actionsExecuted.push({
                  type: 'delete_event',
                  details: { title: functionArgs.title },
                  status: 'failed'
                });
                agentMessage += `\n\n[Action Failed: Could not find any meeting titled "${functionArgs.title}" on your calendar]`;
              }
            } catch (err) {
              actionsExecuted.push({
                type: 'delete_event',
                details: { title: functionArgs.title },
                status: 'failed'
              });
            }
          }
        }
      }

      if (!agentMessage) {
        agentMessage = "I've processed your request but no tools were triggered. Let me know how else I can assist you!";
      }

      return { message: agentMessage.trim(), actionsExecuted };
    } catch (error) {
      console.error('OpenAI Agent call failed:', error);
    }
  }

  // 2. Fallback rule-based matching for hackathon demo (if OpenAI Key is missing or invalid)
  const promptLower = userPrompt.toLowerCase();

  if (promptLower.includes('delete') || promptLower.includes('cancel') || promptLower.includes('remove')) {
    try {
      const upcomingEvents = await listEvents(userId);
      // Try to match key terms from the prompt with event titles
      let eventToDelete = null;
      for (const ev of upcomingEvents) {
        if (promptLower.includes(ev.title.toLowerCase())) {
          eventToDelete = ev;
          break;
        }
      }

      // Fallback: match any keyword
      if (!eventToDelete) {
        const keywords = promptLower.split(/\s+/);
        for (const ev of upcomingEvents) {
          const titleLower = ev.title.toLowerCase();
          if (keywords.some(kw => kw.length > 3 && titleLower.includes(kw))) {
            eventToDelete = ev;
            break;
          }
        }
      }

      if (eventToDelete) {
        await deleteEvent(userId, eventToDelete.id);
        actionsExecuted.push({
          type: 'delete_event',
          details: { title: eventToDelete.title },
          status: 'success'
        });
        agentMessage = `I've successfully deleted the event **"${eventToDelete.title}"** from your calendar.`;
      } else {
        agentMessage = `I couldn't find a matching event on your calendar to delete. Try specifying the exact name of the event.`;
      }
    } catch (err) {
      actionsExecuted.push({ type: 'delete_event', details: {}, status: 'failed' });
      agentMessage = `Failed to delete event. Please check your Corsair connection.`;
    }
  } else if (promptLower.includes('email') || promptLower.includes('send to') || promptLower.includes('reply')) {
    // Attempt to parse email details
    const emailTo = promptLower.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/)?.[0] || 'john.doe@example.com';
    const subject = promptLower.includes('reply') ? 'Re: Project Migration' : 'Follow up from standup';
    const body = 'Hi,\n\nFollowing up on our recent chat to make sure everything is aligned. Let me know if you need anything else!\n\nBest,\nUser';

    try {
      await sendEmail(userId, { to: emailTo, subject, body });
      actionsExecuted.push({
        type: 'send_email',
        details: { to: emailTo, subject },
        status: 'success'
      });
      agentMessage = `I've sent an email to **${emailTo}** with the subject *"${subject}"* using your connected Corsair Gmail account.`;
    } catch (err) {
      actionsExecuted.push({ type: 'send_email', details: { to: emailTo }, status: 'failed' });
      agentMessage = `Failed to send email to ${emailTo}. Please check your Corsair credentials.`;
    }
  } else if (promptLower.includes('schedule') || promptLower.includes('meeting') || promptLower.includes('calendar') || promptLower.includes('call') || promptLower.includes('invite')) {
    // Attempt to parse calendar details
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(15, 0, 0, 0); // 3 PM tomorrow
    const end = new Date(tomorrow);
    end.setHours(16, 0, 0, 0); // 4 PM

    const title = promptLower.includes('call') ? 'Follow-up Call' : 'Project Sync';
    const description = 'Scheduled via FlowMail AI Assistant.';

    // Extract any email addresses from the prompt to invite them as guests
    const attendeesMatch = userPrompt.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g);
    const attendees = attendeesMatch ? Array.from(new Set(attendeesMatch)) : [];

    try {
      await createEvent(userId, {
        title,
        description,
        startTime: tomorrow.toISOString(),
        endTime: end.toISOString(),
        status: 'confirmed',
        location: 'Google Meet',
        attendees
      });
      actionsExecuted.push({
        type: 'schedule_meeting',
        details: { title, start: tomorrow.toISOString(), attendees },
        status: 'success'
      });
      const guestMsg = attendees.length > 0 ? ` and sent calendar invites to **${attendees.join(', ')}**` : '';
      agentMessage = `I've scheduled a new meeting: **${title}** on **${tomorrow.toLocaleDateString()} at ${tomorrow.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}**${guestMsg} via Corsair Google Calendar.`;
    } catch (err) {
      actionsExecuted.push({ type: 'schedule_meeting', details: { title }, status: 'failed' });
      agentMessage = `Failed to create calendar event. Please check your Corsair credentials.`;
    }
  } else {
    // Friendly chat helper fallback
    agentMessage = `Hello! I am your FlowMail AI Agent. I can help you orchestrate your workspace using Corsair. Try saying:
- *"Send an email to sarah.ux@design.io saying standup is at 9:30"*
- *"Schedule a sync meeting tomorrow at 3 PM and invite alex@startup.co"*
- *"Cancel the daily standup sync"*
- *"Remove AlgoZenith Class from calendar"*`;
  }

  return { message: agentMessage, actionsExecuted };
}
