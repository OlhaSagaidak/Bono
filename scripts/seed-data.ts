// Demo content for `npm run seed`. Every organization and person here is
// fictional. PayPal sandbox emails are not here: they come from the gitignored
// seed.local.json, keyed by the same slugs.

export type DemoNonprofit = {
  slug: string;
  name: string;
  // Fictional. The "00" prefix is never assigned by the IRS, so these can't
  // collide with a real organization. They live in demo_ein_registry.
  ein: string;
  mission: string;
  causes: string[];
  posts: DemoPost[];
  // Seeded unverified, so the verification flow can be shown live. Defaults to verified.
  unverified?: true;
  bio: string;
  events?: DemoEvent[];
};

export type DemoEvent = {
  title: string;
  description: string;
  daysAhead: number; // from today, so seeded events always stay upcoming
  startHour: number; // Seattle time, 24h
  hours: number;
  online?: true; // otherwise in person at `address`
  address?: string;
  capacity?: number;
};

export type DemoPost = {
  body: string;
  language?: "en" | "es" | "uk";
  causes?: string[]; // defaults to all of the nonprofit's causes
  hoursAgo: number; // spreads posts over the last two weeks
};

export const nonprofits: DemoNonprofit[] = [
  {
    slug: "paws-haven",
    events: [
      { title: "Adoption Day at the shelter", description: "Meet dogs and cats looking for homes. Adoption counselors on site all day, and the adoption fee is waived for senior pets.", daysAhead: 3, startHour: 11, hours: 4, address: "4100 Maple Bluff Road, Seattle" },
      { title: "Foster parent info night", description: "What fostering a kitten or a recovering dog really looks like, what we provide, and how to start. Questions welcome.", daysAhead: 8, startHour: 18, hours: 1, online: true },
    ],
    bio: "Rescue, rehab and rehoming since 2009. Volunteers, fosters and a lot of very good dogs.",
    ein: "000000101",
    name: "Paws Haven",
    mission:
      "We rescue, rehabilitate and rehome dogs and cats across the Puget Sound, and help families keep the pets they love.",
    causes: ["animals"],
    posts: [
      {
        hoursAgo: 3,
        body: "Meet Biscuit! She came to us last month underweight and scared of every sound. Today she fell asleep on a volunteer's lap during story hour. She's ready for a quiet home with a sunny window.",
      },
      {
        hoursAgo: 30,
        body: "Our low-cost vaccine clinic is back this Saturday, 9am to 1pm. Rabies, distemper and microchips for $15 each. No one gets turned away for not being able to pay.",
      },
      {
        hoursAgo: 75,
        body: "Kitten season is here: 42 kittens in foster care right now. Foster families get food, litter, vet care and a 24/7 help line. All you bring is a spare bathroom and some patience.",
      },
      {
        hoursAgo: 140,
        body: "Update on Rocket, the senior beagle who arrived with a broken leg: the cast is off, and he's already back to stealing socks. Thank you to everyone who chipped in for his surgery.",
      },
      {
        hoursAgo: 210,
        body: "Why we run a pet food bank: when money is tight, people skip their own meals before their pet's. Last month we handed out 3,100 pounds of food so 260 families didn't have to choose.",
      },
      {
        hoursAgo: 300,
        body: "Adoption weekend recap: 17 dogs and 11 cats went home with new families. The shelter is quiet tonight, in the best way.",
      },
    ],
  },
  {
    slug: "green-seattle",
    events: [
      { title: "Tree planting in Rainier Beach", description: "We plant 120 street trees in one morning. Gloves, tools and coffee provided; wear shoes that can get muddy.", daysAhead: 5, startHour: 9, hours: 3, address: "Corner of Alder Street and 52nd Ave S, Seattle", capacity: 60 },
      { title: "Thornton Creek cleanup", description: "Pulling ivy and picking up trash along the creek before the salmon run. Ages 12 and up.", daysAhead: 12, startHour: 10, hours: 3, address: "Willow Creek trailhead, NE 105th St, Seattle" },
    ],
    bio: "Neighbors planting trees and restoring creeks, one block at a time. Gloves provided.",
    ein: "000000102",
    name: "Green Seattle",
    mission:
      "We plant trees, restore urban creeks and help Seattle neighborhoods cut their carbon footprint, one block at a time.",
    causes: ["climate", "health"],
    posts: [
      {
        hoursAgo: 6,
        causes: ["climate"],
        body: "We counted salmon in Thornton Creek this morning: 38 coho, up from 9 three years ago. That's what five years of removing ivy and replanting the banks looks like.",
      },
      {
        hoursAgo: 48,
        language: "es",
        body: "¡Gracias a los 60 voluntarios que plantaron 240 árboles en Rainier Beach el domingo! Más sombra, aire más limpio y calles más frescas en verano. El próximo evento es el 8 de noviembre.",
      },
      {
        hoursAgo: 96,
        body: "Neighborhoods with fewer trees can be 10°F hotter on summer afternoons, and they're usually the neighborhoods with the fewest air conditioners. This fall, 80% of our plantings go to the hottest blocks in the city.",
      },
      {
        hoursAgo: 170,
        causes: ["climate"],
        body: "Free home energy check-ups are open for renters, too. A volunteer spends an hour with you, finds the drafts, and leaves you with weatherstripping and LED bulbs. Most households save $20 a month.",
      },
      {
        hoursAgo: 240,
        causes: ["climate"],
        body: "Rain garden workshop this Thursday: learn how to turn the low spot in your yard into a garden that soaks up storm runoff before it carries oil and trash into the Sound.",
      },
      {
        hoursAgo: 330,
        body: "Asthma rates drop when kids breathe cleaner air on the way to school. We're starting a hedgerow project along three school routes in South Park. Want to help dig? Bring gloves.",
      },
    ],
  },
  {
    slug: "bright-futures",
    events: [
      { title: "New mentor orientation", description: "Thinking about mentoring? Hear from current mentors and mentees and learn how matching works. About an hour.", daysAhead: 4, startHour: 18, hours: 1, online: true },
      { title: "Teen mural unveiling", description: "Twelve students spent eight Saturdays designing this wall. Come see it, meet the artists, and stay for snacks.", daysAhead: 10, startHour: 16, hours: 2, address: "Community center, 2300 23rd Ave, Seattle" },
    ],
    bio: "Mentors and young people, meeting every week. Friendships that last years, not weeks.",
    ein: "000000103",
    name: "Bright Futures",
    mission:
      "We pair young people aged 10 to 18 with trained adult mentors, and keep those friendships going for years, not weeks.",
    causes: ["youth", "arts"],
    posts: [
      {
        hoursAgo: 10,
        causes: ["youth"],
        body: "Jaylen and his mentor Dana have met every Tuesday for four years. This week Jaylen opened his first college acceptance letter, and Dana was the first person he called.",
      },
      {
        hoursAgo: 55,
        causes: ["arts", "youth"],
        body: "Our teen mural crew finished the wall at the community center! Twelve students spent eight Saturdays designing it together. Come see it on 23rd Avenue.",
      },
      {
        hoursAgo: 120,
        causes: ["youth"],
        body: "We have 64 young people on our waiting list for a mentor. Mentoring takes about four hours a month. We train you, match you carefully and check in every step of the way.",
      },
      {
        hoursAgo: 190,
        causes: ["youth"],
        body: "Homework club is now open three afternoons a week, with snacks and free tutoring in math and reading. Last spring, 9 in 10 regulars moved up a reading level.",
      },
      {
        hoursAgo: 260,
        causes: ["arts", "youth"],
        body: "Poetry night was packed. Fourteen teens read their own work on stage, most of them for the first time. One line we can't stop thinking about: \"I am not the noise around me.\"",
      },
      {
        hoursAgo: 320,
        causes: ["youth"],
        body: "Research is clear: young people with a mentor are 55% more likely to enroll in college. But what they talk about most is simpler: someone showed up, every week.",
      },
    ],
  },
  {
    slug: "open-pantry",
    events: [
      { title: "Mobile pantry volunteer shift", description: "Help load the truck and hand out fresh produce in Delridge. No experience needed; we'll train you on the spot.", daysAhead: 2, startHour: 15, hours: 3, address: "Delridge Way SW and SW Brandon St, Seattle", capacity: 12 },
      { title: "Community dinner", description: "A free hot meal at real tables. Come to eat, come to cook, or both. Everyone is welcome.", daysAhead: 6, startHour: 17, hours: 2, address: "Open Pantry kitchen, 815 Harbor Lane, Seattle" },
    ],
    bio: "Food banks, a mobile pantry and Friday community dinners. No forms, no questions.",
    ein: "000000104",
    name: "Open Pantry",
    mission:
      "We run food banks, mobile pantries and a community kitchen so that no one in our city has to go to bed hungry.",
    causes: ["food-security", "health"],
    posts: [
      {
        hoursAgo: 2,
        causes: ["food-security"],
        body: "The mobile pantry truck is heading to Delridge this afternoon with 2,000 pounds of fresh produce. No ID, no forms, no questions. Just come by between 3 and 6.",
      },
      {
        hoursAgo: 36,
        language: "es",
        causes: ["food-security"],
        body: "¡La despensa móvil llega a South Park este jueves! Frutas, verduras, leche y pan para todas las familias. No pedimos documentos. Habrá voluntarios que hablan español.",
      },
      {
        hoursAgo: 80,
        body: "Our dietitian volunteers built a new shelf for people managing diabetes: low-sugar staples, whole grains and recipe cards. Food is medicine, and everyone deserves the right medicine.",
      },
      {
        hoursAgo: 150,
        causes: ["food-security"],
        body: "Visits are up 34% since last year. Many of the families we see now have two working parents. Rent went up; paychecks didn't. We're keeping the shelves full, but we need help.",
      },
      {
        hoursAgo: 230,
        causes: ["food-security"],
        body: "Community kitchen Fridays: a free hot meal, cooked by volunteers and served at real tables with real plates. Last week: lentil soup, cornbread and apple crisp for 180 neighbors.",
      },
      {
        hoursAgo: 310,
        causes: ["food-security", "health"],
        body: "School is back, and so is the weekend backpack program. Every Friday, 450 kids take home enough food for the weekend, so Monday morning isn't the first meal since Friday lunch.",
      },
    ],
  },
  {
    slug: "new-roots",
    events: [
      { title: "Free legal clinic", description: "Volunteer lawyers help with asylum paperwork and work permits. No appointment needed; bring your documents.", daysAhead: 6, startHour: 10, hours: 4, address: "New Roots Welcome Center, 1520 Cedar Court, Seattle" },
      { title: "Neighborhood potluck", description: "Bring a dish from home, or just bring yourself. Ukrainian, Afghan, Guatemalan and many more kitchens at one table.", daysAhead: 9, startHour: 18, hours: 2, address: "New Roots Welcome Center, 1520 Cedar Court, Seattle" },
    ],
    bio: "Helping newcomers find a home, a job, English classes and friends. Ласкаво просимо. Bienvenidos.",
    ein: "000000105",
    name: "New Roots Welcome Center",
    mission:
      "We help refugee and immigrant families build a new life: housing, English classes, legal help and a community that has their back.",
    causes: ["refugees"],
    posts: [
      {
        hoursAgo: 5,
        language: "uk",
        body: "Цього тижня ми допомогли трьом родинам з Харкова знайти житло в Сіетлі. Дякуємо волонтерам, які привезли меблі та посуд! Якщо ви можете допомогти з транспортом, напишіть нам.",
      },
      {
        hoursAgo: 40,
        language: "es",
        body: "Este sábado abrimos nuestra clínica legal gratuita. Abogados voluntarios ayudarán con trámites de asilo y permisos de trabajo. No necesitas cita, solo trae tus documentos.",
      },
      {
        hoursAgo: 100,
        body: "Amira arrived eight months ago speaking no English. Last week she passed her certified nursing assistant exam. She starts at a hospital in Renton on Monday.",
      },
      {
        hoursAgo: 160,
        language: "uk",
        body: "Наші безкоштовні курси англійської мови для дорослих починаються в понеділок. Заняття двічі на тиждень увечері. Діти можуть прийти з батьками: з ними буде няня.",
      },
      {
        hoursAgo: 250,
        body: "A welcome kit for a newly arrived family costs about $300: bedding, a pots-and-pans set, school supplies and a bus pass for the first month. Small things that say: you're home now.",
      },
      {
        hoursAgo: 340,
        body: "Our Thursday potluck has become the best dinner in town. Last week: Ukrainian varenyky, Afghan bolani, Guatemalan tamales and a very ambitious lasagna from one of our volunteers.",
      },
    ],
  },
  {
    slug: "canvas-commons",
    bio: "Free studios and art classes for kids and seniors. Bring your curiosity; we have the paint.",
    name: "Canvas Commons",
    ein: "000000106",
    mission:
      "We run free art studios and classes for kids and seniors, because making art shouldn't depend on what you can afford.",
    causes: ["arts", "youth"],
    // Unverified nonprofits can't post, so it starts with none. After it's
    // verified on camera, a first post can be written live.
    posts: [],
    unverified: true,
  },
];

