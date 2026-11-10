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
  // With a photo in seed-media/posts/<slug>-<n>.jpg: its description for screen
  // readers, and an optional headline drawn over it.
  alt?: string;
  coverText?: string;
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

// More photo posts, added after each nonprofit's posts above, so their photos
// are seed-media/posts/<slug>-7.jpg to -14.jpg. All photos are public-domain or
// CC0 (see docs/media-credits.md); people in photos about sensitive causes are
// never identifiable.
const morePosts: Record<string, DemoPost[]> = {
  "paws-haven": [
    { hoursAgo: 8, coverText: "Meet Pepper: 100% energy", alt: "A fawn and white corgi puppy standing up on its back legs, mouth open, in a sunny garden", body: "Pepper has two settings: zoom and nap. She's 4 months old, house-trained (mostly) and great with other dogs. Looking for a family that likes walks as much as she does." },
    { hoursAgo: 26, coverText: "Fosters needed: 42 kittens", alt: "A tabby cat asleep on its back on a fluffy white blanket, paws curled", body: "This is what a foster home looks like from the inside. We have 42 kittens in care right now and only 19 foster families. A spare bathroom and some patience is all it takes; we cover food, litter and vet care." },
    { hoursAgo: 50, alt: "A white and tabby cat sleeping in the sun on a wooden ledge, green leaves behind", body: "Sunbeam research, day 3. Mochi has concluded that the windowsill is the best spot in the shelter. Mochi is 7, calm, and would love a home with a big window." },
    { hoursAgo: 74, coverText: "Senior cats make the best roommates", alt: "A grey Russian blue cat curled up asleep on white bedding", body: "Ash is 12. He sleeps 18 hours a day, purrs like a motor and has never knocked anything off a table. Senior cats are the quietest roommates you'll ever have, and adoption fees for seniors are waived all month." },
    { hoursAgo: 98, alt: "Close-up of a striped tabby cat sleeping on a white blanket", body: "Tiger arrived as a stray in September with a cold and a very bad attitude. Six weeks of medicine and a lot of chin scratches later, he's a different cat." },
    { hoursAgo: 140, coverText: "Your $25 = one week of meds", alt: "A small fluffy cream-colored dog held in a volunteer's arms", body: "Daisy came in with a skin infection that had gone untreated for months. Her medicine costs about $25 a week, and she's halfway through. Every gift to our medical fund goes straight to dogs like her." },
    { hoursAgo: 190, alt: "A German shepherd mix resting on a sidewalk in a cone collar, against a teal wall", body: "Recovery mode. Rex had surgery on his back leg on Monday and is already asking for walks. Thank you to everyone who chipped in for his operation." },
    { hoursAgo: 260, coverText: "Puppy class starts Saturday", alt: "A golden puppy with a red collar looking to the side, a blue water bowl behind", body: "Free puppy class for every dog adopted from Paws Haven this year: sit, stay, and not eating your shoes. Saturdays at 10, starting this week." },
  ],
  "green-seattle": [
    { hoursAgo: 6, coverText: "This is what we're protecting", alt: "A forested mountain valley with a river running through it under a clear sky", body: "Every tree we plant in the city is part of a bigger watershed. What happens on our streets ends up in valleys like this one. That's why we plant, and that's why we clean up." },
    { hoursAgo: 30, alt: "Morning sun shining low through the trunks of tall pine trees", body: "6:45 am, Seward Park. The best part of an early planting shift is this light. Coffee was provided; the view was free." },
    { hoursAgo: 55, coverText: "New trail, built by 40 volunteers", alt: "A wooden plank footbridge on a narrow green forest trail", body: "Forty volunteers, two Saturdays, and one very muddy slope later: the new boardwalk at Longfellow Creek is open. It keeps hikers off the restored stream bank." },
    { hoursAgo: 80, alt: "A creek running between snow-covered trees in a winter forest", body: "Winter is planting season in the Pacific Northwest. The ground is wet, the roots settle in, and by spring the new trees are ready to grow. Our winter planting calendar is out." },
    { hoursAgo: 120, coverText: "Small fixes, big savings", alt: "A light bulb turned into a tiny terrarium with plants inside, hanging against a dark background", body: "Our free home energy check visited 85 households this fall. Average savings: $210 a year, mostly from fixes that cost under $50. Book a visit through the link in our profile." },
    { hoursAgo: 170, alt: "A row of blue and green recycling bins beside a pale wall and a shuttered window", body: "Pop quiz: pizza boxes go in compost, not recycling (the grease ruins the paper). We'll be at the Rainier Beach farmers market on Sunday with a sorting game and prizes." },
    { hoursAgo: 220, coverText: "Native plants, zero watering", alt: "A meadow full of purple wildflowers under a blue sky", body: "This meadow used to be a lawn. Native wildflowers need no watering after the first year, feed local bees and look like this in June. We're giving away 500 seed packets this weekend." },
    { hoursAgo: 300, alt: "The sun setting over a meadow of white daisies and wild grasses", body: "That's a wrap on our fall season: 1,240 trees, 18 cleanups and more than 600 volunteers. Thank you for every hour you gave this year." },
  ],
  "bright-futures": [
    { hoursAgo: 10, coverText: "Book drive: 1,000 books by December", alt: "An open book with a pen resting on it in front of a shelf of books", body: "Our winter book drive is on. Every mentee picks three books to keep, and we're 412 books in. New or gently used books for ages 8 to 16 can be dropped at our office, weekdays 9 to 5." },
    { hoursAgo: 34, alt: "The pages of an open book fanned out, a blurred window behind", body: "Our mentee Jordan read his first chapter book cover to cover this month. He asked us to tell you it was about dragons and that the ending was \"actually good\"." },
    { hoursAgo: 60, coverText: "Backpacks for 300 kids", alt: "School supplies laid out on a desk: a ruler, protractor, calculator, watercolors and pencils", body: "Everything a 6th grader needs for the year costs about $40. Thanks to you, 300 kids started school with a full backpack this fall." },
    { hoursAgo: 90, alt: "An empty outdoor basketball court in a foggy autumn park", body: "Friday basketball is back at the community center. Mentors and mentees, 4 to 6 pm. No skill required; enthusiasm mandatory." },
    { hoursAgo: 130, coverText: "Homework help, Tuesdays 4-6", alt: "A handwritten notebook lying open in dim light", body: "Homework club runs every Tuesday from 4 to 6 at our community room. Math, essays, science projects, or just a quiet place to work. Snacks included." },
    { hoursAgo: 175, alt: "A hand writing with a pen on paper, a coffee mug on the desk", body: "College application season. Our volunteer mentors have read 64 personal essays this month, and we're so proud of every one of these students." },
    { hoursAgo: 240, coverText: "Mentors needed: 1 hour a week", alt: "A soccer ball on a grass field at sunset with a goal in the background", body: "One hour a week. That's all it takes to be a mentor. Twenty-three kids are on our waiting list right now. Training is free and takes one Saturday morning." },
    { hoursAgo: 320, alt: "Tall library shelves packed with colorful books and a wooden ladder", body: "Field trip! Our mentees toured the downtown library and every one of them left with a library card. Three of them asked if they could live there." },
  ],
  "open-pantry": [
    { hoursAgo: 5, coverText: "Fresh food, every week", alt: "Close-up of fresh vegetables: green peas, radishes and zucchini", body: "Thanks to three partner farms, every family that visits the pantry this week goes home with fresh produce, not just cans. Peas, radishes and zucchini this week." },
    { hoursAgo: 28, alt: "Carrots, onions and potatoes in bowls on a kitchen counter", body: "Today's community kitchen menu: roasted root vegetable soup, made from ingredients that would otherwise have gone to waste. 140 bowls served." },
    { hoursAgo: 52, coverText: "Bakery leftovers, rescued", alt: "Wooden bakery shelves stacked with fresh loaves of bread", body: "Every evening, two neighborhood bakeries give us the bread they didn't sell. Every morning, it's on our shelves. That's about 300 loaves a week that feed people instead of a dumpster." },
    { hoursAgo: 78, language: "es", alt: "A wooden crate full of fresh green zucchini", body: "¡Gracias a los voluntarios del jardín comunitario! Esta semana donaron más de 200 calabacines. Si necesitas comida fresca, la despensa abre los martes y jueves de 10 a 2. No se necesita identificación." },
    { hoursAgo: 110, coverText: "$10 = fresh fruit for a week", alt: "Red apples in a wooden crate with one apple in the front", body: "Too many of our neighbors don't always know where their next meal is coming from. A $10 gift puts fresh fruit in front of a family for a week." },
    { hoursAgo: 160, alt: "A crate full of red apples seen from above", body: "Gleaning day! Volunteers picked 1,800 pounds of apples from a local orchard that couldn't sell them. They'll be at the pantry and the mobile pantry all month." },
    { hoursAgo: 210, coverText: "Our new mobile pantry stop", alt: "A market stall with boxes of green beans, cucumbers, tomatoes and peppers", body: "New mobile pantry stop: Thursdays, 3 to 5 pm, in White Center. Same fresh produce, no sign-up, no questions asked." },
    { hoursAgo: 280, alt: "Leeks and carrots piled on a market table", body: "A thank-you to the farmers market vendors who send us their unsold produce every Saturday. You fed 90 families last month." },
  ],
  "new-roots": [
    { hoursAgo: 7, coverText: "Keys to a new home", alt: "A hand holding a set of house keys with a green key tag, homes blurred in the background", body: "This week a family of five who arrived in March got the keys to their first apartment in Seattle. Our housing team helped with the application, the deposit and a lot of paperwork." },
    { hoursAgo: 32, coverText: "Welcome dinner, Friday at 6", alt: "Plates of curry, flatbread and chutney on a wooden table, seen from above", body: "Friday welcome dinner: everyone brings a dish from home, everyone leaves full. New families, volunteers and neighbors are all invited. 6 pm at the community hall." },
    { hoursAgo: 58, alt: "Close-up of a page in a dictionary", body: "Our English conversation circles are full, so we're adding two more: Monday evenings and Wednesday mornings. We need four more volunteer hosts. No teaching experience needed, just patience and a friendly face." },
    { hoursAgo: 86, language: "uk", alt: "Colorful pins stuck into a map, lit by warm light", body: "Наші волонтери допомагають новим сім'ям знайти школи, лікарів і роботу поруч із домом. Цього місяця ми допомогли 23 родинам. Якщо вам потрібна допомога, напишіть нам." },
    { hoursAgo: 125, coverText: "Grow your own food", alt: "A community garden with raised beds, flowers and a small glass greenhouse", body: "Twelve garden plots are now reserved for newly arrived families. Growing the vegetables you grew up with turns out to be one of the best cures for homesickness." },
    { hoursAgo: 165, alt: "A hand holding a cup of ginger and lemon tea", body: "Tea and paperwork hour, every Thursday. Bring your forms, your questions and your appetite for cookies. Interpreters for Ukrainian, Dari, Spanish and Tigrinya are on site." },
    { hoursAgo: 230, coverText: "Families from 31 countries", alt: "A map of the world showing the oceans and continents", body: "Since January, New Roots has welcomed families from 31 countries. Each one arrived with a story, and each one is now part of ours." },
    { hoursAgo: 310, alt: "An autumn city street with yellow leaves, a sidewalk and a bus stop", body: "Learning the bus system is step one of a new life in a new city. Our volunteers ride along on the first trips to school, to work and to the clinic." },
  ],
};
for (const np of nonprofits) np.posts.push(...(morePosts[np.slug] ?? []));

