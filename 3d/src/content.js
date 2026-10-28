/**
 * Content model for the TECHFEST 3.0 "Core" experience.
 * Kept separate from the 3D layer so the same data can drive
 * the DOM overlay, the 3D scene and the no-WebGL fallback.
 */

export const EVENT = {
  name: 'TECHFEST',
  edition: '3.0',
  tagline: 'Unleash your inner cyborg',
  dates: '19 — 22 FEB 2027',
  venue: 'IIT BOMBAY · POWAI',
  countdownTarget: '2027-02-19T09:00:00+05:30'
};

export const STATS = [
  { value: 120, suffix: '+', label: 'Events', note: 'across eight domains' },
  { value: 60, suffix: '+', label: 'Teams', note: 'from 300+ colleges' },
  { value: 25, suffix: 'K', label: 'Footfall', note: 'four days, one campus' },
  { value: 40, prefix: '₹', suffix: 'L', label: 'Prize pool', note: 'paid out on stage' }
];

export const DOMAINS = [
  {
    id: 'D-01',
    name: 'Web Development',
    short: 'WEB',
    color: 0x00f0ff,
    blurb: 'Ship production-grade interfaces, APIs and realtime systems under a 36-hour sprint.',
    detail:
      'Thirty-six hours, one repo, real deployments. Teams are judged on working software, code quality and the number of real users served before the deadline. Mentors from product teams run a 15-minute-response floor.',
    stats: [['42', 'events'], ['₹6L', 'prize pool'], ['1,200', 'seats']]
  },
  {
    id: 'D-02',
    name: 'AI & Machine Learning',
    short: 'AI',
    color: 0xa06bff,
    blurb: 'Train, fine-tune and deploy models against live datasets with public leaderboard scoring.',
    detail:
      'Models are scored on a hidden test set every hour. A public leaderboard is live from the first hour, and the final evaluation runs a full inference-cost audit alongside accuracy.',
    stats: [['31', 'events'], ['₹8L', 'prize pool'], ['24h', 'live scoring']]
  },
  {
    id: 'D-03',
    name: 'Robotics & Automation',
    short: 'ROB',
    color: 0xff2d95,
    blurb: 'Autonomous bots, swarms and CV pipelines on the arena floor. Bring your own chassis.',
    detail:
      'A 22 × 14 m arena with a live scoring grid, six autonomous platforms to borrow and a full pit crew on standby. Declare chassis requirements by 5 February.',
    stats: [['24', 'events'], ['₹7L', 'prize pool'], ['22×14m', 'arena']]
  },
  {
    id: 'D-04',
    name: 'Cybersecurity',
    short: 'SEC',
    color: 0xb6ff3c,
    blurb: 'Capture-the-flag, red-team simulation and hardware attacks against our own rigs.',
    detail:
      'Three difficulty tiers running in parallel, plus a live red-team simulation of a fictional bank. Hardware hacking gets its own bench with scope and teardown stations.',
    stats: [['18', 'events'], ['₹4L', 'prize pool'], ['12h', 'CTF grid']]
  },
  {
    id: 'D-05',
    name: 'Game Development',
    short: 'GME',
    color: 0x00f0ff,
    blurb: 'Unity and Unreal jams with a public showcase floor and a 72-hour game-jam arena.',
    detail:
      'A continuous 24-hour jam with critic desks, a public showcase floor and every build streamed live. The winning team gets a publishing partner and a crate of dev hardware.',
    stats: [['14', 'events'], ['₹3L', 'prize pool'], ['24h', 'jam']]
  },
  {
    id: 'D-06',
    name: 'Design & Creativity',
    short: 'DSN',
    color: 0xffb020,
    blurb: 'Brand systems, motion identity and product design judged by working studio leads.',
    detail:
      'No slides. You get a live canvas, a real brief and ninety minutes. Working studio leads critique the work, and every project is shot for the public archive.',
    stats: [['12', 'events'], ['₹2L', 'prize pool'], ['90min', 'teardown']]
  },
  {
    id: 'D-07',
    name: 'Marketing & Media',
    short: 'MED',
    color: 0xff2d95,
    blurb: 'Campaigns, creator labs and a real-time social-ops war room run by the media team.',
    detail:
      'A live war room where teams run campaigns against real audiences and real budgets. The creator lab gives you a camera, a crew and a deadline of two hours.',
    stats: [['16', 'events'], ['₹2L', 'prize pool'], ['2h', 'creator lab']]
  },
  {
    id: 'D-08',
    name: 'Social Outreach',
    short: 'SOC',
    color: 0xa06bff,
    blurb: 'Build for impact — accessibility, sustainability and civic-tech problems on the ground.',
    detail:
      'Briefs supplied by real NGOs and municipal bodies, with a deployment path if the project works. Past winners are still running in the community.',
    stats: [['11', 'events'], ['₹2L', 'prize pool'], ['9', 'NGOs']]
  }
];

