## Problem Statement:

Group plans die in the group chat. Google Calendar is great at storing confirmed events, but it does nothing to help groups get confirmed plans. People bounce between When2meet links, iMessage polls and Calendly, then someone has to create the invite by hand. Meanwhile, tentative ‘TBD’ holds clutter calendars with no way to resolve them 

## Feature flow

- **Create a plan:** Type it in plain language: “dinner w/ the squad sometime next week after 6, \~2 hrs.” An LLM (Grok) turns that into a duration, a date window, attendees and preferences.  
  - or maybe just same UI as making and event  
- **Auto-suggest times:** Read everyone’s busy blocks from Google Calendar and rank the top 3–5 slots **(customizable)**. People who aren’t on Google Calendar can mark their availability When2meet-style through a link. **(fallback idea)**  
- **One-tap voting:** Each option gets Yes / If needed / No **(or not an option)**, with no account required.  
- **Soft holds.** Every option shows up on each person’s calendar as a ghost event, like “Pending: Squad dinner (1 of 3),” so nobody double-books a slot that’s still in play.  
- **Nudges and auto-lock.** Non-voters get automatic reminders. The plan locks when a majority **(or more)** votes (e.g., 4 of 5\) or a deadline hits.  
- **Finalize.** The winning slot becomes a real event with invites and a Meet link, and the other holds disappear. If someone drops out later, the plan reopens with the runner-up times.  
- **other ideas to consider (RSVP options once the finalized date is set and if a certain amount dont rsvp → notification or revote)**

## ICP: 

- **Student orgs**: Members are on different calendars and busy class schedules, so the app finds times that work for everyone and locks in meetings without someone chasing replies in Slack, GroupMe, iMessage.   
- **Professionals**: It cuts out the back-and-forth emails and switching between apps by suggesting open times from everyone’s calendars, holding them, and booking the winner automatically  
- **Friend groups:** turns “we should hang out sometime” into an actual plan, with one-tap voting and nudges so it doesn’t fizzle in the group chat. 

## User Research

- **Survey (20–40 responses):** How many messages does it take to lock in a plan? What % of “we should hang out” plans never happen? Which tools do you use? Who usually ends up creating the invite?  
- **5 interviews** with org officers, who schedule the most.  
- Pull 1–2 numbers for the problem slide, e.g., “X% of respondents had a plan fall through last month because nobody locked a time.”

## Competitor Comparison

| App | Reads calendars | Group voting | Auto-creates event | Holds/nudges | Works across calendar apps |
| :---- | :---- | :---- | :---- | :---- | :---- |
| When2meet | ✗ | sort of (heatmap) | ✗ | ✗ | ✓ |
| Doodle | paid tiers | ✓ | partly | reminders | ✓ |
| Calendly | ✓ | built for 1:1 or 1-to-many | ✓ | ✗ | ✓ |
| GCal “Find a time” | ✓ (mainly within orgs) | ✗ | ✓ | ✗ | ✗ |
| Yours | ✓ | ✓ | ✓ | ✓ | ✓ |

## Goals \+ Metrics

- Plan completion rate (% of plans that become real events)  
- Vote response rate in the first 24 hours (shows the nudges work)  
- Number of manual steps vs. today. Count the clicks and messages for When2meet \+ group chat \+ manual invite, and compare to yours. This makes a great slide.  
- Growth: % of non-user voters who later create their own plan

