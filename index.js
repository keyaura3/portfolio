import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';

const projects = await fetchJSON('./lib/projects.json');
const latestProjects = projects.slice(0, 3);
const projectsContainer = document.querySelector('.projects');
renderProjects(latestProjects, projectsContainer, 'h2');
const githubData = await fetchGitHubData('keyaura3');
const profileStats = document.querySelector('#profile-stats');

if (profileStats) {
  profileStats.innerHTML = `
    <div class="stat-card">
      <div class="stat-icon">💻</div>
      <div class="stat-value">${githubData.public_repos}</div>
      <div class="stat-label">Repos</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">📝</div>
      <div class="stat-value">${githubData.public_gists}</div>
      <div class="stat-label">Gists</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">👥</div>
      <div class="stat-value">${githubData.followers}</div>
      <div class="stat-label">Followers</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">👣</div>
      <div class="stat-value">${githubData.following}</div>
      <div class="stat-label">Following</div>
    </div>
  `;
}


