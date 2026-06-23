interface ResumeData {
  name: string;
  title?: string;
  phone: string;
  email: string;
  linkedin?: string;
  github?: string;
  leetcode?: string;
  summary?: string;
  degree: string;
  institution: string;
  location?: string;
  graduationYear?: string;
  skills: string; // comma-separated
  projects?: Array<{ name: string; year: string; technologies: string; url?: string; bullets: string[] }>;
  achievements?: string[];
}

export function generateResumeHtml(data: ResumeData): string {
  const skillsArray = data.skills.split(',').map(s => s.trim()).filter(Boolean);
  
  // Categorize skills intelligently
  const languages = skillsArray.filter(s => 
    ['JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'PHP', 'Ruby', 'Swift', 'Kotlin'].some(lang => s.includes(lang))
  );
  const frontend = skillsArray.filter(s => 
    ['React', 'Next', 'Vue', 'Angular', 'HTML', 'CSS', 'Tailwind', 'Bootstrap', 'Sass'].some(tech => s.includes(tech))
  );
  const backend = skillsArray.filter(s => 
    ['Node', 'Express', 'Django', 'Flask', 'Spring', 'ASP.NET', 'Laravel', 'NestJS'].some(tech => s.includes(tech))
  );
  const databases = skillsArray.filter(s => 
    ['MongoDB', 'MySQL', 'PostgreSQL', 'Redis', 'SQLite', 'Cassandra', 'DynamoDB'].some(db => s.includes(db))
  );
  const ai = skillsArray.filter(s => 
    ['AI', 'OpenAI', 'GPT', 'Claude', 'Groq', 'TensorFlow', 'PyTorch', 'Machine Learning', 'ML'].some(tech => s.includes(tech))
  );
  const tools = skillsArray.filter(s => 
    !languages.includes(s) && !frontend.includes(s) && !backend.includes(s) && !databases.includes(s) && !ai.includes(s)
  );
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resume - ${data.name}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    @page {
      size: A4;
      margin: 0.6in;
    }
    
    body {
      font-family: 'Times New Roman', serif;
      font-size: 11pt;
      line-height: 1.3;
      color: #000;
      background: white;
    }
    
    h1 {
      font-size: 22pt;
      font-weight: bold;
      margin-bottom: 2pt;
      text-align: center;
      letter-spacing: 0.5pt;
    }
    
    .subtitle {
      text-align: center;
      font-size: 11pt;
      margin-bottom: 4pt;
      font-weight: normal;
    }
    
    .contact {
      text-align: center;
      font-size: 9.5pt;
      margin-bottom: 12pt;
      line-height: 1.4;
    }
    
    .contact a {
      color: #0066cc;
      text-decoration: none;
    }
    
    .section {
      margin-bottom: 10pt;
      page-break-inside: avoid;
    }
    
    .section-title {
      font-size: 12pt;
      font-weight: bold;
      border-bottom: 1.5pt solid #000;
      padding-bottom: 2pt;
      margin-bottom: 6pt;
    }
    
    .item-header {
      margin-bottom: 3pt;
      overflow: hidden;
    }
    
    .item-title {
      font-weight: bold;
      float: left;
    }
    
    .item-date {
      float: right;
      font-weight: normal;
    }
    
    .item-subtitle {
      font-style: italic;
      font-size: 10pt;
      margin-bottom: 4pt;
      clear: both;
    }
    
    ul {
      margin-left: 18pt;
      margin-top: 2pt;
      margin-bottom: 6pt;
      padding: 0;
    }
    
    li {
      margin-bottom: 1.5pt;
      line-height: 1.25;
      text-align: justify;
    }
    
    .skills-row {
      margin-bottom: 2pt;
      line-height: 1.3;
    }
    
    .skill-category {
      font-weight: bold;
      display: inline;
    }
    
    .skill-list {
      display: inline;
    }
    
    .project {
      margin-bottom: 8pt;
      page-break-inside: avoid;
    }
    
    .compact {
      margin-bottom: 4pt;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <h1>${data.name}</h1>
  <div class="subtitle">Full Stack Developer</div>
  <div class="contact">
    📞 ${data.phone} | 
    ✉ <a href="mailto:${data.email}">${data.email}</a>
    ${data.linkedin ? ` | 🔗 <a href="${data.linkedin}">LinkedIn</a>` : ''}
    ${data.github ? ` | 💻 <a href="${data.github}">GitHub</a>` : ''}
    ${data.leetcode ? ` | 🏆 <a href="${data.leetcode}">LeetCode</a>` : ''}
  </div>

  ${data.summary ? `
  <!-- Summary -->
  <div class="section">
    <div class="section-title">Professional Summary</div>
    <p style="text-align: justify;">${data.summary}</p>
  </div>
  ` : ''}

  <!-- Education -->
  <div class="section compact">
    <div class="section-title">Education</div>
    <div class="item-header">
      <span class="item-title">${data.degree}</span>
      <span class="item-date">${data.graduationYear || 'Present'}</span>
    </div>
    <div style="clear: both;">${data.institution}${data.location ? `, ${data.location}` : ''}</div>
  </div>

  <!-- Technical Skills -->
  <div class="section">
    <div class="section-title">Technical Skills</div>
    ${languages.length > 0 ? `<div class="skills-row"><span class="skill-category">Languages:</span> <span class="skill-list">${languages.join(', ')}</span></div>` : ''}
    ${frontend.length > 0 ? `<div class="skills-row"><span class="skill-category">Frontend:</span> <span class="skill-list">${frontend.join(', ')}</span></div>` : ''}
    ${backend.length > 0 ? `<div class="skills-row"><span class="skill-category">Backend:</span> <span class="skill-list">${backend.join(', ')}</span></div>` : ''}
    ${databases.length > 0 ? `<div class="skills-row"><span class="skill-category">Databases:</span> <span class="skill-list">${databases.join(', ')}</span></div>` : ''}
    ${ai.length > 0 ? `<div class="skills-row"><span class="skill-category">AI Integration:</span> <span class="skill-list">${ai.join(', ')}</span></div>` : ''}
    ${tools.length > 0 ? `<div class="skills-row"><span class="skill-category">Tools & Libraries:</span> <span class="skill-list">${tools.join(', ')}</span></div>` : ''}
  </div>

  ${data.projects && data.projects.length > 0 ? `
  <!-- Projects -->
  <div class="section">
    <div class="section-title">Projects</div>
    ${data.projects.map((project, idx) => `
      <div class="project">
        <div class="item-header">
          <span class="item-title">${project.name}</span>
          <span class="item-date">${project.year}</span>
        </div>
        <div class="item-subtitle">
          Technologies: ${project.technologies}${project.url ? ` | <a href="${project.url}">${new URL(project.url).hostname}</a>` : ''}
        </div>
        <ul>
          ${project.bullets.filter(b => b.trim()).slice(0, 4).map(bullet => `<li>${bullet}</li>`).join('')}
        </ul>
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${data.achievements && data.achievements.length > 0 ? `
  <!-- Achievements -->
  <div class="section">
    <div class="section-title">Achievements</div>
    <ul>
      ${data.achievements.filter(a => a.trim()).map(achievement => `<li>${achievement}</li>`).join('')}
    </ul>
  </div>
  ` : ''}
</body>
</html>
  `.trim();
}
