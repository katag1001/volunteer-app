I want to build a volunteer organiser web app.   
Let’s discuss each of these features as a point and get a really thorough understanding of how each works in order to build a prd. 

1. Admin/adding people   
   

There needs to one admin who approves any new user who wants to get added to the system before they come through. If they aren’t approved within one week, the object is deleted from mongo. The admin should just be set up already in the system \- I think I want to just put the admin email into the env file. Not really sure how the admin can set up their password so this needs to be discussed. 

A user needs to verify their email when they sign up \- this should be set up just with gmail and a password in the env file to connect the email that will send out the confirm user email.  

A user should be able to delete their own profile. The admin should also be able to delete anyone’s profile. 

2. What the admin can see

The admin needs an extra page to be able to see approvals and disapprovals \- this should only be viewable by the admin and not available to others. I want to be the first admin, but then an admin can set up an admin by changing the position on all users. They should just be able to flick a switch and then that person has full admin permissions. 

3. User Profile

A user should have two schemas for them \- one just for their email, first-name, last-name and password and the other for their full details with a user id connected to the other schema.  

The full details section should have 

- A record of how long they’ve been a volunteer (timestamped from when they sign up)  
- A space for a profile picture \- I want to add a few fun images that they can select from, which will already be in assets, or upload their own photo. I think I want to use cloudinary for the image storage. To be discussed \- this needs to be put in the backend I think. The other images to be chosen for the employees should be stored locally.   
- What their skills are. This should be selected from a list or preset skills but users can also add other to include free-text field.    
- Their role at Cherry category \- this is not entirely the same as the above, but when a user is filling in their detail, should be pre-filled depending on the above from an exact mapping that I will include. There is no free text field here. Let’s talk about creating that mapping. This is mandatory.   
- Their email and slack link \- they should have a toggle on and off for this to be viewable by anyone.   
- An optional free text field capped at 100 words or however many characters that contains so that other users can see what you can reach out to that person about.   
- Their last login timestamp should be stored as well and a marker of how recently they were online. It shouldn’t show exactly when they last logged in, but it should just say recent login if a user has been online in the last 3 days.    
- There is also a field that can be added by the admin that refers to them as a ‘key player’


When a user creates a profile, they should be prompted to fill in the details they need to give themselves \- they can go to their profile and edit whenever though. 

4. User profiles are viewable by anyone.   
   

I want an area for all users to explore all other users. At the top, it should have a selectable filter to show ‘key-players’ only as a button. Under that it should have buttons to select all the teams and it will filter users by that team. 

In the main part of the page, it will show the user image

When you select a user, it will show  

An 

issue starts as In Progress, people can discuss it through decisions/polls, tasks are created and assigned, and once every task is resolved the issue automatically becomes Done.

## 1\. Core model

I would keep the first version to these entities:

User  
Team

Project  
ProjectMember  
ProjectTeam

Issue  
IssueMember

Task  
TaskLink

Poll  
PollOption  
PollVote

There is deliberately no separate discussion/comment system in v1.

The system is about turning problems into decisions and actionable work rather than creating another message board.

---

# 2\. Project

A project is the top-level container.

### Project

id  
title  
description

created\_by  
created\_at  
updated\_at

The creator automatically becomes the Project Lead.

The lead is a property of the project membership, rather than a general user role.

### ProjectMember

project\_id  
user\_id  
role  
joined\_at

For v1:

role:  
  lead  
  member

There should be exactly one lead per project.

Everyone else is simply a member.

For example:

Project: Community Garden

Sarah   → lead  
James   → member  
Helen   → member  
Tom     → member

This is preferable to having lead\_user\_id on the project because the membership itself then describes the person's relationship to the project.

---

# 3\. Teams

You mentioned teams that need to be involved.

Keep this extremely simple:

### ProjectTeam

project\_id  
team\_id

So:

Community Garden  
├── Events Team  
├── Fundraising Team  
└── Volunteer Team

You don't need to complicate this with team roles yet.

---

# 4\. Issues

An issue belongs to exactly one project.

### Issue

id  
project\_id

title  
description

created\_by  
created\_at  
updated\_at

status

The status is:

in\_progress  
done

No not\_started state for issues.

When someone creates an issue, it immediately becomes:

In Progress

That matches what you've described and makes the model simpler.

---

# 5\. People associated with an issue

An issue can have multiple people involved.

### IssueMember

issue\_id  
user\_id  
added\_at

So you could have:

Project  
  15 people

Issue: Venue  
  Sarah  
  James  
  Tom

Someone being associated with the project doesn't automatically mean they're associated with every issue.

I'd have the issue creator automatically added to the issue's members.

The UI could then allow:

Add people  
---

# 6\. An important assignment rule

Here's the distinction I'd make:

