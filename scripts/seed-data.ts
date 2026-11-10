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
  coverTextPosition?: "top" | "middle" | "bottom"; // where it covers the least of the photo
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
        body: "Meet Biscuit! 🐾 She came to us last month 12 pounds underweight and scared of every sound: the door, the phone, even the rustle of a treat bag. For the first week she ate only when nobody was watching.\n\nToday she fell asleep on a volunteer's lap during story hour, while a second-grader read her a book about a lost puppy. Nobody in the room moved for twenty minutes.\n\nBiscuit is 11, gentle and house-trained. She's ready for a quiet home with a sunny window, a soft bed and someone who doesn't mind a little snoring. Senior adoption fees are waived this month.",
      },
      {
        hoursAgo: 30,
        body: "💉 Our low-cost vaccine clinic is back this Saturday, 9 am to 1 pm, in the shelter parking lot.\n\nRabies, distemper and microchips are $15 each, and no one gets turned away for not being able to pay. Last time, our volunteer vets saw 186 dogs and cats in four hours, and for a third of them it was their first vet visit ever.\n\nWhy it matters: a microchip is the single best way to get a lost pet home, and a vaccinated pet is a pet that can stay healthy and stay with its family. Bring your pet on a leash or in a carrier. No appointment needed; the line moves fast.",
      },
      {
        hoursAgo: 75,
        body: "🐱 Kitten season is here, and it's a big one: 42 kittens in foster care right now, with more arriving every week.\n\nFostering is the reason they make it. Kittens under 8 weeks are too young to be adopted and too fragile for a busy shelter, so they spend a few weeks growing up in volunteers' homes instead. Foster families get food, litter, toys, vet care and a 24/7 help line. All you bring is a spare bathroom, some patience and a phone for taking an unreasonable number of photos.\n\nMost foster stints last 3 to 4 weeks. Our next orientation is online, Thursday at 6 pm.",
      },
      {
        hoursAgo: 140,
        body: "Update on Rocket! 🐶 Remember the senior beagle who arrived in August with a broken back leg? The cast came off on Tuesday, and within an hour he was back to his favorite hobby: stealing socks from the volunteers' break room.\n\nHis surgery cost $1,850, and 74 of you chipped in to cover it in four days. Our vet says the bone has healed beautifully, and after a few more weeks of short walks he'll be ready for a home.\n\nRocket is 10, loves people, tolerates cats and has strong opinions about bacon. If you're looking for a calm, funny companion (and can keep your socks in a drawer), ask about him at the front desk.",
      },
      {
        hoursAgo: 210,
        body: "Why does an animal shelter run a food bank? Because the most common reason people give up a pet isn't behavior. It's money.\n\nWhen times are hard, people skip their own meals before their pet's. And when they can't do that anymore, some of them end up at our front desk, in tears, asking us to take a dog they've loved for ten years. We'd much rather help them keep it.\n\nLast month our pet food bank handed out 3,100 pounds of dog and cat food, so 260 families didn't have to choose. No questions, no paperwork. Open every Wednesday, 4 to 7. Donations of unopened pet food are always welcome.",
      },
      {
        hoursAgo: 300,
        body: "🏡 Adoption weekend recap: 17 dogs and 11 cats went home with new families.\n\nAmong them: Duke, who had waited 143 days; a pair of bonded senior cats who got to stay together; and a three-legged puppy named Tripod, adopted by a family whose dad also walks on a prosthetic leg. We may have cried a little at the front desk.\n\nThank you to the 46 volunteers who walked dogs, answered questions and filled out paperwork for two days straight. The shelter is quiet tonight, in the best way. Tomorrow, the next group will be waiting.",
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
        body: "🐟 We counted salmon in Thornton Creek this morning: 38 coho, up from just 9 three years ago.\n\nThat's what five years of patient, unglamorous work looks like. Volunteers pulled tons of English ivy and blackberry from the banks, planted thousands of native shrubs and trees to shade the water, and cleared out the trash that piles up after every storm. Cooler, cleaner water means more salmon make it upstream to spawn.\n\nThirty-eight fish might not sound like a lot. But for an urban creek that runs under three roads, it's a small miracle. Thank you to everyone who gave a Saturday to this creek. The salmon say thanks, too.",
      },
      {
        hoursAgo: 48,
        language: "es",
        body: "🌳 ¡Gracias a los 60 voluntarios que plantaron 240 árboles en Rainier Beach el domingo!\n\nVinieron familias enteras, vecinos del barrio y hasta un equipo de fútbol juvenil. En unos años, estos árboles darán más sombra, aire más limpio y calles mucho más frescas en los días de calor del verano.\n\nCada árbol tiene un padrino o una madrina del vecindario que se compromete a regarlo durante los dos primeros veranos. El próximo evento de plantación es el 8 de noviembre. Traemos herramientas, guantes y café. ¡Te esperamos!",
      },
      {
        hoursAgo: 96,
        body: "🌡️ On a summer afternoon, a neighborhood with few trees can be 10°F hotter than one a mile away with a full canopy.\n\nAnd here's the unfair part: the hottest neighborhoods are usually the ones with the fewest air conditioners, the oldest apartment buildings and the most people who work outside. During the last heat wave, those were the blocks where emergency calls went up the most.\n\nSo this fall, 80% of our plantings are going to the hottest blocks in the city, chosen using heat maps and conversations with the people who live there. A tree takes years to grow. That's exactly why we're planting now.",
      },
      {
        hoursAgo: 170,
        causes: ["climate"],
        body: "💡 Renters, this one's for you: our free home energy check-ups are open to everyone, not just homeowners.\n\nA trained volunteer spends about an hour in your home. They find the drafts around doors and windows, check your water heater, and leave you with free weatherstripping, LED bulbs and a low-flow showerhead, installed on the spot.\n\nMost households save about $20 a month on their energy bills, and some save a lot more. That's $240 a year, every year, and less carbon in the air.\n\nBook a visit through the link on our profile. Visits available in English, Spanish, Vietnamese and Somali.",
      },
      {
        hoursAgo: 240,
        causes: ["climate"],
        body: "🌧️ Rain garden workshop this Thursday at 6:30 pm, online and free.\n\nYou know that low spot in your yard where water collects every time it rains? It could be a rain garden: a shallow bed of native plants that soaks up storm runoff before it carries oil, fertilizer and trash down the drain and into the Sound.\n\nIn 90 minutes, our volunteer landscape designer will show you how to find the right spot, size the garden, choose plants that love wet winters and dry summers, and build it in a weekend. Attendees can apply for a free plant kit.\n\nOne rain garden can soak up tens of thousands of gallons of runoff a year. Sign up on our profile.",
      },
      {
        hoursAgo: 330,
        body: "🌿 Asthma rates drop when kids breathe cleaner air on the way to school. In South Park, many kids walk to school between a busy highway and a freight route.\n\nWe can't move the highway. But dense hedgerows of the right plants can catch some of the pollution from traffic before it reaches the sidewalk. So we're planting hedgerows along three walking routes to school, designed together with parents and a school nurse.\n\nPlanting days are the next three Saturdays, 9 to 12. Want to help dig? Bring gloves. Kids are welcome, and they'll get to plant a shrub with their name on it.",
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
        body: "🎓 Jaylen and his mentor Dana have met every Tuesday for four years.\n\nWhen they were matched, Jaylen was 14, quiet and failing two classes. They started with basketball and burritos. Then homework. Then, slowly, bigger conversations: about his family, about what he wanted, about whether college was \"for people like him.\"\n\nThis week Jaylen opened his first college acceptance letter, with a scholarship to study engineering. Dana was the first person he called. She says she screamed so loud her neighbor knocked on the door to check on her.\n\nThat's what one hour a week, for four years, can do. 64 kids are waiting for their Dana.",
      },
      {
        hoursAgo: 55,
        causes: ["arts", "youth"],
        body: "🎨 Our teen mural crew finished the wall at the community center!\n\nTwelve students, ages 13 to 17, spent eight Saturdays designing and painting it together, guided by a local artist who volunteered her weekends. They chose the theme themselves: \"Where we come from, where we're going.\" Look closely and you'll find a grandmother's kitchen, the light rail, a soccer field and a rocket.\n\nMost of them had never painted anything bigger than a sheet of paper. Now their names are signed in the bottom corner of a 40-foot wall.\n\nCome see it on 23rd Avenue, and if you see one of them around the neighborhood, tell them it's amazing. They'll pretend not to care.",
      },
      {
        hoursAgo: 120,
        causes: ["youth"],
        body: "64 young people are on our waiting list for a mentor right now. Some of them have been waiting for over a year.\n\nHere's what mentoring actually takes: about four hours a month, for at least a year. That's it. You don't need to be a teacher or have everything figured out. Our mentors are nurses, bus drivers, software engineers, retirees and college students.\n\nWe train you in one Saturday morning, match you carefully based on interests and schedules, and check in every step of the way. Many of our matches last for years and end up at graduations, weddings and first jobs.\n\nThe next training is December 6. It might be the best four hours a month you ever spend.",
      },
      {
        hoursAgo: 190,
        causes: ["youth"],
        body: "📚 Homework club is now open three afternoons a week: Monday, Tuesday and Thursday, 4 to 6 pm.\n\nFree tutoring in math and reading, a quiet table, reliable Wi-Fi, laptops to borrow and snacks (very important). For kids who share a small apartment with four siblings, it's sometimes the only quiet place to concentrate all day.\n\nIt works: last spring, 9 in 10 of our regulars moved up at least one reading level, and teachers noticed. One wrote to us: \"I don't know what you're doing on Tuesdays, but please keep doing it.\"\n\nWe added a third day because the waiting list kept growing. Volunteer tutors needed, especially for 6th to 8th grade math.",
      },
      {
        hoursAgo: 260,
        causes: ["arts", "youth"],
        body: "🎤 Poetry night was packed: standing room only, with families, mentors and friends lining the walls.\n\nFourteen teens read their own work on stage, most of them for the first time. Some read about their grandmothers, some about moving countries, one about a breakup with spectacular precision. One girl's hands were shaking so hard she held the microphone with both hands. She finished, and the whole room stood up.\n\nOne line we can't stop thinking about, from a 15-year-old in our writing group: \"I am not the noise around me.\"\n\nThe teens are putting together a printed collection of their poems. We'll share it here when it's ready.",
      },
      {
        hoursAgo: 320,
        causes: ["youth"],
        body: "The research is clear: young people with a mentor are 55% more likely to enroll in college.\n\nBut when we ask our mentees what made a difference, they almost never talk about applications or grades. They talk about something much simpler: someone showed up, every week, even when they were grumpy, even when they canceled twice in a row, even when they said they didn't want to talk.\n\nConsistency is the whole secret. You don't have to be inspiring. You have to be there on Tuesday.\n\nIf you've been thinking about mentoring, this is your sign. Training is free and takes one morning.",
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
        body: "🚚 The mobile pantry truck is heading to Delridge this afternoon with 2,000 pounds of fresh produce: apples, carrots, greens, potatoes and onions, plus milk, eggs and bread.\n\nNo ID, no forms, no questions. Just come by between 3 and 6 at the corner of Delridge Way and SW Brandon. Bring a bag if you have one; if not, we have plenty.\n\nWhy a truck? Because a lot of our neighbors can't get to the pantry during opening hours: they work, they don't have a car, or they care for someone who can't be left alone. So we bring the pantry to them, four afternoons a week, in four neighborhoods.\n\nVolunteers needed to help hand out food. Spanish speakers especially welcome.",
      },
      {
        hoursAgo: 36,
        language: "es",
        causes: ["food-security"],
        body: "🚚 ¡La despensa móvil llega a South Park este jueves, de 3 a 6 de la tarde!\n\nTraemos frutas, verduras frescas, leche, huevos y pan para todas las familias. No pedimos documentos ni identificación. Habrá voluntarios que hablan español para ayudar con lo que necesites.\n\nTambién tendremos tarjetas de recetas sencillas con los ingredientes de esta semana, y una mesa con información sobre ayuda para el alquiler y la electricidad.\n\nComparte este mensaje con tus vecinos. Si conoces a alguien que no puede salir de casa, avísanos: también llevamos comida a domicilio a personas mayores.",
      },
      {
        hoursAgo: 80,
        body: "🥗 Our volunteer dietitians built something new: a shelf for people managing diabetes.\n\nWhen you're living on a tight budget, the cheapest calories are often the worst ones for blood sugar: white bread, sugary cereal, instant noodles. For someone with diabetes, a food bank full of those can make their condition harder to manage, not easier.\n\nThe new shelf has low-sugar staples, whole grains, beans, lentils, canned fish and fresh vegetables, plus recipe cards for simple, affordable meals that are kind to blood sugar. Every Thursday, a dietitian is on hand to answer questions.\n\nFood is medicine, and everyone deserves the right medicine.",
      },
      {
        hoursAgo: 150,
        causes: ["food-security"],
        body: "📈 Visits to the pantry are up 34% since last year.\n\nThe families we see now look different from a few years ago. Many have two working parents: cashiers, warehouse workers, home health aides, school bus drivers. They're doing everything right. But rent went up, groceries went up, and paychecks didn't.\n\nWe're keeping the shelves full, but it's getting harder: our food costs are up too, and the busiest months are still ahead of us.\n\nHere's how you can help: $25 buys a full bag of groceries. $100 feeds a family of four for a week. And volunteers are always needed, especially on Tuesday and Thursday mornings.",
      },
      {
        hoursAgo: 230,
        causes: ["food-security"],
        body: "🍲 Community kitchen Fridays: a free hot meal, cooked by volunteers and served at real tables with real plates and real cutlery. No trays, no lines, no checking in.\n\nWe do it this way on purpose. A meal should feel like a meal, not like charity. People sit together, the same regulars save seats for each other, and the kids have figured out exactly which volunteer gives the biggest dessert portions.\n\nLast week: lentil soup, warm cornbread and apple crisp for 180 neighbors, cooked by eight volunteers in three hours.\n\nEveryone is welcome, every Friday from 11:30 to 1:30. Want to cook? We're always looking for volunteer chefs and dishwashers.",
      },
      {
        hoursAgo: 310,
        causes: ["food-security", "health"],
        body: "🎒 School is back, and so is our weekend backpack program.\n\nFor many kids in our neighborhood, school breakfast and lunch are the most reliable meals of the week. On Mondays, teachers notice the kids who can't concentrate because they haven't eaten much since Friday lunch.\n\nSo every Friday, 450 kids at six schools quietly take home a backpack with enough food for the weekend: cereal, milk, fruit, peanut butter, pasta and easy meals they can make themselves. It's discreet: the backpacks look like any other, and no one else knows what's inside.\n\nOne weekend backpack costs $8. Every Monday morning should start on a full stomach.",
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
        body: "🏠 Цього тижня ми допомогли трьом родинам з Харкова знайти житло в Сіетлі!\n\nПісля кількох місяців у тимчасовому житлі в них нарешті є свої ключі. Наша команда допомогла із заявами на оренду, перекладом документів і першим внеском.\n\nДякуємо волонтерам, які в суботу привезли меблі, посуд, ковдри і навіть дитячий велосипед! Наймолодша дівчинка одразу оголосила, що кімната з вікном — її.\n\nЯкщо ви можете допомогти з транспортом для переїздів або маєте меблі, які вам більше не потрібні, напишіть нам. Кожне ліжко і кожен стіл роблять нову квартиру домом.",
      },
      {
        hoursAgo: 40,
        language: "es",
        body: "⚖️ Este sábado, de 10 a 1, abrimos nuestra clínica legal gratuita.\n\nAbogados voluntarios ayudarán con trámites de asilo, permisos de trabajo, renovaciones y cartas que no entiendes. Todas las consultas son gratuitas y confidenciales. Tenemos intérpretes de español, ucraniano, dari y tigriña.\n\nNo necesitas cita: solo trae tus documentos y cualquier carta que hayas recibido. Si no sabes qué traer, ven de todas formas y te ayudamos.\n\nEl mes pasado atendimos a 52 personas, y muchas tenían plazos que vencían en pocos días. Si tienes dudas sobre tu caso, no esperes: un error en un formulario puede costar meses.",
      },
      {
        hoursAgo: 100,
        body: "🩺 Amira arrived in Seattle eight months ago, speaking no English. In her home country, she had been a nurse for twelve years.\n\nHer diploma wasn't recognized here, so she started over. Five mornings a week at our English circles. Evenings with a volunteer tutor, practicing medical vocabulary with flashcards. Weekends studying for the certified nursing assistant exam, while her two kids did their homework at the same table.\n\nLast week she passed, on her first try. She starts at a hospital in Renton on Monday.\n\nWhen we asked what helped most, she said: \"Somebody believed I could do it before I believed it.\" Congratulations, Amira. We're so proud of you.",
      },
      {
        hoursAgo: 160,
        language: "uk",
        body: "📖 Наші безкоштовні курси англійської мови для дорослих починаються в понеділок!\n\nЗаняття двічі на тиждень, у понеділок і середу з 18:30 до 20:00. Групи невеликі, до 10 людей, і ми ділимо їх за рівнем: від зовсім початкового до розмовного. Викладачі — волонтери з досвідом, а на першому занятті з вами буде помічник, який говорить українською.\n\nДіти можуть прийти з батьками: з ними буде няня, ігри та перекус.\n\nМи вчимо англійську для реального життя: як записатися до лікаря, поговорити з учителем дитини чи пройти співбесіду. Реєстрація за посиланням у профілі, або просто приходьте в понеділок.",
      },
      {
        hoursAgo: 250,
        body: "🧺 What does a family need on their first night in a new apartment, in a new country?\n\nUsually, almost everything. Many families arrive with a few suitcases and nothing else. So we put together welcome kits: bedding and towels for everyone, a pots-and-pans set, plates and cups, cleaning supplies, school supplies for the kids and a bus pass for the first month.\n\nOne kit costs about $300. This year we've given out 187 of them. Each one comes with a handwritten welcome card from a volunteer, in the family's language.\n\nSmall things that say: you're not alone, and you're home now.",
      },
      {
        hoursAgo: 340,
        body: "🍽️ Our Thursday potluck has quietly become the best dinner in town.\n\nLast week's menu: Ukrainian varenyky with potato and cherries, Afghan bolani, Guatemalan tamales, Eritrean shiro, Syrian fattoush and a very ambitious lasagna from one of our volunteers (it was excellent, Mark).\n\nIt started three years ago with 12 people and a borrowed slow cooker. Now about 80 people come every week. New arrivals meet families who came last year and can tell them which school is best and where to find their favorite spices. Nobody needs an interpreter to say \"this is delicious.\"\n\nEveryone is welcome. Bring a dish if you can, or just bring yourself.",
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
    { hoursAgo: 8, coverText: "Pepper was found in a parking lot in October. Now she can't stop jumping for joy.", coverTextPosition: "bottom", alt: "A fawn and white corgi puppy standing up on its back legs, mouth open, in a sunny garden", body: "Meet Pepper! 🐾 A delivery driver found her in a parking lot in October, alone, wet and about half the weight she should have been. Six weeks, two vet visits and one very patient foster mom later, she's 4 months old, fully vaccinated and has exactly two settings: zoom and nap.\n\nShe's mostly house-trained, great with other dogs and still learning that shoelaces aren't snacks. Pepper would love a family that enjoys long walks and doesn't mind a shadow following them from room to room. Adoption applications are open on our profile." },
    { hoursAgo: 26, coverText: "42 kittens are in foster homes right now. We only have 19 families. Can you take one for 3 weeks?", coverTextPosition: "top", alt: "A tabby cat asleep on its back on a fluffy white blanket, paws curled", body: "This is what fostering looks like from the inside: a lot of naps on very soft blankets. 😴\n\nKitten season ran long this year. We have 42 kittens in care and only 19 foster families, which means some of our fosters have five kittens in a single bathroom. A foster stint is usually 3 to 4 weeks, until the kittens are big enough to be adopted. We provide everything: food, litter, toys, vet visits and a 24/7 help line. You provide a spare room and some lap time.\n\nOur next foster orientation is Thursday at 6 pm, online. It takes 45 minutes and you can start the same week." },
    { hoursAgo: 50, coverText: "Mochi, 7, has tested every sunny spot in the shelter. Her verdict: a home with a big window.", coverTextPosition: "top", alt: "A white and tabby cat sleeping in the sun on a wooden ledge, green leaves behind", body: "Sunbeam research, day 3. Mochi has completed a careful study of every windowsill in the shelter and concluded that the one by the front desk gets the best light between 2 and 4 pm. ☀️\n\nMochi is 7, spayed, calm and very good at being petted. She came to us when her owner moved into assisted living, and she has been patiently waiting for her next person ever since. She'd do best in a quiet home without small kids. Her adoption fee is waived this month as part of our senior pet program." },
    { hoursAgo: 74, coverText: "Ash is 12. He purrs like an engine and has never knocked anything off a table. Senior cats are underrated.", coverTextPosition: "top", alt: "A grey Russian blue cat curled up asleep on white bedding", body: "Let's talk about senior cats. Ash is 12. He sleeps about 18 hours a day, purrs like a small engine and in three months at the shelter has never once knocked anything off a table.\n\nSenior cats wait four times longer than kittens to be adopted, even though they're often the easiest pets you'll ever live with: already litter-trained, done with the curtain-climbing phase and happy just to be near you. Ash has a minor thyroid condition that costs about $15 a month to manage, and we'll send him home with two months of medicine.\n\nAll month, adoption fees for cats over 8 are waived. Come meet Ash any day from noon to 6." },
    { hoursAgo: 98, coverText: "Tiger arrived with a cold and a terrible attitude. Six weeks of chin scratches changed everything.", coverTextPosition: "bottom", alt: "Close-up of a striped tabby cat sleeping on a white blanket", body: "Before and after, in one photo: this is Tiger, fast asleep. When he arrived as a stray in September, he had an upper respiratory infection, a torn ear and a firm policy of hissing at everyone, including the volunteer who brought him his dinner.\n\nWhat changed him? Antibiotics, a heated bed and our volunteer Linda, who spent 20 minutes every afternoon just sitting next to his kennel reading out loud. On day 19 he let her scratch his chin. Today he greets visitors at the door.\n\nTiger is ready for a calm home. Ask about him at the front desk, and say hi to Linda while you're there." },
    { hoursAgo: 140, coverText: "Daisy's skin infection went untreated for months. Her medicine costs $25 a week, and she's halfway there.", coverTextPosition: "bottom", alt: "A small fluffy cream-colored dog held in a volunteer's arms", body: "This is Daisy, a 5-year-old Maltese mix, in the arms of one of our vet techs. When she came in, her skin infection had gone untreated for months and she'd scratched patches of her coat raw.\n\nThe good news: it's treatable. Medicated baths twice a week and antibiotics cost about $25 a week, and she's halfway through an 8-week course. Her fur is already growing back, and she has started wagging at the sound of the bath running, which our vet techs are calling a miracle.\n\nEvery dollar given to our medical fund goes straight to dogs like Daisy. $25 covers a whole week of her care." },
    { hoursAgo: 190, coverText: "Rex had surgery on his back leg on Monday. By Wednesday he was asking for walks.", coverTextPosition: "top", alt: "A German shepherd mix resting on a sidewalk in a cone collar, against a teal wall", body: "Recovery mode, day 3. Rex, our 6-year-old shepherd mix, had surgery on Monday to repair a torn ligament in his back leg. The cone is temporary; the attitude is permanent.\n\nThe operation cost $2,400, and 61 of you covered it in under a week. Thank you. Seriously. Rex will need about eight weeks of short, gentle walks and physical therapy, and then he'll be ready for a home. He's house-trained, knows sit, down and paw, and would love a family without cats.\n\nWant to follow his recovery? We'll post an update every Friday." },
    { hoursAgo: 260, coverText: "Every dog adopted from Paws Haven this year gets a free puppy class. Sit, stay and spare the shoes.", coverTextPosition: "bottom", alt: "A golden puppy with a red collar looking to the side, a blue water bowl behind", body: "New this year: every dog adopted from Paws Haven gets a free six-week training class with our volunteer trainer, Marcus, who has been teaching dogs (and their humans) for 15 years.\n\nClasses cover the basics: sit, stay, loose-leash walking, coming when called and, by popular demand, not eating your shoes. Classes are small (6 dogs maximum), on Saturdays at 10 am in our training yard, and you can bring the whole family.\n\nAlready adopted from us this year? You're eligible too. Reply here or call the front desk to save a spot. The next session starts this Saturday." },
  ],
  "green-seattle": [
    { hoursAgo: 6, coverText: "Every tree we plant on a city street is part of a watershed like this one. What runs off our roads ends up here.", coverTextPosition: "top", alt: "A forested mountain valley with a river running through it under a clear sky", body: "Why does a tree on Rainier Avenue matter to a river in the mountains? Because water doesn't care about city limits.\n\nWhen rain falls on pavement, it runs straight into storm drains, carrying oil, tire dust and trash into our creeks and, eventually, into the Sound and the rivers salmon depend on. A single mature street tree catches about 1,000 gallons of stormwater a year before it ever reaches a drain. Multiply that by the 1,240 trees our volunteers planted this fall, and you get more than a million gallons of runoff that won't carry pollution downstream.\n\nEvery tree counts. Our winter planting calendar is on our profile." },
    { hoursAgo: 30, coverText: "6:45 am at Seward Park. 23 volunteers, 40 saplings, and the best light of the year.", coverTextPosition: "top", alt: "Morning sun shining low through the trunks of tall pine trees", body: "6:45 am, Seward Park. 🌲 The best part of an early planting shift is this light, filtering through the old Douglas firs while the city is still asleep.\n\nBy 10 am, 23 volunteers had planted 40 native saplings (western red cedar, vine maple and Oregon grape) along the edge of the old-growth forest, where invasive ivy used to smother everything. In ten years, these will be part of the canopy.\n\nThank you to everyone who set an alarm for a Saturday. Coffee and pastries were provided; the view was free. Next early shift: November 22." },
    { hoursAgo: 55, coverText: "40 volunteers, two muddy Saturdays: the new boardwalk keeps hikers off the restored creek bank.", coverTextPosition: "top", alt: "A wooden plank footbridge on a narrow green forest trail", body: "It's open! 🎉 After two very muddy Saturdays, 40 volunteers finished the new boardwalk along Longfellow Creek.\n\nWhy a boardwalk? For three years we've been replanting the creek bank with native plants, but hikers kept cutting across the slope and trampling the new growth. The boardwalk gives everyone a dry, easy path and gives the plants a chance to take root, which in turn holds the soil together and keeps silt out of the water where coho salmon lay their eggs.\n\nBuilt from reclaimed cedar, by people who mostly had never used a power drill before. We're very proud of them." },
    { hoursAgo: 80, coverText: "Winter is planting season in the Northwest. Wet ground, cool air, and roots that settle in before spring.", coverTextPosition: "top", alt: "A creek running between snow-covered trees in a winter forest", body: "People are always surprised to hear that winter is the best time to plant trees here. ❄️\n\nIt makes sense once you think about it: the ground is soft and wet, the air is cool, and the trees are dormant, so they can spend all their energy growing roots instead of leaves. By the time summer heat arrives, a tree planted in December has had six months to settle in. Trees planted in May often struggle through their first dry season.\n\nOur winter planting calendar is out: 14 events between December and March, in eight neighborhoods. No experience needed, and we provide tools, gloves and snacks. Sign up on our profile." },
    { hoursAgo: 120, coverText: "Our volunteers visited 85 homes this fall. Average savings: $210 a year, mostly from fixes under $50.", coverTextPosition: "top", alt: "A light bulb turned into a tiny terrarium with plants inside, hanging against a dark background", body: "The greenest energy is the energy you don't use. 💡\n\nThis fall our volunteer energy coaches visited 85 households, most of them renters in older apartment buildings. In about an hour, they find the drafts, swap old bulbs for LEDs, wrap water heaters and add weatherstripping to doors and windows, all at no cost to the household.\n\nThe result: an average saving of $210 a year per home, and about 380 tons of carbon emissions avoided across all 85 visits. For many families, that's a month of groceries.\n\nBook a free visit through the link on our profile. Renters are welcome; we'll talk to your landlord if you'd like." },
    { hoursAgo: 170, coverText: "Pop quiz: do greasy pizza boxes go in recycling or compost? (Most people get this wrong.)", coverTextPosition: "top", alt: "A row of blue and green recycling bins beside a pale wall and a shuttered window", body: "Pop quiz! 🍕 Does a greasy pizza box go in recycling or compost?\n\nAnswer: compost. Grease soaks into the cardboard fibers, and one greasy box can contaminate a whole batch of recycled paper. Clean parts of the lid can be torn off and recycled; the rest goes in the green bin.\n\nOther common mix-ups: plastic bags (never in the recycling bin, they jam the sorting machines), coffee cups (most are lined with plastic, so they're garbage) and aluminum foil (recyclable, if you scrunch it into a ball the size of a fist).\n\nWe'll be at the Rainier Beach farmers market on Sunday with a sorting game. Get every item right and win a reusable coffee cup." },
    { hoursAgo: 220, coverText: "This meadow used to be a lawn. Native wildflowers need no watering after year one, and the bees love them.", coverTextPosition: "top", alt: "A meadow full of purple wildflowers under a blue sky", body: "This meadow used to be a lawn. 💜\n\nThree years ago, a school in Beacon Hill let us replace 4,000 square feet of grass with native wildflowers and grasses. Since then, the school hasn't watered it once after the first summer, hasn't mowed it more than twice a year, and the science teachers have counted 23 species of native bees on it.\n\nYou don't need a big yard to do the same. A strip of native plants along a fence or driveway helps pollinators find food all the way across the city.\n\nThis weekend we're giving away 500 free seed packets with a mix chosen for Seattle soil, outside our office, Saturday from 10 to 2." },
    { hoursAgo: 300, coverText: "That's a wrap on our fall season: 1,240 trees, 18 cleanups and more than 600 volunteers. Thank you.", coverTextPosition: "top", alt: "The sun setting over a meadow of white daisies and wild grasses", body: "That's a wrap on our fall season. 🌅\n\nBetween September and November, more than 600 of you gave a combined 3,900 hours to the city's trees, creeks and green spaces. Together we:\n• planted 1,240 trees, 80% of them on the hottest blocks in the city\n• pulled 11 tons of invasive ivy and blackberry\n• cleared 2.3 tons of trash from creek beds in 18 cleanups\n• built one boardwalk (and learned how to use a power drill)\n\nThe winter season starts in December. Until then: thank you, rest up, and keep an eye on the trees you planted. They'll be watching you, too." },
  ],
  "bright-futures": [
    { hoursAgo: 10, coverText: "Every mentee gets to pick three books to keep. We're 412 books into our goal of 1,000 by December.", coverTextPosition: "top", alt: "An open book with a pen resting on it in front of a shelf of books", body: "📚 Our winter book drive is on, and the rule is simple: every mentee picks three books to keep. Not borrow. Keep.\n\nWhy keep? Because a lot of our kids don't have a single book at home that belongs to them. Kids who grow up with books at home read more, read better and, according to a lot of research, stay in school longer. And there's something special about writing your name on the first page.\n\nWe're 412 books into our goal of 1,000 by December. New or gently used books for ages 8 to 16 can be dropped at our office, weekdays 9 to 5. Graphic novels, mysteries and anything with dragons are especially popular." },
    { hoursAgo: 34, coverText: "Jordan, 9, just finished his first chapter book. His review: \"the ending was actually good.\"", coverTextPosition: "bottom", alt: "The pages of an open book fanned out, a blurred window behind", body: "A big moment this week: Jordan, 9, read his first chapter book cover to cover. 🐉\n\nIn September, Jordan told his mentor, Priya, that he \"didn't like reading.\" It turned out he didn't like the books he'd been given. So Priya brought three different ones to their next meeting and let him choose. He picked the one with a dragon on the cover. They read the first chapter together, then he took it home.\n\nOn Tuesday he came back and asked for the next one in the series. He asked us to tell you that the ending was \"actually good\" and that the dragon should have won. We agree." },
    { hoursAgo: 60, coverText: "Everything a 6th grader needs for the school year costs about $40. You filled 300 backpacks.", coverTextPosition: "bottom", alt: "School supplies laid out on a desk: a ruler, protractor, calculator, watercolors and pencils", body: "Ruler, protractor, calculator, colored pencils, three notebooks, a binder and a backpack that will survive the year: that's about $40 for a 6th grader. For a family with three kids and a tight budget, it adds up fast.\n\nThis fall, thanks to you, 300 kids in our program started school with everything on their teacher's list. Teachers told us the difference shows on day one: kids who have their own supplies are ready to work instead of embarrassed to ask.\n\nThank you to everyone who donated, and to the 40 volunteers who packed every backpack by hand in one very loud Saturday morning." },
    { hoursAgo: 90, coverText: "Friday basketball is back: mentors vs. mentees, 4 to 6 pm. No skill required. Enthusiasm mandatory.", coverTextPosition: "top", alt: "An empty outdoor basketball court in a foggy autumn park", body: "🏀 Friday basketball is back at the community center, 4 to 6 pm.\n\nMentoring doesn't always happen across a desk. Some of the best conversations our mentors have with their mentees happen while shooting free throws, when nobody has to make eye contact and talking about a hard week feels easier.\n\nThe format: 20 minutes of warm-up, then mentors vs. mentees. Last season the mentees won 11 games to 3, and they have not let us forget it.\n\nNo skill required, enthusiasm mandatory. Mentors, bring sneakers and your dignity. You won't need the dignity for long." },
    { hoursAgo: 130, coverText: "Homework club: Tuesdays 4 to 6. Math, essays, science projects, or just a quiet place to work. Snacks included.", coverTextPosition: "bottom", alt: "A handwritten notebook lying open in dim light", body: "✏️ Homework club runs every Tuesday from 4 to 6 pm in our community room.\n\nFor a lot of our students, home isn't a quiet place to study: younger siblings, shared rooms, one laptop for the whole family. Homework club gives them a calm table, a reliable Wi-Fi connection, volunteer tutors for math and writing, and snacks (the snacks are, honestly, a big part of the attendance).\n\nLast spring, 9 in 10 of our homework club regulars moved up at least one reading level, and our math tutors helped 14 students go from failing to passing algebra.\n\nVolunteer tutors needed, especially for middle school math. Two hours a week, starting whenever you're ready." },
    { hoursAgo: 175, coverText: "Our mentors read 64 college essays this month. Every single one made us proud.", coverTextPosition: "top", alt: "A hand writing with a pen on paper, a coffee mug on the desk", body: "College application season is in full swing. ☕\n\nThis month our volunteer mentors read and gave feedback on 64 personal essays from high school seniors in our program. Many of them are the first in their families to apply to college, which means nobody at home has been through the process before.\n\nThe essays were about a grandmother's restaurant, translating at a parent's doctor's appointments, learning to code on a library computer, and moving countries at age 11. Every one of them made us cry at least a little.\n\nThe first early decision results come out in December. We'll be refreshing inboxes alongside them." },
    { hoursAgo: 240, coverText: "23 kids are on our waiting list for a mentor. One hour a week is all it takes to change one kid's year.", coverTextPosition: "top", alt: "A soccer ball on a grass field at sunset with a goal in the background", body: "Right now, 23 kids are on our waiting list for a mentor. Some of them have been waiting since the summer.\n\nHere's what being a mentor actually involves: one hour a week, for at least a year, doing something together. That might be homework, soccer, cooking, a trip to the library or just walking and talking. We match you carefully based on interests and schedules, train you in one Saturday morning session, and check in with you every month.\n\nYou don't need to be a teacher or a role model with everything figured out. You just need to show up. That's the part kids remember.\n\nThe next mentor training is December 6. Sign up on our profile." },
    { hoursAgo: 320, coverText: "Field trip! 18 mentees toured the downtown library. All 18 left with a library card. 3 asked to move in.", coverTextPosition: "middle", alt: "Tall library shelves packed with colorful books and a wooden ladder", body: "Field trip! 🚌 Eighteen of our mentees spent Saturday morning touring the downtown library with their mentors.\n\nThey saw the rare book room, the recording studio where you can make your own music for free, and the tenth-floor reading room with a view over the whole city. They also learned that a library card gets you free e-books, audiobooks, museum passes and even laptops to borrow.\n\nEvery one of the 18 left with their own library card. Three of them asked if they could live there. One asked if there was a job opening. We said to check back in about seven years." },
  ],
  "open-pantry": [
    { hoursAgo: 5, coverText: "Peas, radishes and zucchini picked yesterday morning, on our shelves today. Fresh food, not just cans.", coverTextPosition: "middle", alt: "Close-up of fresh vegetables: green peas, radishes and zucchini", body: "🥬 Fresh food, not just cans.\n\nFor years, most of what we could offer was shelf-stable: canned beans, pasta, rice. It kept people fed, but it's not what anyone would choose for their kids. This year, three local farms started sending us their extra harvest every week, and our walk-in fridge has never been fuller.\n\nThis week's produce: sugar snap peas, radishes and zucchini, picked yesterday morning. Every family that visits the pantry goes home with at least 10 pounds of fresh vegetables, plus recipe cards in English, Spanish, Vietnamese and Somali.\n\nThe pantry is open Tuesdays and Thursdays, 10 to 2. No ID, no forms, no questions." },
    { hoursAgo: 28, coverText: "Today's soup was made from vegetables that would have gone to waste. 140 bowls, zero leftovers.", coverTextPosition: "top", alt: "Carrots, onions and potatoes in bowls on a kitchen counter", body: "Today's community kitchen menu: roasted root vegetable soup with fresh bread, and apple crisp for dessert. 🥕\n\nEvery vegetable in that soup came from food that would otherwise have been thrown away: carrots too crooked for the grocery store, onions from a farm's oversupply, potatoes donated by a restaurant that over-ordered. Our volunteer chef, Teresa, plans the menu each Thursday based on whatever arrived that week. She calls it \"cooking with a surprise box.\"\n\nWe served 140 bowls today, at real tables with real plates, and had zero leftovers. Community kitchen is open every Friday, 11:30 to 1:30. Everyone is welcome; there's no line to check in." },
    { hoursAgo: 52, coverText: "Every evening, two bakeries give us the bread they didn't sell. That's 300 loaves a week, saved.", coverTextPosition: "middle", alt: "Wooden bakery shelves stacked with fresh loaves of bread", body: "🍞 Every evening at 7, a volunteer drives to two neighborhood bakeries and picks up the bread they didn't sell that day. Every morning at 10, it's on our shelves.\n\nThat's about 300 loaves a week, from sourdough to sandwich bread to the occasional slightly squashed cinnamon roll, that would otherwise end up in a dumpster. Bread is one of the most requested items at the pantry, and also one of the most expensive to buy fresh.\n\nWe're looking for two more volunteer drivers for the evening bakery run, Mondays and Wednesdays. It takes about 40 minutes and you'll smell incredible afterwards." },
    { hoursAgo: 78, language: "es", alt: "A wooden crate full of fresh green zucchini", body: "¡Gracias a los voluntarios del jardín comunitario de South Park! 🥒 Esta semana nos donaron más de 200 calabacines, cosechados a mano el sábado por la mañana.\n\nSi necesitas comida fresca, la despensa abre los martes y jueves de 10 a 2. No se necesita identificación ni ningún documento, y siempre hay voluntarios que hablan español. También tenemos tarjetas de recetas: esta semana, calabacitas con elote y una sopa muy fácil para los niños.\n\n¿Tienes un jardín y te sobran verduras? Tráelas cualquier martes. Todo se reparte el mismo día." },
    { hoursAgo: 110, coverText: "Too many of our neighbors skip meals so their kids don't have to. $10 puts fresh fruit on their table for a week.", coverTextPosition: "bottom", alt: "Red apples in a wooden crate with one apple in the front", body: "Last month, a mom told one of our volunteers that before she found us, she had been eating once a day so her two kids could eat three times. She works full time. Rent went up $300 this year; her paycheck didn't.\n\nShe's not unusual. More than half of the families who visit the pantry now have at least one adult working full time. Food is often the first thing people cut when money runs short, because rent and electricity can't wait.\n\nA $10 gift puts fresh fruit on a family's table for a week. $50 covers a full week of groceries for a family of four. Every dollar stays in our neighborhood." },
    { hoursAgo: 160, coverText: "Gleaning day: 31 volunteers picked 1,800 pounds of apples an orchard couldn't sell.", coverTextPosition: "middle", alt: "A crate full of red apples seen from above", body: "🍎 Gleaning day! On Saturday, 31 volunteers spent the morning at an orchard in the valley picking apples that the farmer couldn't sell, because they were too small or slightly marked for grocery stores.\n\nThe result: 1,800 pounds of perfectly delicious apples, which would otherwise have been left to rot on the ground. They'll be at the pantry and on the mobile pantry route all month, and our community kitchen is already planning applesauce, apple crisp and something Teresa is mysteriously calling \"apple surprise.\"\n\nWe have three more gleaning days before the season ends. Families are welcome, and kids are excellent apple pickers." },
    { hoursAgo: 210, coverText: "New mobile pantry stop in White Center: Thursdays, 3 to 5. Fresh food, no sign-up, no questions.", coverTextPosition: "middle", alt: "A market stall with boxes of green beans, cucumbers, tomatoes and peppers", body: "🚚 New mobile pantry stop: White Center, every Thursday from 3 to 5 pm, starting this week.\n\nWe added this stop because so many families told us the same thing: they couldn't get to the pantry during working hours, and the bus ride takes almost an hour each way. So we're bringing the pantry to them, after school pickup, a short walk from three apartment complexes.\n\nThe truck carries about 2,000 pounds of food each trip: fresh produce, milk, eggs, bread and pantry staples. No sign-up, no ID, no questions. Just bring a bag (or take one of ours).\n\nWe need four volunteers each Thursday to hand out food. Spanish, Vietnamese or Somali speakers especially welcome." },
    { hoursAgo: 280, coverText: "Thank you to the farmers market vendors who send us their unsold produce. You fed 90 families last month.", coverTextPosition: "top", alt: "Leeks and carrots piled on a market table", body: "A thank-you note to some quiet heroes: the farmers at the Saturday market. 🥕\n\nEvery Saturday at 2 pm, when the market closes, our volunteers go stall to stall with crates. Whatever the farmers didn't sell (leeks, carrots, greens, berries, sometimes whole boxes of tomatoes) comes back to the pantry and is on our shelves by Tuesday morning.\n\nLast month, that added up to 3,400 pounds of fresh produce and fed about 90 families. The farmers don't get a tax receipt for most of it, and they don't ask for one. When we thanked one of them, he just said: \"Better on someone's table than in my compost.\"\n\nNext time you're at the market, buy an extra bunch of carrots and tell them Open Pantry says hi." },
  ],
  "new-roots": [
    { hoursAgo: 7, coverText: "A family of five arrived in March with four suitcases. This week they got the keys to their first apartment.", coverTextPosition: "top", alt: "A hand holding a set of house keys with a green key tag, homes blurred in the background", body: "🔑 This week, a family of five who arrived in Seattle in March got the keys to their first apartment.\n\nFor seven months they lived in a hotel room and then with a host family, while our housing team helped with everything a rental application asks for and they didn't have yet: a credit history, a landlord reference, proof of income. Our volunteers translated the lease line by line, and a donor covered the deposit.\n\nOn moving day, eight volunteers showed up with a truck full of donated furniture. The youngest, who is six, picked the room with the window and announced it was hers.\n\nA welcome kit for a new home costs about $300. Every one we give out starts a story like this one." },
    { hoursAgo: 32, coverText: "Friday welcome dinner: everyone brings a dish from home. Last week, food from 11 countries on one table.", coverTextPosition: "middle", alt: "Plates of curry, flatbread and chutney on a wooden table, seen from above", body: "🍛 Our Friday welcome dinner has one rule: everyone brings a dish from home.\n\nLast week, the table had chicken curry and fresh roti from a family from Afghanistan, Ukrainian varenyky, Eritrean injera with lentils, pupusas, and a volunteer's very ambitious attempt at baklava. Eleven countries, about 70 people, and three new families who had arrived that same week.\n\nFor someone new in a strange city, a dinner like this is often the first time they meet a neighbor who isn't helping them fill out a form. The kids play, the adults swap recipes in four languages, and nobody leaves hungry.\n\nEveryone is welcome. Fridays at 6 pm in the community hall. Bring a dish, or just bring yourself." },
    { hoursAgo: 58, coverText: "Our English circles are full. We're adding two more, and we need four volunteer hosts. No teaching experience needed.", coverTextPosition: "middle", alt: "Close-up of a page in a dictionary", body: "📖 Good news and a request.\n\nThe good news: our English conversation circles are completely full. 86 adults now meet every week in small groups to practice everyday English: ordering at a pharmacy, calling a child's school, talking to a boss about a schedule.\n\nThe request: we're opening two new circles, Monday evenings and Wednesday mornings, and we need four more volunteer hosts. You don't need to be a teacher. Hosts guide a relaxed conversation for an hour with a topic card we provide. What matters is patience, a friendly face and being comfortable with a few awkward silences.\n\nOne of our longtime hosts says it's \"the best hour of my week, and I've learned more than they have.\" Sign up on our profile." },
    { hoursAgo: 86, language: "uk", alt: "Colorful pins stuck into a map, lit by warm light", body: "📍 Наші волонтери допомагають новим сім'ям знайти все необхідне поруч із домом: школу для дітей, лікаря, найближчу аптеку, продуктовий магазин і роботу.\n\nЦього місяця ми допомогли 23 родинам. Ми ходимо разом на перший прийом до лікаря, допомагаємо записати дітей до школи та показуємо, як користуватися автобусом. У нас є волонтери, які говорять українською, і всі консультації безкоштовні.\n\nЯкщо вам потрібна допомога, напишіть нам повідомлення тут або приходьте у четвер о 14:00 на «годину чаю та документів»." },
    { hoursAgo: 125, coverText: "12 garden plots are now reserved for newly arrived families. Growing the food you grew up with heals homesickness.", coverTextPosition: "bottom", alt: "A community garden with raised beds, flowers and a small glass greenhouse", body: "🌱 Twelve plots in the community garden are now reserved for newly arrived families, and every one of them is taken.\n\nWe started this program after a grandmother from Syria told one of our volunteers that the thing she missed most wasn't her house. It was her garden. So this spring, families planted what they grew up with: Afghan leeks, Ukrainian dill and beets, Guatemalan chipilín, Eritrean hot peppers.\n\nIt turns out that growing the vegetables you grew up with is one of the best cures for homesickness we've found. It's also a great way to meet the neighbors, who keep wandering over to ask what everything is.\n\nSeeds, tools and a greenhouse are shared. Next season's plots open in February." },
    { hoursAgo: 165, coverText: "Tea and paperwork hour, every Thursday at 2. Bring your forms and your questions. Interpreters on site.", coverTextPosition: "top", alt: "A hand holding a cup of ginger and lemon tea", body: "☕ Tea and paperwork hour, every Thursday at 2 pm.\n\nA new life in the U.S. comes with a mountain of forms: work permits, school enrollment, health insurance, the DMV, a lease, a letter from the IRS that nobody understands. It's overwhelming even in your first language.\n\nSo every Thursday, we put the kettle on and sit down with whoever comes in. Bring your forms, your questions and your appetite for cookies. Our trained volunteers help fill things out and explain what each letter means, and interpreters for Ukrainian, Dari, Spanish and Tigrinya are on site. Last month, 64 people came through the door.\n\nNo appointment needed. The tea is ginger and lemon, and it's very good." },
    { hoursAgo: 230, coverText: "Since January, we've welcomed families from 31 countries. Each one arrived with a story. Now they're part of ours.", coverTextPosition: "bottom", alt: "A map of the world showing the oceans and continents", body: "🌍 Since January, New Roots has welcomed 214 families from 31 countries, from Afghanistan to Venezuela.\n\nThey arrived with suitcases, children, diplomas that need translating, and stories that would break your heart. And then, week by week, those stories changed: a first apartment, a first paycheck, a kid's first report card in English, a driver's license, a nursing certificate.\n\nWhat they need from us is mostly simple: a friendly person to call, a ride to an appointment, help with a form, a seat at a dinner table. What they give back is just as simple: many of the volunteers at our Thursday clinic first came through our doors as new arrivals themselves.\n\nThank you for being part of the story." },
    { hoursAgo: 310, coverText: "Learning the bus system is step one of a new life. Our volunteers ride along on the first trips.", coverTextPosition: "top", alt: "An autumn city street with yellow leaves, a sidewalk and a bus stop", body: "🚌 Here's something most of us don't think about: how do you get to a job interview in a city you've never seen, with a transit app in a language you don't read yet?\n\nThat's why our volunteers ride along on the first trips: to school, to work, to the clinic, to the grocery store. They show families how to read a schedule, load a transit card, and which stop to get off at when the announcement is too fast to understand.\n\nOne of our volunteers, a retired bus driver, has done 140 ride-alongs this year. He says the best part is the day someone texts him: \"I made it by myself.\"\n\nNew families get a free transit pass for their first month, funded by donors like you." },
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
export const reels: Record<string, { caption: string; coverText?: string; coverTextPosition?: "top" | "middle" | "bottom"; hoursAgo: number }[]> = {
  "paws-haven": [
    { caption: "Take me home 🐶 Every dog in our care is waiting for a family. Adoption Day is this Saturday, 11 to 3.", coverText: "He's been waiting 94 days. All he wants is someone to come back for him.", coverTextPosition: "top", hoursAgo: 20 },
    { caption: "From scared stray to boat captain: six weeks with a foster family. Fostering changes everything.", coverText: "6 weeks ago she was too scared to leave her crate. Look at her now.", coverTextPosition: "top", hoursAgo: 60 },
    { caption: "Kitten season: these four are ready for a foster home. Three weeks, a spare bathroom, and we cover everything else.", coverText: "4 kittens, 1 bed, 0 personal space. They need a foster home by Friday.", coverTextPosition: "top", hoursAgo: 120 },
    { caption: "Frisbee, nap, repeat. Sunny is 2, fully vaccinated and looking for a family with a yard.", coverText: "Sunny was found tied to a fence in August. Today all she cares about is her frisbee.", coverTextPosition: "top", hoursAgo: 12 },
    { caption: "Ginger spent her first week hiding under the bed. Now she runs to the door. That's what a foster home does.", coverText: "When Ginger arrived, she wouldn't come out from under the bed. 3 weeks later:", coverTextPosition: "bottom", hoursAgo: 44 },
    { caption: "Our volunteers spend an hour a day just petting the cats. It's on the schedule. It matters.", coverText: "Shelter cats who are petted every day get adopted twice as fast. So we put it on the schedule.", coverTextPosition: "bottom", hoursAgo: 96 },
  ],
  "green-seattle": [
    { caption: "Healthy forests keep our creeks cool and clean. Help us plant 300 more trees this fall.", coverText: "Shade from trees keeps creeks cool enough for salmon. We planted 1,240 this fall.", coverTextPosition: "middle", hoursAgo: 30 },
    { caption: "A creek running clear again after our volunteer cleanup.", coverText: "This creek bed held 400 pounds of trash in June. This is what it looks like now.", coverTextPosition: "top", hoursAgo: 90 },
    { caption: "Protecting habitat means protecting everyone who lives there.", coverText: "When we protect a forest, we protect everyone who lives in it. Every single one.", coverTextPosition: "top", hoursAgo: 140 },
    { caption: "Every tree we plant is a small piece of a forest like this one. Planting season runs through March.", coverText: "Winter is the best time to plant a tree in the Northwest. Here's why 👇", coverTextPosition: "middle", hoursAgo: 18 },
    { caption: "Clean water starts upstream. Our creek teams clear trash and invasive ivy every second Saturday.", coverText: "Clean water starts upstream. Our creek teams are out every second Saturday.", coverTextPosition: "middle", hoursAgo: 66 },
    { caption: "Mornings like this are why we do it. Thank you to the 600 volunteers who gave their weekends this year.", coverText: "600 volunteers gave up their Saturday mornings this year. This is what they protected.", coverTextPosition: "middle", hoursAgo: 110 },
  ],
  "open-pantry": [
    { caption: "Some neighbors can't make it to the pantry, so the pantry comes to them.", coverText: "Some neighbors can't get to the pantry, so every Thursday the pantry goes to them.", coverTextPosition: "top", hoursAgo: 15 },
    { caption: "Fresh bread from Friday's community kitchen.", coverText: "This bread was baked this morning and would have been thrown out tonight. Not anymore.", coverTextPosition: "top", hoursAgo: 75 },
    { caption: "Three partner farms, one goal: fresh food for every family that walks in. Produce days are Tuesdays and Thursdays.", coverText: "For years we could only give out cans. Then three local farms called us.", coverTextPosition: "top", hoursAgo: 22 },
    { caption: "Every evening, bakeries and orchards send us what they couldn't sell. Every morning, it feeds our neighbors.", coverText: "300 loaves and 1,800 pounds of apples a week, saved from the dumpster.", coverTextPosition: "top", hoursAgo: 58 },
    { caption: "Nothing goes to waste in our community kitchen. Today's soup: roasted roots, 140 bowls.", coverText: "Crooked carrots, extra onions, leftover potatoes = soup for 140 neighbors.", coverTextPosition: "top", hoursAgo: 100 },
    { caption: "This week's produce boxes: carrots, peppers, tomatoes and radishes from three partner farms.", coverText: "What's in this week's free produce box (picked yesterday, on our shelves today):", coverTextPosition: "bottom", hoursAgo: 9 },
    { caption: "Washed, sorted and ready by 10 am. Thank you to our Tuesday volunteer crew!", coverText: "Every Tuesday at 7 am, 12 volunteers wash and sort 2,000 pounds of produce. By hand.", coverTextPosition: "top", hoursAgo: 70 },
  ],
  "bright-futures": [
    { caption: "Our winter book drive: every mentee picks three books to keep. 412 books in, 588 to go.", coverText: "Many of our kids don't own a single book. This winter, every one of them gets three.", coverTextPosition: "top", hoursAgo: 16 },
    { caption: "Homework club, Tuesdays 4 to 6 in our community room. Math, essays, science projects, snacks.", coverText: "No quiet place to study at home? Homework club: Tuesdays 4 to 6. Snacks included.", coverTextPosition: "top", hoursAgo: 52 },
    { caption: "Basketball on Fridays, soccer on Saturdays. Mentoring doesn't always happen at a desk.", coverText: "Some of the best mentoring conversations happen when nobody has to make eye contact.", coverTextPosition: "top", hoursAgo: 88 },
    { caption: "Every mentee leaves the winter book drive with three books of their own. Help us reach 1,000.", coverText: "Jordan told us he hated reading. Turns out he just needed a book with a dragon in it.", coverTextPosition: "top", hoursAgo: 6 },
    { caption: "Saturday soccer is back. Mentors, mentees and a lot of very muddy shoes.", coverText: "Mentees vs. mentors, every Saturday. Last season the mentees won 11 to 3.", coverTextPosition: "top", hoursAgo: 40 },
  ],
  "new-roots": [
    { caption: "From the first night in a new city to the keys to a first home. This is what your support makes possible.", coverText: "They arrived with 4 suitcases in March. This week they got the keys to their first home.", coverTextPosition: "top", hoursAgo: 14 },
    { caption: "Friday welcome dinners: every family brings a dish from home, and nobody leaves hungry.", coverText: "Every Friday, families from 11 countries share one table. Everyone brings a dish from home.", coverTextPosition: "top", hoursAgo: 48 },
    { caption: "English circles, school enrollment, bus routes, job applications. Our volunteers help with all of it.", coverText: "Since January we've welcomed families from 31 countries. Here's how we help them start over.", coverTextPosition: "top", hoursAgo: 92 },
    { caption: "A first morning in a new city. We're there for the second, the third and every one after.", coverText: "Your first morning in a new country is the loneliest. We make sure nobody spends it alone.", coverTextPosition: "bottom", hoursAgo: 11 },
    { caption: "Our volunteers ride along on the first trips to work, to school and to the clinic.", coverText: "How do you get to a job interview in a city you've never seen? Someone rides along.", coverTextPosition: "top", hoursAgo: 36 },
    { caption: "Some of our families haven't seen their relatives in years. A video call can mean everything. Your gifts fund phones and data plans.", coverText: "Some of our families haven't seen their parents in 4 years. A phone call can mean everything.", coverTextPosition: "top", hoursAgo: 75 },
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
