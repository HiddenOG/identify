// Ten CVs in different layouts, each with what a good import should find.
// Rendered to PDF (and one DOCX) by make-files.mjs; scored by run.ts.

const css = `body{font-family:Arial,sans-serif;font-size:11pt;margin:36px;color:#111} h1{margin:0;font-size:22pt} h2{font-size:12pt;margin:18px 0 6px;border-bottom:1px solid #999} p,li{margin:2px 0}`;
const page = (body, extra = "") => `<html><head><style>${css}${extra}</style></head><body>${body}</body></html>`;

export const FIXTURES = [
  {
    id: "01-classic-tech",
    note: "single column, standard headings",
    expect: { name: "Adaeze Okafor", email: "adaeze.okafor@gmail.com", phone: true, jobs: 2, schools: 1, skills: 4 },
    html: page(`<h1>Adaeze Okafor</h1><p>Frontend Developer</p><p>Lagos, Nigeria</p><p>adaeze.okafor@gmail.com · +234 803 123 4567 · github.com/adaeze</p>
<h2>Summary</h2><p>Frontend developer with four years of experience building fast, accessible web apps for fintech and e-commerce.</p>
<h2>Experience</h2><p><b>Senior Frontend Developer</b> at Paystack</p><p>Jan 2022 - Present</p><ul><li>Rebuilt the merchant dashboard in React and TypeScript, cutting load time by 40%.</li><li>Led a team of three engineers.</li></ul>
<p><b>Frontend Developer</b> at Andela</p><p>Jun 2019 - Dec 2021</p><ul><li>Built client projects in Vue and Next.js.</li></ul>
<h2>Education</h2><p>B.Sc Computer Science, University of Lagos, 2019</p>
<h2>Skills</h2><p>React, TypeScript, Accessibility, Performance</p>`),
  },
  {
    id: "02-two-column",
    note: "Canva-style sidebar: contact + skills on the left",
    expect: { name: "Tunde Bakare", email: "tunde.bakare@outlook.com", phone: true, jobs: 2, schools: 1, skills: 4 },
    html: page(`<div class="side"><h1>Tunde Bakare</h1><p>Data Analyst</p><h2>Contact</h2><p>tunde.bakare@outlook.com</p><p>+234 812 555 0199</p><p>Abuja, Nigeria</p><h2>Skills</h2><ul><li>SQL</li><li>Power BI</li><li>Python</li><li>Excel</li></ul></div>
<div class="main"><h2>Profile</h2><p>Analyst who turns messy operational data into dashboards that managers actually use.</p><h2>Work Experience</h2><p><b>Data Analyst</b>, MTN Nigeria</p><p>Mar 2021 – Present</p><ul><li>Built 12 Power BI dashboards for network operations.</li></ul><p><b>Junior Analyst</b>, Jumia</p><p>Jan 2019 – Feb 2021</p><ul><li>Automated weekly sales reports with Python.</li></ul><h2>Education</h2><p>B.Sc Statistics, University of Ibadan</p><p>2014 - 2018</p></div>`,
      `.side{position:absolute;left:36px;top:36px;width:200px}.main{margin-left:250px}`),
  },
  {
    id: "03-caps-pipes",
    note: "ALL CAPS headings with colons; Role | Company | City on one line with dates",
    expect: { name: "Chiamaka Eze", email: "chiamaka.eze@yahoo.com", phone: true, jobs: 2, schools: 1, skills: 3 },
    html: page(`<h1>CHIAMAKA EZE</h1><p>Product Designer</p><p>chiamaka.eze@yahoo.com | 0809 222 3344</p>
<h2>PROFESSIONAL SUMMARY:</h2><p>Product designer focused on simple, research-led mobile experiences.</p>
<h2>PROFESSIONAL EXPERIENCE:</h2><p>Product Designer | Kuda Bank | Lagos   Feb 2021 – Present</p><ul><li>Redesigned onboarding, raising completion from 61% to 78%.</li></ul>
<p>UI Designer | Cowrywise | Remote   Aug 2019 – Jan 2021</p><ul><li>Designed the savings goals feature.</li></ul>
<h2>EDUCATION:</h2><p>B.A. Fine and Applied Arts — University of Nigeria, Nsukka (2018)</p>
<h2>SKILLS:</h2><p>Figma; User research; Prototyping</p>`),
  },
  {
    id: "04-nurse-non-tech",
    note: "healthcare CV: Certifications, Clinical Experience, year-only dates",
    expect: { name: "Grace Adeyemi", email: "grace.adeyemi@gmail.com", phone: true, jobs: 2, schools: 2, skills: 3 },
    html: page(`<h1>Grace Adeyemi</h1><p>Registered Nurse (RN, RM)</p><p>Ibadan, Nigeria · grace.adeyemi@gmail.com · 08031234567</p>
<h2>Objective</h2><p>Compassionate registered nurse with seven years of ward and theatre experience.</p>
<h2>Clinical Experience</h2><p>Senior Staff Nurse, University College Hospital, Ibadan</p><p>2019 - Present</p><ul><li>Coordinate a 30-bed surgical ward.</li></ul><p>Staff Nurse, Adeoyo Maternity Hospital</p><p>2016 - 2019</p><ul><li>Assisted over 400 deliveries.</li></ul>
<h2>Education</h2><p>B.N.Sc Nursing Science, Obafemi Awolowo University, 2016</p><p>Registered Midwife Certificate, 2017</p>
<h2>Key Skills</h2><p>Patient care, Wound management, Triage</p>`),
  },
  {
    id: "05-nigerian-traditional",
    note: "Personal Data block, Career Objective, Referees",
    expect: { name: "Emeka Nwosu", email: "emeka.nwosu@gmail.com", phone: true, jobs: 2, schools: 2, skills: 3 },
    html: page(`<h1>CURRICULUM VITAE</h1><h2>Personal Data</h2><p>Name: Emeka Nwosu</p><p>Date of Birth: 12th May 1992</p><p>State of Origin: Anambra</p><p>Phone: 0705 444 8899</p><p>Email: emeka.nwosu@gmail.com</p>
<h2>Career Objective</h2><p>To work in a challenging environment where my accounting skills contribute to the growth of the organisation.</p>
<h2>Educational Qualifications</h2><p>Nnamdi Azikiwe University, Awka — B.Sc Accountancy (2014)</p><p>ICAN Professional Certificate (2017)</p>
<h2>Work Experience</h2><p>Accountant, Dangote Cement Plc</p><p>2018 - Date</p><ul><li>Prepared monthly management accounts.</li></ul><p>Accounts Officer, First Bank of Nigeria</p><p>2015 - 2018</p><ul><li>Reconciled branch accounts.</li></ul>
<h2>Skills</h2><p>Financial reporting, Sage, Microsoft Excel</p><h2>Referees</h2><p>Available on request</p>`),
  },
  {
    id: "06-table-layout",
    note: "experience in a table: dates in the left column",
    expect: { name: "Ifeoma Obi", email: "ifeoma@obi.dev", phone: false, jobs: 2, schools: 1, skills: 3 },
    html: page(`<h1>Ifeoma Obi</h1><p>Backend Engineer · ifeoma@obi.dev · Port Harcourt, Nigeria</p>
<h2>Experience</h2><table><tr><td>2021 – Present</td><td><b>Backend Engineer</b>, Flutterwave<br>Designed payment reconciliation services in Go.</td></tr><tr><td>2019 – 2021</td><td><b>Software Engineer</b>, Interswitch<br>Maintained card switching APIs in Java.</td></tr></table>
<h2>Education</h2><p>B.Eng Computer Engineering, University of Port Harcourt, 2019</p>
<h2>Skills</h2><p>Go, Java, PostgreSQL</p>`),
  },
  {
    id: "07-numeric-dates",
    note: "dates like 03/2019 - 06/2021 and 2018–2019, dates before the title",
    expect: { name: "Samuel Ojo", email: "samuel.ojo@protonmail.com", phone: true, jobs: 3, schools: 1, skills: 3 },
    html: page(`<h1>Samuel Ojo</h1><p>DevOps Engineer</p><p>samuel.ojo@protonmail.com, +44 7700 900123, London, UK</p>
<h2>Employment History</h2><p>06/2021 - Present</p><p>DevOps Engineer, Monzo</p><ul><li>Ran Kubernetes clusters for 300 services.</li></ul><p>03/2019 - 06/2021</p><p>Site Reliability Engineer, Sky</p><ul><li>Cut incident response time by half.</li></ul><p>2018–2019</p><p>Graduate Engineer, BT</p><ul><li>Rotations in networking and cloud.</li></ul>
<h2>Education</h2><p>M.Sc Cloud Computing, University of Leeds, 2018</p>
<h2>Technical Skills</h2><p>Kubernetes • Terraform • AWS</p>`),
  },
  {
    id: "08-creative-headings",
    note: "unusual headings: Where I've worked / What I know",
    expect: { name: "Zainab Musa", email: "hello@zainab.design", phone: false, jobs: 2, schools: 1, skills: 3 },
    html: page(`<h1>Zainab Musa</h1><p>Brand designer making bold identities for African startups.</p><p>hello@zainab.design · zainab.design</p>
<h2>Where I've worked</h2><p>Lead Designer at Piggyvest</p><p>2020 - now</p><p>Built the brand system used across app, web and print.</p><p>Designer at Hotels.ng</p><p>2018 - 2020</p><p>Designed campaigns and social content.</p>
<h2>What I studied</h2><p>B.A. Visual Arts, Ahmadu Bello University, 2018</p>
<h2>What I know</h2><p>Branding, Illustration, Motion design</p>`),
  },
  {
    id: "09-long-senior",
    note: "senior CV, 4 roles, bullets with symbols, projects section",
    expect: { name: "Oluwaseun Adebayo", email: "seun.adebayo@gmail.com", phone: true, jobs: 4, schools: 2, skills: 5 },
    html: page(`<h1>Oluwaseun Adebayo</h1><p>Engineering Manager</p><p>Lagos, Nigeria</p><p>seun.adebayo@gmail.com | +234 802 000 1111 | linkedin.com/in/seunadebayo</p>
<h2>Summary</h2><p>Engineering manager with 12 years building and leading teams in payments and logistics.</p>
<h2>Experience</h2>
<p>Engineering Manager — Moniepoint</p><p>Jan 2022 – Present</p><ul><li>► Grew the platform team from 4 to 15 engineers.</li><li>► Owned uptime for 2M daily transactions.</li></ul>
<p>Tech Lead — Kobo360</p><p>Jul 2018 – Dec 2021</p><ul><li>► Led the routing engine rewrite.</li></ul>
<p>Senior Software Engineer — Konga</p><p>Feb 2015 – Jun 2018</p><ul><li>► Scaled checkout for Black Friday traffic.</li></ul>
<p>Software Engineer — Interswitch</p><p>Aug 2012 – Jan 2015</p><ul><li>► Built internal tools in PHP.</li></ul>
<h2>Projects</h2><p>Open-source Nigerian bank code library (2k GitHub stars)</p>
<h2>Education</h2><p>M.Sc Computer Science, University of Lagos, 2014</p><p>B.Sc Computer Science, Covenant University, 2011</p>
<h2>Skills</h2><p>Leadership, System design, Hiring, Go, Kubernetes</p>`),
  },
];
