import type { Difficulty, TopicCategory } from "@/generated/prisma/enums";

export type SeedTopic = { text: string; category: TopicCategory; difficulty: Difficulty };

type Bank = Record<TopicCategory, Record<Difficulty, string[]>>;

/**
 * Curated impromptu-speaking prompts. Seeded into the Topic table
 * (prisma/seed.ts). Keep each prompt answerable in 30 seconds to 10 minutes.
 */
const BANK: Bank = {
  EVERYDAY_LIFE: {
    EASY: [
      "Describe your perfect weekend morning.",
      "What's a small habit that makes your day better?",
      "Talk about your favourite meal and why you love it.",
      "Describe the best place you've ever lived.",
      "What's something you always carry with you, and why?",
    ],
    MEDIUM: [
      "Is it better to plan your day in detail or go with the flow?",
      "What everyday invention would you struggle most to live without?",
      "Should people cook at home more often? Make your case.",
      "What's an underrated skill everyone should learn?",
      "How has your daily routine changed in the last five years?",
    ],
    HARD: [
      "Convince us that boredom is valuable.",
      "What does a 'good life' look like, and who gets to define it?",
      "Argue for or against a four-day school or work week.",
      "Explain how one ordinary object shaped modern life.",
    ],
  },
  BUSINESS: {
    EASY: [
      "Describe a business you admire and why.",
      "What makes great customer service?",
      "If you started a small business tomorrow, what would it be?",
      "Talk about a product you'd happily recommend to anyone.",
    ],
    MEDIUM: [
      "Should companies prioritise profit or purpose?",
      "What's the biggest mistake new managers make?",
      "Pitch a way to make meetings shorter and more useful.",
      "Is remote work better for companies or just for employees?",
      "How should a company respond to a public mistake?",
    ],
    HARD: [
      "Your startup has three months of cash left. Explain your plan to the team.",
      "Defend a decision to raise prices by 20% to your biggest customer.",
      "Should businesses be responsible for their suppliers' ethics?",
      "Explain why a well-known company failed and what it teaches us.",
    ],
  },
  TECHNOLOGY: {
    EASY: [
      "Which app do you use most, and what would you improve about it?",
      "Describe a piece of technology that made your life easier.",
      "What's the first gadget you remember being excited about?",
      "Explain the internet to someone from 100 years ago.",
    ],
    MEDIUM: [
      "Should children have smartphones before age 13?",
      "Will AI create more jobs than it replaces?",
      "Is social media more connecting or isolating?",
      "What technology will feel outdated in ten years?",
      "Should people be able to delete their data from the internet?",
    ],
    HARD: [
      "Who should be responsible when an AI system makes a harmful decision?",
      "Argue for or against a global pause on a new technology.",
      "Explain a complex technology you use daily in plain language.",
      "Is privacy still possible in a connected world?",
    ],
  },
  LEADERSHIP: {
    EASY: [
      "Describe the best leader you've worked or studied with.",
      "What's one quality every good leader needs?",
      "Tell us about a time you took the lead without being asked.",
      "How do you motivate yourself on a hard day?",
    ],
    MEDIUM: [
      "Are leaders born or made?",
      "How should a leader handle a team member who keeps missing deadlines?",
      "Is it better to be liked or respected as a leader?",
      "How do you build trust with a new team?",
      "What should a leader do when they make a mistake publicly?",
    ],
    HARD: [
      "Announce a difficult change to your team and keep morale high.",
      "Your two best team members are in conflict. Address them both.",
      "Make the case for a decision you know will be unpopular.",
      "What does leadership look like when you have no formal authority?",
    ],
  },
  SCHOOL: {
    EASY: [
      "Talk about a teacher who made a difference for you.",
      "What was your favourite subject, and why?",
      "Describe a school project you're proud of.",
      "What should every student learn before graduating?",
    ],
    MEDIUM: [
      "Should homework be abolished?",
      "Are exams a fair way to measure learning?",
      "Should schools teach personal finance?",
      "What's the purpose of education?",
      "Should university be free?",
    ],
    HARD: [
      "Redesign the school day from scratch. Explain your choices.",
      "Argue that failure should be part of the grading system.",
      "Is a degree still worth it? Defend your view to a sceptic.",
      "How should schools prepare students for jobs that don't exist yet?",
    ],
  },
  DEBATE: {
    EASY: [
      "Cats or dogs: which make better companions?",
      "Is breakfast the most important meal of the day?",
      "Books or movies: which tell better stories?",
      "Summer or winter: which season is better?",
    ],
    MEDIUM: [
      "Should voting be mandatory?",
      "Is it ever okay to lie?",
      "Should professional athletes be paid less?",
      "Should cities ban cars from their centres?",
      "Do celebrities have a responsibility to be role models?",
    ],
    HARD: [
      "This house believes that competition does more harm than good.",
      "This house would abolish all zoos.",
      "This house believes history should judge people by the standards of their time.",
      "This house would ban advertising aimed at children.",
    ],
  },
  CREATIVITY: {
    EASY: [
      "If you could have any superpower for one day, what would you do?",
      "Invent a new holiday and explain how people celebrate it.",
      "Describe your dream house in detail.",
      "If animals could talk, which would be the rudest?",
    ],
    MEDIUM: [
      "Pitch a new sport that combines two existing ones.",
      "You found a door in your home you've never seen before. What's behind it?",
      "Design the perfect city for the year 2100.",
      "Explain the colour blue to someone who has never seen it.",
    ],
    HARD: [
      "Sell us a completely useless invention as if it will change the world.",
      "Tell the story of your life as a movie trailer.",
      "Create a new tradition for your workplace and convince us to adopt it.",
      "Describe a world where sleep is no longer needed.",
    ],
  },
  PERSONAL_GROWTH: {
    EASY: [
      "What's one goal you're working on right now?",
      "Describe a book, podcast or video that changed how you think.",
      "What does confidence mean to you?",
      "What's the best advice you've ever received?",
    ],
    MEDIUM: [
      "Tell us about a failure that taught you something important.",
      "How do you handle criticism?",
      "What would you tell your younger self?",
      "How do you decide what's worth your time?",
      "What's a belief you've changed your mind about?",
    ],
    HARD: [
      "What does it mean to live with integrity when no one is watching?",
      "Describe the person you want to be in ten years, and the gap between now and then.",
      "Is comfort the enemy of growth?",
      "How do you know when to quit something?",
    ],
  },
  FUNNY: {
    EASY: [
      "Explain why socks always go missing in the laundry.",
      "Give a TED talk on the art of napping.",
      "Describe your morning from your coffee mug's perspective.",
      "What would your pet say about you in a job reference?",
    ],
    MEDIUM: [
      "Convince us that pineapple belongs on every food.",
      "Give a motivational speech to a houseplant that refuses to grow.",
      "You're a tour guide in your own fridge. Give us the tour.",
      "Explain the rules of a board game you just made up.",
    ],
    HARD: [
      "Deliver a dramatic farewell speech from a retiring alarm clock.",
      "Defend the honour of the most hated vegetable.",
      "Present a quarterly business review for a lemonade stand run by squirrels.",
      "You're a detective. Solve the mystery of the missing TV remote.",
    ],
  },
  PRESENTATION: {
    EASY: [
      "Present your hometown to a group of tourists.",
      "Give a two-minute overview of your favourite hobby.",
      "Introduce a product you use every day to a new customer.",
      "Present three tips for staying productive.",
    ],
    MEDIUM: [
      "Present a plan to reduce waste in your office or school.",
      "Explain a process you know well to a complete beginner.",
      "Present the pros and cons of a decision you recently made.",
      "Give a status update on a project that's running late.",
    ],
    HARD: [
      "Present a new idea to executives who have five minutes and no patience.",
      "Explain a trend using only data you can describe from memory.",
      "Pitch a budget increase for a team nobody thinks about.",
      "Present bad quarterly results and a plan to recover.",
    ],
  },
  JOB_INTERVIEW: {
    EASY: [
      "Tell me about yourself.",
      "Why are you interested in this role?",
      "What are your greatest strengths?",
      "Where do you see yourself in five years?",
    ],
    MEDIUM: [
      "What is your biggest weakness, and what are you doing about it?",
      "Why are you leaving your current role?",
      "What would your previous manager say about you?",
      "Why should we hire you over other candidates?",
      "What motivates you at work?",
    ],
    HARD: [
      "Describe a time you disagreed with your manager and how it ended.",
      "What's a decision you made that turned out to be wrong?",
      "How would you handle your first 90 days in this role?",
      "Sell me this pen.",
    ],
  },
  BEHAVIORAL: {
    EASY: [
      "Tell me about a time you helped a colleague or classmate.",
      "Describe a time you learned something new quickly.",
      "Tell me about a goal you set and achieved.",
      "Describe a time you went above and beyond.",
    ],
    MEDIUM: [
      "Tell me about a time you worked with a difficult person.",
      "Describe a time you had to meet a tight deadline.",
      "Tell me about a time you received critical feedback.",
      "Describe a situation where you had to adapt to a big change.",
      "Tell me about a time you had to persuade someone.",
    ],
    HARD: [
      "Tell me about a time you failed and what you did next.",
      "Describe a time you had to make a decision without enough information.",
      "Tell me about a conflict on your team that you resolved.",
      "Describe a time you had to deliver bad news.",
    ],
  },
  ICE_BREAKER: {
    EASY: [
      "What's the most interesting thing that happened to you this week?",
      "If you could travel anywhere tomorrow, where would you go?",
      "What's a fun fact about you that most people don't know?",
      "What was your first job?",
    ],
    MEDIUM: [
      "Which historical figure would you like to have dinner with?",
      "What's a skill you'd love to master?",
      "What's something you've changed your mind about recently?",
      "What's the best concert, show or event you've attended?",
    ],
    HARD: [
      "Introduce yourself without mentioning your job or where you're from.",
      "Share an opinion you hold that most people disagree with.",
      "What question do you wish people asked you more often?",
    ],
  },
  STORYTELLING: {
    EASY: [
      "Tell the story of your most memorable trip.",
      "Describe a time you laughed until you cried.",
      "Tell us about a moment that made you proud.",
      "Share the story behind something you own.",
    ],
    MEDIUM: [
      "Tell the story of a time everything went wrong.",
      "Describe a moment that changed your direction in life.",
      "Tell us about someone who surprised you.",
      "Share a story about getting lost, literally or figuratively.",
    ],
    HARD: [
      "Tell a story with a twist ending using the words 'umbrella', 'secret' and 'train'.",
      "Tell a true story that teaches a lesson without stating the lesson.",
      "Recount a difficult conversation and what you'd do differently.",
      "Tell the story of a decision from the perspective of someone else involved.",
    ],
  },
  PUBLIC_SPEAKING: {
    EASY: [
      "Give a toast at a friend's birthday celebration.",
      "Introduce a guest speaker you admire.",
      "Thank a team for their hard work on a project.",
      "Welcome new members to a club or community.",
    ],
    MEDIUM: [
      "Give a two-minute speech on why kindness matters.",
      "Deliver a graduation speech to your former school.",
      "Accept an award you didn't expect to win.",
      "Give a speech opening a community fundraising event.",
    ],
    HARD: [
      "Deliver a eulogy for an idea that is no longer relevant.",
      "Rally a nervous team before a big deadline.",
      "Give a speech persuading a sceptical audience to volunteer.",
      "Deliver a keynote opening on the future of communication.",
    ],
  },
};

export const TOPIC_BANK: SeedTopic[] = Object.entries(BANK).flatMap(([category, levels]) =>
  Object.entries(levels).flatMap(([difficulty, texts]) =>
    texts.map((text) => ({
      text,
      category: category as TopicCategory,
      difficulty: difficulty as Difficulty,
    })),
  ),
);