export const sponsors = [
  {
    slug: "acme",
    name: "Acme",
    bio: "Acme makes everyday tools for builders and makers. We match our customers' giving to local causes.",
  },
  {
    slug: "northwind",
    name: "Northwind",
    bio: "Northwind delivers fresh groceries across the Pacific Northwest, and funds food and climate work where we operate.",
  },
];

// Varied on purpose so different demo logins see visibly different feeds.
export const supporters: { name: string; interests: string[]; bio?: string }[] = [
  { name: "Maya Chen", interests: ["animals", "climate"], bio: "Dog foster mom and weekend tree planter. Seattle born." },
  { name: "Daniel Ortiz", interests: ["food-security", "refugees"], bio: "Volunteer driver for the mobile pantry. Ask me about the best tamales in town." },
  { name: "Priya Raman", interests: ["youth", "arts"], bio: "Art teacher. I believe every kid deserves a paintbrush and a mentor." },
  { name: "Olek Kovalenko", interests: ["refugees"], bio: "Came to Seattle in 2022. Now I help other families settle in." },
  { name: "Grace Liu", interests: ["climate", "health"], bio: "Nurse by day, creek cleaner on Saturdays." },
  { name: "Sam Okafor", interests: ["youth", "food-security"], bio: "Youth soccer coach and food bank regular. Small acts add up." },
  { name: "Lucía Herrera", interests: ["refugees", "food-security", "health"], bio: "Immigration paralegal. Volunteer at the Saturday legal clinic." },
  { name: "Ben Fischer", interests: ["animals"], bio: "Two rescue cats, one very old beagle. Animals first." },
  { name: "Hana Sato", interests: ["arts", "climate"], bio: "Muralist. Painting walls and planting trees." },
  { name: "Marcus Bell", interests: ["youth"], bio: "Mentor for six years. Still learning from my mentee." },
  { name: "Elena Petrova", interests: ["animals", "refugees"], bio: "Shelter volunteer and Ukrainian-English translator." },
  { name: "Theo Nguyen", interests: ["climate"], bio: "Climate nerd. Composting, cycling, counting salmon." },
  { name: "Aisha Rahman", interests: ["health", "food-security"], bio: "Dietitian. Food is medicine, and everyone deserves good food." },
  { name: "Jonah Weiss", interests: ["arts"], bio: "Poetry nights and community theater." },
  { name: "Sofia Rossi", interests: ["animals", "youth", "arts"], bio: "Grad student. I give where I can and volunteer where I can't." },
  { name: "Kwame Mensah", interests: ["food-security"], bio: "Chef. I cook at the Friday community kitchen." },
  { name: "Ingrid Larsen", interests: ["climate", "animals"], bio: "Hiker, birder, cat person." },
  { name: "Diego Morales", interests: ["refugees", "youth"], bio: "Former refugee, current mentor." },
  { name: "Nadia Haddad", interests: ["health"], bio: "Public health researcher. Fan of good data and good neighbors." },
  { name: "Ruth Abrams", interests: ["food-security", "climate", "refugees"], bio: "Retired teacher. Now I have time for every cause I care about." },
];