export const DAYS = [
  {
    day: 'DAY 01',
    date: '19 FEB',
    items: [
      { time: '09:00', title: 'Opening Ceremony & Neural Handshake', track: 'Main Stage' },
      { time: '11:00', title: 'Web Dev Sprint — Kickoff', track: 'Web Development' },
      { time: '14:30', title: 'Robotics Arena — Calibration', track: 'Robotics' },
      { time: '19:00', title: 'Cyborg Nights', track: 'Social' }
    ]
  },
  {
    day: 'DAY 02',
    date: '20 FEB',
    items: [
      { time: '10:00', title: 'AI Model Wars — Fine-tune Finale', track: 'AI & ML' },
      { time: '13:00', title: 'CTF Grid — Round One', track: 'Cybersecurity' },
      { time: '16:00', title: 'Creator Lab: Volumetric Capture', track: 'Media' },
      { time: '20:00', title: 'Quiz: The Cyber Nexus', track: 'Creatives' }
    ]
  },
  {
    day: 'DAY 03',
    date: '21 FEB',
    items: [
      { time: '09:30', title: 'Game Jam — Continuous Build', track: 'Game Dev' },
      { time: '12:00', title: 'Startup Bootcamp — Pitch Clinic', track: 'Startups' },
      { time: '15:30', title: 'Quadrotor Swarm Trials', track: 'Robotics' },
      { time: '18:30', title: 'Design Systems Teardown', track: 'Design' }
    ]
  },
  {
    day: 'DAY 04',
    date: '22 FEB',
    items: [
      { time: '10:00', title: 'Final Evaluations', track: 'All Domains' },
      { time: '14:00', title: 'Grand Showcase', track: 'Main Stage' },
      { time: '17:00', title: 'Closing Ceremony & Awards', track: 'Main Stage' },
      { time: '20:00', title: 'Afterglow', track: 'Social' }
    ]
  }
];

export const SPEAKERS = [
  { name: 'Dr. Ananya Rao', role: 'Principal Research Engineer · Synapse', talk: 'Efficient inference and why smaller models win.' },
  { name: 'Karthik Menon', role: 'Founder · Halo Autonomy', talk: 'The parts of hardware nobody posts about.' },
  { name: 'Nia Okafor', role: 'Head of Offensive Security · Nullsector', talk: 'How a five-minute compromise actually unfolds.' },
  { name: 'Ren Takahashi', role: 'Director of Experience Design · Kira', talk: 'The craft behind interfaces you forget exist.' },
  { name: 'Priya Raghunathan', role: 'Head of Platform · Nimbus Robotics', talk: 'Autonomy stacks that fail politely instead of loudly.' },
  { name: 'Samuel Adeyemi', role: 'CTF Author · Nullsector', talk: 'Weaponising the humble login form.' },
  { name: 'Mei-Ling Chow', role: 'Creative Technologist · Paper Lantern', talk: 'Real-time graphics in the browser, without the pain.' },
  { name: 'Arjun Deshmukh', role: 'Game Director · Tessellate', talk: 'Designing worlds players describe in one word.' }
];

/**
 * Chapter definitions. Each chapter owns a camera keyframe, a 3D focus
 * target and the copy that surfaces in the DOM overlay.
 */
export const CHAPTERS = [
  {
    id: 'ignition',
    index: '00',
    title: 'IGNITION',
    kicker: 'The core is live',
    body: 'Eight domains. Four days. One machine.',
    camera: { pos: [0, 3.4, 16], look: [0, -1.4, 0], fov: 52 }
  },
  {
    id: 'eight',
    index: '01',
    title: 'THE EIGHT',
    kicker: 'Pick your track',
    body: 'Eight disciplines orbit the core. Click one to inspect it.',
    camera: { pos: [0, 5.2, 13], look: [0, -0.7, 0], fov: 48 }
  },
  {
    id: 'arena',
    index: '02',
    title: 'THE ARENA',
    kicker: 'Where it happens',
    body: 'Two floors, zero velvet ropes. Everything is running live.',
    camera: { pos: [-9, 3.4, 11], look: [0, -2.2, -10], fov: 62 }
  },
  {
    id: 'crown',
    index: '03',
    title: 'THE CROWN',
    kicker: 'Forty lakh, on stage',
    body: 'Every domain pays out. No exceptions, no participation trophies.',
    camera: { pos: [0, 2.0, -14], look: [0, -1.3, -26], fov: 46 }
  },
  {
    id: 'uplink',
    index: '04',
    title: 'UPLINK',
    kicker: 'Connect',
    body: 'Claim your pass. The grid is already listening.',
    camera: { pos: [0, 1.6, 20], look: [0, -0.6, 0], fov: 54 }
  }
];
