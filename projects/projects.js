import { fetchJSON, renderProjects } from "../global.js";
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
renderProjects(projects, projectsContainer, 'h2');
const title = document.querySelector('.projects-title');
if (title) title.textContent += ` ${projects.length} Projects`;


let query = '';
let selectedYear = null;

renderProjects(projects, projectsContainer, 'h2');
renderPieChart(projects);

const searchInput = document.querySelector('.searchBar');
searchInput?.addEventListener('input', (e) => {
  query = e.target.value.toLowerCase();
  renderFilteredView();
});

function renderFilteredView() {
    const filtered = projects.filter(p => {
        const matchQuery = Object.values(p).join(' ').toLowerCase().includes(query);
        const matchYear = selectedYear ? p.year === selectedYear : true;
        return matchQuery && matchYear;
    });
      

  renderProjects(filtered, projectsContainer, 'h2');
  renderPieChart(filtered);
}

function renderPieChart(projectsToUse) {
  const svg = d3.select('#projects-pie-plot');
  const legend = d3.select('.legend');

  svg.selectAll('path').remove();
  legend.selectAll('li').remove();

  const rolledData = d3.rollups(
    projectsToUse,
    v => v.length,
    d => d.year
  );

  const data = rolledData.map(([year, count]) => ({ label: year, value: count }));
  const pie = d3.pie().value(d => d.value);
  const arcData = pie(data);
  const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
  const arcs = arcData.map(arcGenerator);
  const colors = d3.scaleOrdinal(d3.schemeTableau10);

  arcs.forEach((arc, i) => {
    svg.append('path')
      .attr('d', arc)
      .attr('fill', colors(i))
      .attr('class', data[i].label === selectedYear ? 'selected' : '')
      .on('click', () => {
        selectedYear = selectedYear === data[i].label ? null : data[i].label;
        renderFilteredView();
      });
  });

  data.forEach((d, i) => {
    legend.append('li')
      .attr('style', `--color:${colors(i)}`)
      .attr('class', d.label === selectedYear ? 'selected' : '')
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
      .on('click', () => {
        selectedYear = selectedYear === d.label ? null : d.label;
        renderFilteredView();
      });
  });
}