// A few conversations so Messages isn't empty in the demo. People are named by
// login (the part before @): a nonprofit or sponsor slug, or firstname.lastname.
// Each message: [sender index in `between`, text, hours ago].
export const conversations: { between: [string, string]; messages: [0 | 1, string, number][] }[] = [
  {
    between: ["maya.chen", "paws-haven"],
    messages: [
      [0, "Hi! I saw the post about foster homes for senior dogs. We have a fenced yard. What does fostering involve?", 30],
      [1, "Hi Maya, thank you! We cover food and vet costs. Fosters usually keep a dog for 2–6 weeks. Come to the foster info night and we'll walk you through it.", 29],
      [0, "Perfect, I just marked myself as going. See you there!", 28],
      [1, "Wonderful. Bring any questions. Our senior beagle Biscuit says hello.", 3],
    ],
  },
  {
    between: ["maya.chen", "sofia.rossi"],
    messages: [
      [1, "Are you going to the adoption day on Saturday?", 20],
      [0, "Yes! Want to go together? I can pick you up around 9:30.", 19],
      [1, "That'd be great, thanks 🙂", 2],
    ],
  },
  {
    between: ["acme", "green-seattle"],
    messages: [
      [0, "Hello from Acme. We'd like to match donations to your tree planting events this month. Could you share your goals for the season?", 50],
      [1, "That's fantastic news! We're aiming for 1,200 trees across three neighborhoods by the end of November.", 47],
      [0, "Great. We'll set up a 1:1 match with a $2,000 pool. Let us know if a boost on your next event post would help.", 26],
    ],
  },
  {
    between: ["daniel.ortiz", "open-pantry"],
    messages: [
      [0, "I can drive the mobile pantry route on Thursdays again starting next week.", 12],
      [1, "Thank you Daniel! You're on the schedule. Pickup is at 8 at the warehouse as usual.", 11],
    ],
  },
  {
    between: ["olek.kovalenko", "new-roots"],
    messages: [
      [0, "Добрий день! Do you still need Ukrainian interpreters for the Saturday clinic?", 8],
      [1, "Yes, we do! Two families this week only speak Ukrainian. Could you come 10–1?", 6],
    ],
  },
];