### Issue membership

Multiple people can be involved.

Issue  
├── Sarah  
├── James  
└── Tom

### Task assignment

Exactly one person owns a task.

Task: Contact venue  
Assigned to: Sarah

The task doesn't need multiple assignees.

This is important because it answers:

Who is responsible for actually doing this?

with one unambiguous answer.

---

# 7\. Task creation and assignment

A task has:

id  
issue\_id

name  
description

assigned\_to  
status

created\_by  
created\_at  
updated\_at

resolved\_at  
resolved\_by  
resolution

I would make assigned\_to nullable initially.

So a task can exist as:

Contact venue  
Not assigned

Then someone chooses:

### Assign

Assign to me  
Assign to someone else

If they choose Assign to me:

assigned\_to \= current\_user

If they choose Assign to someone else:

Select person

and then:

assigned\_to \= selected\_user

Based on your clarification, I would allow any project member to be selected as the assignee.

That means someone doesn't necessarily have to already be an IssueMember to be assigned a task.

For example:

Project members:  
Sarah  
James  
Helen  
Tom

Issue members:  
Sarah  
James

Task:  
"Create social media graphics"

Assigned to:  
Helen

That's perfectly valid.

The act of assigning the task doesn't necessarily need to add Helen to the issue.

---

# 8\. Task status

Exactly the three stages you originally described:

Not assigned  
In progress  
Done

But I'd actually separate assignment from status in the database.

So:

assigned\_to \= null  
status \= not\_started

rather than treating "not assigned" as a task status.

The UI can display:

Not assigned

when assigned\_to is empty.

Then:

assigned\_to \= Sarah  
status \= not\_started

displays:

Sarah · Not started

This distinction will save you problems later.

### Database status

not\_started  
in\_progress  
done

### Assignment

assigned\_to

Two separate concepts.

---

# 9\. Resolving a task

This is one of the strongest parts of your idea, and I'd make it mandatory.

When someone clicks:

Resolve task

don't immediately mark it done.

Open a small resolution form:

Resolve task

Task:  
Contact the community centre

What was resolved?  
┌────────────────────────────────────────┐  
│                                        │  
│                                        │  
└────────────────────────────────────────┘

                    \[Cancel\] \[Resolve\]

The resolution text is mandatory.

When they submit:

status \= done  
resolution \= "Community centre confirmed the booking..."  
resolved\_by \= current\_user  
resolved\_at \= timestamp

This gives you a useful record of what actually happened.

---

# 10\. Resolution should be immutable-ish

For v1, I'd treat the resolution as the historical record of completing the task.

So once resolved:

Task  
────────────────────  
✓ Contact venue

Assigned to  
Sarah

Resolved by  
Sarah

Resolved  
14 September 2026

Resolution  
Community centre confirmed availability for 23 September...

You can have an Edit/Reopen capability later, but I wouldn't complicate the first version.

---

# 11\. Task links

A task can have multiple external links.

### TaskLink

id  
task\_id

title  
url

created\_by  
created\_at

For example:

Task: Prepare volunteer registration

Links  
──────────────  
Google Form  
https://...

Previous registration  
https://...

Volunteer guidelines  
https://...

The user clicks:

\+ Add link

and enters:

Link name  
URL

That's enough for v1.

---

# 12\. Issue status logic

This should be automatic.

You don't want users manually changing issue status.

The rules become:

### Newly created issue

In Progress

### Issue has unfinished tasks

In Progress

### Every task is done

Done

So:

Issue  
│  
├── Task A ✓ Done  
├── Task B ✓ Done  
└── Task C ● In progress

          ↓

Issue \= IN PROGRESS

And:

Issue  
│  
├── Task A ✓ Done  
├── Task B ✓ Done  
└── Task C ✓ Done

          ↓

Issue \= DONE

---

# 13\. What about an issue with no tasks?

I'd keep it:

In Progress

This is particularly important because an issue without tasks clearly hasn't been resolved.

So:

New issue  
   ↓  
In Progress  
   ↓  
Tasks created  
   ↓  
Tasks completed  
   ↓  
Done

That gives you a very simple lifecycle.

---

# 14\. Polls / decisions

I'd keep polls directly attached to an issue.

### Poll

id  
issue\_id

question  
created\_by  
created\_at

closed\_at

### PollOption

id  
poll\_id  
label

### PollVote

poll\_id  
option\_id  
user\_id

So:

Issue: Which venue should we use?

Poll:  
"Which venue should we book?"

○ Community Centre  
○ Town Hall  
○ Sports Centre

\[Vote\]

I'd make the poll creator able to close the poll.

Once closed:

Poll closed

Community Centre     8 votes  
Town Hall             3 votes  
Sports Centre         1 vote

Result: Community Centre

