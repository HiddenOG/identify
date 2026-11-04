// Three deliberately awkward CVs the free reader struggles with (story-style, Europass grid,
// emoji headings). Used by the AI check: npm run test:cv:ai

const css = `body{font-family:Georgia,serif;font-size:11pt;margin:40px;color:#111} h1{margin:0}`;
export const WEIRD = [
  {
    id: "w1-narrative",
    note: "no headings at all: written as a story",
    expect: { name: "Kelechi Umeh", email: "kelechi.umeh@gmail.com", phone: true, jobs: 2, schools: 1, skills: 3 },
    html: `<style>${css}</style><h1>Kelechi Umeh</h1>
<p>I'm a mechanical engineer based in Port Harcourt. You can reach me on kelechi.umeh@gmail.com or 0803 555 1212.</p>
<p>Since March 2021 I've worked as a Maintenance Engineer at Shell Nigeria, where I run preventive maintenance for compressors on two offshore platforms and cut unplanned downtime by 18%. Before that, from 2018 to 2021, I was a Graduate Engineer at Julius Berger, rotating between plant maintenance and site supervision.</p>
<p>I studied Mechanical Engineering at the Federal University of Technology, Owerri, graduating with a B.Eng in 2017.</p>
<p>I'm good with AutoCAD, root-cause analysis and SAP PM, and I hold a NEBOSH certificate.</p>`,
  },
  {
    id: "w2-europass",
    note: "Europass-style labelled grid, dates as 01/02/2020 – CURRENT, everything in caps",
    expect: { name: "Fatima Bello", email: "fatima.bello@hotmail.com", phone: true, jobs: 2, schools: 1, skills: 3 },
    html: `<style>${css} td{vertical-align:top;padding:4px 10px} .l{color:#555;width:160px;font-size:9pt;text-transform:uppercase}</style>
<h1>Fatima Bello</h1><table>
<tr><td class="l">Email address</td><td>fatima.bello@hotmail.com</td></tr><tr><td class="l">Phone number</td><td>(+234) 8091234567</td></tr><tr><td class="l">Home</td><td>Kano, Nigeria</td></tr>
<tr><td class="l">Work experience</td><td></td></tr>
<tr><td class="l">01/02/2020 – CURRENT</td><td>KANO, NIGERIA<br><b>SALES MANAGER</b> – NESTLÉ NIGERIA PLC<br>◦ Managed a team of 12 sales reps across Kano and Kaduna.<br>◦ Grew regional revenue by 25% in two years.</td></tr>
<tr><td class="l">15/06/2016 – 31/01/2020</td><td>ABUJA, NIGERIA<br><b>SALES REPRESENTATIVE</b> – GUINNESS NIGERIA<br>◦ Opened 40 new retail accounts.</td></tr>
<tr><td class="l">Education and training</td><td></td></tr>
<tr><td class="l">2012 – 2016</td><td><b>BACHELOR OF SCIENCE IN MARKETING</b> – Bayero University Kano</td></tr>
<tr><td class="l">Digital skills</td><td>Salesforce | Microsoft Excel | Negotiation</td></tr></table>`,
  },
  {
    id: "w3-emoji-freelance",
    note: "emoji section markers, freelance work with no employer, mixed date styles",
    expect: { name: "Tobi Adewale", email: "tobi@tobi.studio", phone: false, jobs: 2, schools: 1, skills: 3 },
    html: `<style>${css}</style><h1>TOBI ADEWALE ✨</h1><p>Motion designer &amp; illustrator · tobi@tobi.studio · tobi.studio</p>
<p>🎬 WHAT I'VE DONE</p><p>Freelance Motion Designer (2019–now): explainer videos for Paystack, Flutterwave and Andela.</p><p>Junior Animator @ Anthill Studios, Sept 2017 to Aug 2019, worked on two animated shorts.</p>
<p>🎓 SCHOOL</p><p>Yaba College of Technology, HND Graphic Design, 2017</p>
<p>🛠 TOOLKIT</p><p>After Effects / Illustrator / Blender</p>`,
  },
];