// Stories (they expire after 24 hours, so each seed run posts fresh ones).
// With no photo or video in seed-media/stories/<slug>-<n>.*, the seed draws a
// simple text card from `text`. Each organization's stories, oldest first.
export const stories: Record<string, { text: string; caption?: string; sticker?: "donate" | "link"; hoursAgo: number }[]> = {
  "paws-haven": [
    { text: "Biscuit, 11, is looking for a quiet home 🐾", caption: "New arrivals this week: four puppies, all looking for homes.", sticker: "donate", hoursAgo: 5 },
    { text: "Adoption Day this Saturday", caption: "Meet 20 dogs and cats looking for families.", hoursAgo: 2 },
  ],
  "green-seattle": [{ text: "312 trees planted this month 🌳", caption: "Thank you, volunteers! Next stop: Rainier Beach.", hoursAgo: 7 }],
  "bright-futures": [
    { text: "Mentors needed: 1 hour a week", caption: "Change a kid's year with one hour a week.", sticker: "link", hoursAgo: 9 },
  ],
  "open-pantry": [
    { text: "The shelves are full again 🥫", caption: "Your donations stocked the pantry for the week.", sticker: "donate", hoursAgo: 3 },
    { text: "Mobile pantry: Thursday 10–2", caption: "Loading the mobile pantry: Thursday, 10 to 2.", hoursAgo: 1 },
  ],
  "new-roots": [{ text: "Free legal clinic, Saturday 10–1", caption: "Asylum and work permit questions. No appointment needed.", hoursAgo: 6 }],
};