// Stories (they expire after 24 hours, so each seed run posts fresh ones).
// With no photo or video in seed-media/stories/<slug>-<n>.*, the seed draws a
// simple text card from `text`. Each organization's stories, oldest first.
export const stories: Record<string, { text: string; caption?: string; sticker?: "donate" | "link"; hoursAgo: number }[]> = {
  "paws-haven": [
    { text: "Biscuit, 11, is looking for a quiet home 🐾", caption: "New arrivals this week: four puppies, all looking for homes.", sticker: "donate", hoursAgo: 5 },
    { text: "Adoption Day this Saturday", caption: "Meet 20 dogs and cats looking for families.", hoursAgo: 2 },
    { text: "Good boy alert", caption: "Scout passed his training test today. Adoption applications open!", sticker: "donate", hoursAgo: 4 },
    { text: "Playtime at the shelter", caption: "Toy donations make days like this possible. Thank you!", hoursAgo: 1 },
  ],
  "green-seattle": [
    { text: "312 trees planted this month 🌳", caption: "Thank you, volunteers! Next stop: Rainier Beach.", hoursAgo: 7 },
    { text: "Morning light in the canopy", caption: "Saturday planting starts at 9. Gloves and coffee provided.", hoursAgo: 3 },
    { text: "Where our creeks begin", caption: "Help protect the watershed: join a cleanup this month.", sticker: "donate", hoursAgo: 1 },
  ],
  "bright-futures": [
    { text: "Mentors needed: 1 hour a week", caption: "Change a kid's year with one hour a week.", sticker: "link", hoursAgo: 9 },
    { text: "Homework club tonight", caption: "Homework club tonight, 4 to 6. Snacks on us.", hoursAgo: 2 },
  ],
  "open-pantry": [
    { text: "The shelves are full again 🥫", caption: "Your donations stocked the pantry for the week.", sticker: "donate", hoursAgo: 3 },
    { text: "Mobile pantry: Thursday 10–2", caption: "Loading the mobile pantry: Thursday, 10 to 2.", hoursAgo: 1 },
    { text: "1,800 pounds of apples", caption: "Gleaning day at the orchard: 1,800 pounds of apples for the pantry.", sticker: "donate", hoursAgo: 4 },
  ],
  "new-roots": [
    { text: "Free legal clinic, Saturday 10–1", caption: "Asylum and work permit questions. No appointment needed.", hoursAgo: 6 },
    { text: "Tea and paperwork hour", caption: "Tea and paperwork hour, Thursday at 2. Interpreters on site.", hoursAgo: 3 },
  ],
};