The important thing is that polls don't directly resolve issues.

They help people make a decision.

The actual resolution comes through the tasks.

---

# 15\. The resulting workflow

This gives the whole system a very natural flow:

                  PROJECT  
                      │  
                      ▼  
                   ISSUE  
                      │  
            ┌─────────┴─────────┐  
            │                   │  
         POLLS               PEOPLE  
            │  
            ▼  
        DECISION  
            │  
            ▼  
          TASKS  
            │  
      ┌─────┴─────┐  
      │           │  
   ASSIGNED    ASSIGNED  
      │           │  
      ▼           ▼  
    PERSON      PERSON  
      │  
      ▼  
   IN PROGRESS  
      │  
      ▼  
    RESOLVE  
      │  
      ▼  
  RESOLUTION  
      │  
      ▼  
     DONE

That's the core product.

---

# 16\. Project page

I think the project page should be very simple.

### Header

┌───────────────────────────────────────────────┐  
│ Community Garden                              │  
│                                               │  
│ Organising the development of the community   │  
│ garden for local residents.                   │  
│                                               │  
│ Lead: Sarah                                   │  
│ 12 people · 3 teams                           │  
└───────────────────────────────────────────────┘

Then:

Issues                                      \[+ Add issue\]

And a list.

---

# 17\. Issue cards

Collapsed:

┌───────────────────────────────────────────────┐  
│ ● Venue hasn't been confirmed                 │  
│   In progress                    2 of 4 tasks │  
│                                               │  
│   3 people                                    │  
└───────────────────────────────────────────────┘

Completed:

┌───────────────────────────────────────────────┐  
│ ✓ Social media campaign                      │  
│   Done                             4 of 4     │  
└───────────────────────────────────────────────┘

Clicking the card expands it.

---

# 18\. Expanded issue

I'd structure it like this:

┌────────────────────────────────────────────────┐  
│ ● Venue hasn't been confirmed                  │  
│                                                │  
│ DESCRIPTION                                   │  
│ The venue hasn't confirmed whether they can    │  
│ accommodate the event on the proposed date.   │  
│                                                │  
│ PEOPLE                                         │  
│ Sarah · James · Tom                            │  
│ \[+ Add person\]                                 │  
│                                                │  
│ DECISIONS                                      │  
│ ─────────────────────────────────────────────  │  
│ Which venue should we use?                     │  
│                                                │  
│ Community Centre          8 votes              │  
│ Town Hall                3 votes              │  
│                                                │  
│ TASKS                              2 / 4 done   │  
│ ─────────────────────────────────────────────  │  
│ ✓ Contact community centre                     │  
│   Sarah · Done                                 │  
│                                                │  
│ ✓ Check availability                           │  
│   James · Done                                 │  
│                                                │  
│ ● Negotiate price                              │  
│   Tom · In progress                            │  
│                                                │  
│ ○ Confirm booking                              │  
│   Not assigned                                 │  
│                                                │  
│ \[+ Add task\]                                   │  
└────────────────────────────────────────────────┘

This is probably the main screen of your application.

---

# 19\. Task interaction

Clicking a task should expand it rather than opening an entirely separate page initially.

For example:

● Negotiate price  
  Tom · In progress

  DESCRIPTION  
  Ask whether the venue can offer a charity discount.

  LINKS  
  ↗ Venue pricing  
  ↗ Previous agreement

  \[Resolve\]

Click Resolve:

┌───────────────────────────────────────┐  
│ Resolve task                           │  
│                                       │  
│ What was resolved?                    │  
│ ┌───────────────────────────────────┐ │  
│ │ Venue agreed to reduce the price  │ │  
│ │ by 20% for the charity event.    │ │  
│ └───────────────────────────────────┘ │  
│                                       │  
│            \[Cancel\] \[Resolve task\]    │  
└───────────────────────────────────────┘

Then:

✓ Negotiate price  
  Tom · Done

  Resolved by Tom  
  14 September

  "Venue agreed to reduce the price..."

---

# 20\. Adding an issue

The add issue flow should be tiny.

Add issue

Title  
\[\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\]

Description  
\[\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\]  
\[\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\]

\[Cancel\] \[Create issue\]

On creation:

Issue.status \= in\_progress  
Issue.created\_by \= current user  
IssueMember \= current user

Then it immediately appears on the project.

No unnecessary configuration.

---

# 21\. Adding a task

Likewise:

Add task

Task name  
\[\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\]

Description  
\[\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\]

Assigned to  
\[Not assigned ▼\]

Links  
\[+ Add link\]

\[Cancel\] \[Add task\]

Assignment menu:

Assign to  
──────────────  
○ Not assigned  
○ Assign to me  
──────────────  
○ Sarah  
○ James  
○ Helen  
○ Tom