// Captions for reels made from seed-media/reels/<slug>-<n>.mp4 (the n-th entry
// goes with file n). Without the video files, no demo reels are created.
export const reels: Record<string, { caption: string; hoursAgo: number }[]> = {
  "paws-haven": [
    { caption: "Take me home 🐶 Every dog in our care is waiting for a family. Adoption Day is this Saturday.", hoursAgo: 20 },
    { caption: "From scared stray to boat captain: six weeks with a foster family.", hoursAgo: 60 },
    { caption: "Kitten season: these four are ready for a foster home.", hoursAgo: 120 },
  ],
  "green-seattle": [
    { caption: "Healthy forests keep our creeks cool and clean. Help us plant 300 more trees this fall.", hoursAgo: 30 },
    { caption: "A creek running clear again after our volunteer cleanup.", hoursAgo: 90 },
    { caption: "Protecting habitat means protecting everyone who lives there.", hoursAgo: 140 },
  ],
  "open-pantry": [
    { caption: "Some neighbors can't make it to the pantry, so the pantry comes to them.", hoursAgo: 15 },
    { caption: "Fresh bread from Friday's community kitchen.", hoursAgo: 75 },
  ],
};

// Comments on demo posts: by login (firstname.lastname or an org slug), on
// the n-th post (0-based) of a nonprofit, with replies and reactions.
type DemoComment = {
  by: string;
  text: string;
  hoursAgo: number;
  reactions?: [string, "like" | "love" | "care" | "haha" | "wow" | "sad"][];
  replies?: Omit<DemoComment, "replies">[];
};
export const comments: { org: string; post: number; comments: DemoComment[] }[] = [
  {
    org: "paws-haven",
    post: 0,
    comments: [
      {
        by: "maya.chen",
        text: "This made my day. Is Biscuit still looking for a home?",
        hoursAgo: 30,
        reactions: [["sofia.rossi", "love"], ["ben.fischer", "like"], ["elena.petrova", "care"]],
        replies: [
          { by: "paws-haven", text: "He is! Come meet him on Saturday at Adoption Day 🐾", hoursAgo: 28, reactions: [["maya.chen", "love"]] },
          { by: "sofia.rossi", text: "I'll be there too, let's go together!", hoursAgo: 26 },
        ],
      },
      { by: "ben.fischer", text: "Our old beagle came from you eight years ago. Still the best decision we ever made.", hoursAgo: 20, reactions: [["paws-haven", "love"], ["ingrid.larsen", "like"]] },
      { by: "elena.petrova", text: "Дякую за вашу роботу! Can I help with translation for adopters?", hoursAgo: 12 },
    ],
  },
  {
    org: "green-seattle",
    post: 0,
    comments: [
      {
        by: "theo.nguyen",
        text: "Counted 14 new saplings on my bike ride this morning 🌱",
        hoursAgo: 18,
        reactions: [["grace.liu", "wow"], ["green-seattle", "love"]],
        replies: [{ by: "green-seattle", text: "Thanks for keeping count, Theo! 300 more coming this fall.", hoursAgo: 16 }],
      },
      { by: "hana.sato", text: "Would love to paint a mural near the new grove. Who should I talk to?", hoursAgo: 9, reactions: [["theo.nguyen", "like"]] },
    ],
  },
  {
    org: "open-pantry",
    post: 0,
    comments: [
      {
        by: "daniel.ortiz",
        text: "Saw the line on Thursday. It's longer every week. Thank you for being there.",
        hoursAgo: 22,
        reactions: [["kwame.mensah", "care"], ["aisha.rahman", "sad"], ["ruth.abrams", "like"]],
        replies: [{ by: "kwame.mensah", text: "Friday kitchen is cooking extra this week to help.", hoursAgo: 21, reactions: [["daniel.ortiz", "love"]] }],
      },
      { by: "lucia.herrera", text: "¿Necesitan voluntarios que hablen español los sábados?", hoursAgo: 7 },
    ],
  },
  {
    org: "bright-futures",
    post: 0,
    comments: [{ by: "marcus.bell", text: "Six years mentoring and it's still the best hour of my week.", hoursAgo: 14, reactions: [["priya.raman", "love"], ["sam.okafor", "like"], ["bright-futures", "care"]] }],
  },
  {
    org: "new-roots",
    post: 0,
    comments: [
      {
        by: "olek.kovalenko",
        text: "The clinic helped my family two years ago. Now I volunteer there. Come say hi!",
        hoursAgo: 11,
        reactions: [["diego.morales", "love"], ["new-roots", "love"], ["ruth.abrams", "care"]],
        replies: [{ by: "diego.morales", text: "Same story here. Proud to be part of it.", hoursAgo: 10 }],
      },
    ],
  },
];

// Photos for demo posts, from seed-media/posts/<slug>-<n>.jpg (n = the post's
// position, from 1). Each needs a description for screen readers.
export const postPhotoAlt: Record<string, string> = {
  "bright-futures-3": "A circle of young people lying on the grass, heads together, laughing",
  "bright-futures-5": "Four friends squeezing into a selfie",
  "new-roots-1": "Families and neighbors dancing together in a park",
  "new-roots-6": "Women in bright saris smiling and laughing at a gathering",
};

// Spare entries for judges (and anyone trying Bono) to verify a nonprofit they
// sign up themselves: fictional, like the rest of the demo registry, with the
// "00" prefix the IRS never assigns. One account per EIN, so there are ten.
// Listed in the README's "For judges" section.
export const judgeEins = Array.from({ length: 10 }, (_, i) => ({
  ein: `0000002${String(i + 1).padStart(2, "0")}`,
  name: `Judge Test Nonprofit ${i + 1}`,
}));