// Captions for reels made from seed-media/reels/<slug>-<n>.mp4 (the n-th entry
// goes with file n). Without the video files, no demo reels are created.
export const reels: Record<string, { caption: string; coverText?: string; hoursAgo: number }[]> = {
  "paws-haven": [
    { caption: "Take me home 🐶 Every dog in our care is waiting for a family. Adoption Day is this Saturday.", hoursAgo: 20 },
    { caption: "From scared stray to boat captain: six weeks with a foster family.", hoursAgo: 60 },
    { caption: "Kitten season: these four are ready for a foster home.", hoursAgo: 120 },
    { caption: "Frisbee, nap, repeat. Sunny is 2, fully vaccinated and looking for a family with a yard.", coverText: "Sunny wants to play", hoursAgo: 12 },
    { caption: "Ginger spent her first week hiding under the bed. Now she runs to the door. That's what a foster home does.", coverText: "From scared to curious in 3 weeks", hoursAgo: 44 },
    { caption: "Our volunteers spend an hour a day just petting the cats. It's on the schedule. It matters.", coverText: "The most important job here", hoursAgo: 96 },
  ],
  "green-seattle": [
    { caption: "Healthy forests keep our creeks cool and clean. Help us plant 300 more trees this fall.", hoursAgo: 30 },
    { caption: "A creek running clear again after our volunteer cleanup.", hoursAgo: 90 },
    { caption: "Protecting habitat means protecting everyone who lives there.", hoursAgo: 140 },
    { caption: "Every tree we plant is a small piece of a forest like this one. Planting season runs through March.", coverText: "Plant a tree this winter", hoursAgo: 18 },
    { caption: "Clean water starts upstream. Our creek teams clear trash and invasive ivy every second Saturday.", coverText: "Clean creeks, every month", hoursAgo: 66 },
    { caption: "Mornings like this are why we do it. Thank you to the 600 volunteers who gave their weekends this year.", coverText: "600 volunteers this year", hoursAgo: 110 },
  ],
  "open-pantry": [
    { caption: "Some neighbors can't make it to the pantry, so the pantry comes to them.", hoursAgo: 15 },
    { caption: "Fresh bread from Friday's community kitchen.", hoursAgo: 75 },
    { caption: "Three partner farms, one goal: fresh food for every family that walks in. Produce days are Tuesdays and Thursdays.", coverText: "Fresh produce, not just cans", hoursAgo: 22 },
    { caption: "Every evening, bakeries and orchards send us what they couldn't sell. Every morning, it feeds our neighbors.", coverText: "Rescued food, every day", hoursAgo: 58 },
    { caption: "Nothing goes to waste in our community kitchen. Today's soup: roasted roots, 140 bowls.", coverText: "Today's soup: 140 bowls", hoursAgo: 100 },
    { caption: "This week's produce boxes: carrots, peppers, tomatoes and radishes from three partner farms.", coverText: "What's in this week's box", hoursAgo: 9 },
    { caption: "Washed, sorted and ready by 10 am. Thank you to our Tuesday volunteer crew!", coverText: "Volunteers make it happen", hoursAgo: 70 },
  ],
  "bright-futures": [
    { caption: "Our winter book drive: every mentee picks three books to keep. 412 books in, 588 to go.", coverText: "1,000 books by December", hoursAgo: 16 },
    { caption: "Homework club, Tuesdays 4 to 6 at our community room. Math, essays, science projects, snacks.", coverText: "Homework help, every Tuesday", hoursAgo: 52 },
    { caption: "Basketball on Fridays, soccer on Saturdays. Mentoring doesn't always happen at a desk.", coverText: "Mentoring, on and off the court", hoursAgo: 88 },
    { caption: "Every mentee leaves the winter book drive with three books of their own. Help us reach 1,000.", coverText: "Every kid deserves a bookshelf", hoursAgo: 6 },
    { caption: "Saturday soccer is back. Mentors, mentees and a lot of very muddy shoes.", coverText: "Saturday soccer is back", hoursAgo: 40 },
  ],
  "new-roots": [
    { caption: "From the first night in a new city to the keys to a first home. This is what your support makes possible.", coverText: "A new home, step by step", hoursAgo: 14 },
    { caption: "Friday welcome dinners: every family brings a dish from home, and nobody leaves hungry.", coverText: "Welcome dinner, every Friday", hoursAgo: 48 },
    { caption: "English circles, school enrollment, bus routes, job applications. Our volunteers help with all of it.", coverText: "Families from 31 countries", hoursAgo: 92 },
    { caption: "A first morning in a new city. We're there for the second, the third and every one after.", coverText: "A first morning, not alone", hoursAgo: 11 },
    { caption: "Our volunteers ride along on the first trips to work, to school and to the clinic.", coverText: "Learning the way to work", hoursAgo: 36 },
    { caption: "Some of our families haven't seen their relatives in years. A video call can mean everything. Your gifts fund phones and data plans.", coverText: "Staying close to home", hoursAgo: 75 },
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
  rulingDate: "2019-06-01",
}));

// One young organization, tax-exempt for only about two months whenever the
// seed runs, to show the 6-month rule refusing verification.
export const youngJudgeEin = { ein: "000000299", name: "Judge Test New Nonprofit", monthsAgo: 2 };
