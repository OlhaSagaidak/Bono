// Demo content for `npm run seed`. Every organization and person here is
// fictional. PayPal sandbox emails are not here: they come from the gitignored
// seed.local.json, keyed by the same slugs.

export type DemoNonprofit = {
  slug: string;
  name: string;
  mission: string;
  causes: string[];
  posts: DemoPost[];
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
];

export const sponsors = [
  {
    slug: "acme",
    name: "Acme",
    about: "Acme makes everyday tools for builders and makers. We match our customers' giving to local causes.",
  },
  {
    slug: "northwind",
    name: "Northwind",
    about: "Northwind delivers fresh groceries across the Pacific Northwest, and funds food and climate work where we operate.",
  },
];

// Varied on purpose so different demo logins see visibly different feeds.
export const supporters: { name: string; interests: string[] }[] = [
  { name: "Maya Chen", interests: ["animals", "climate"] },
  { name: "Daniel Ortiz", interests: ["food-security", "refugees"] },
  { name: "Priya Raman", interests: ["youth", "arts"] },
  { name: "Olek Kovalenko", interests: ["refugees"] },
  { name: "Grace Liu", interests: ["climate", "health"] },
  { name: "Sam Okafor", interests: ["youth", "food-security"] },
  { name: "Lucía Herrera", interests: ["refugees", "food-security", "health"] },
  { name: "Ben Fischer", interests: ["animals"] },
  { name: "Hana Sato", interests: ["arts", "climate"] },
  { name: "Marcus Bell", interests: ["youth"] },
  { name: "Elena Petrova", interests: ["animals", "refugees"] },
  { name: "Theo Nguyen", interests: ["climate"] },
  { name: "Aisha Rahman", interests: ["health", "food-security"] },
  { name: "Jonah Weiss", interests: ["arts"] },
  { name: "Sofia Rossi", interests: ["animals", "youth", "arts"] },
  { name: "Kwame Mensah", interests: ["food-security"] },
  { name: "Ingrid Larsen", interests: ["climate", "animals"] },
  { name: "Diego Morales", interests: ["refugees", "youth"] },
  { name: "Nadia Haddad", interests: ["health"] },
  { name: "Ruth Abrams", interests: ["food-security", "climate", "refugees"] },
];