If the current user chooses "Assign to me", that's one click.

If they choose someone else, they select a project member.

---

# 22\. Permissions

For the lightweight version, I'd keep permissions extremely simple.

### Project

Anyone can:

* Create a project  
* View a project they're allowed to access  
* Add themselves / be added as a member  
* Add issues  
* Add people  
* Create tasks  
* Assign tasks  
* Create polls

### Project lead

In addition:

* Manage project members  
* Manage project teams  
* Assign tasks to other people  
* Potentially archive/delete the project

### Issue

Anyone associated with the project can:

* Create an issue  
* Add tasks  
* Add people  
* Create polls  
* Vote  
* Assign tasks

Anyone associated with the issue can do the same.

I'd avoid creating a complicated permission hierarchy for v1.

---

# 23\. One thing I'd make explicit in the UI

Because you have both Project Members and Issue Members, make the distinction visible.

At project level:

People involved in this project

At issue level:

People involved in this issue

And when assigning a task:

Assign to any project member

That makes the relationship clear.

---

# 24\. Database relationship summary

The relational structure I'd start implementing is:

users  
─────  
id  
name  
...

teams  
─────  
id  
name  
...

projects  
────────  
id  
title  
description  
created\_by  
created\_at  
updated\_at

project\_members  
───────────────  
project\_id  
user\_id  
role  
created\_at

project\_teams  
─────────────  
project\_id  
team\_id

issues  
──────  
id  
project\_id  
title  
description  
created\_by  
status  
created\_at  
updated\_at

issue\_members  
─────────────  
issue\_id  
user\_id  
created\_at

tasks  
─────  
id  
issue\_id  
name  
description  
assigned\_to  
status  
created\_by  
resolution  
resolved\_by  
resolved\_at  
created\_at  
updated\_at

task\_links  
──────────  
id  
task\_id  
title  
url  
created\_by  
created\_at

polls  
─────  
id  
issue\_id  
question  
created\_by  
created\_at  
closed\_at

poll\_options  
────────────  
id  
poll\_id  
label

poll\_votes  
──────────  
poll\_id  
option\_id  
user\_id  
created\_at

---

# 25\. A couple of constraints I'd enforce at database level

These are worth thinking about now rather than relying entirely on frontend validation.

### Project

project\_members:  
(project\_id, user\_id) UNIQUE

A person can't be added to the same project twice.

### Issue

issue\_members:  
(issue\_id, user\_id) UNIQUE

Same principle.

### Poll

poll\_votes:  
(poll\_id, user\_id) UNIQUE

Assuming one vote per person.

### Task

assigned\_to → users.id

Only one value.

And ideally validate that the assignee is a member of the project containing that issue.

---

# 26\. The important derived rule

I would make issue status a derived value, even if you store it in the database for convenience.

Conceptually:

calculateIssueStatus(issue):

    if issue.tasks.length \== 0:  
        return "in\_progress"

    if every task.status \== "done":  
        return "done"

    return "in\_progress"

So you never get a situation like:

Issue: Done

Tasks:  
✓ Done  
● In progress

The issue can never contradict its tasks.

When the final task is resolved, the backend updates/recalculates the issue automatically.

---

# 27\. What I would deliberately leave out of v1

This is important because your instinct is right: don't turn this into Asana/Jira/Trello.

I'd leave out:

* Comments  
* Chat  
* Activity feeds  
* Task priorities  
* Task labels  
* Task dependencies  
* Subtasks  
* Recurring tasks  
* Complex permissions  
* Notifications  
* File attachments  
* Time tracking  
* Kanban boards  
* Calendars  
* Gantt charts  
* Project milestones  
* Complex project statuses  
* Multiple task assignees

You can add these later if the actual charity workflow demonstrates a need for them.

---

# 28\. The v1 product in one picture

I'd ultimately aim for this:

PROJECT  
────────────────────────────────────────────

Title  
Description

Lead: Sarah  
People: 12  
Teams: 3

ISSUES                              \[+ Add issue\]  
────────────────────────────────────────────

┌────────────────────────────────────────────┐  
│ ● Venue hasn't been confirmed              │  
│   In progress                     2 / 4    │  
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐  
│ ● Volunteer registration                   │  
│   In progress                     1 / 3    │  
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐  
│ ✓ Social media campaign                   │  
│   Done                            4 / 4    │  
└────────────────────────────────────────────┘

Then each issue expands into:

ISSUE  
│  
├── Description  
│  
├── People  
│  
├── Decisions / Polls  
│  
└── Tasks  
      │  
      ├── Name  
      ├── Description  
      ├── Assigned person  
      ├── Links  
      ├── Status  
      └── Resolution  


Styling
reflect the style of this website: https://cherry.org.uk/ 
Put everything on the page in a neat and organised way. 