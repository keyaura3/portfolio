
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: Number(row.line), // or just +row.line
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));
  return data;
}

function processCommits(data) {
    return d3
      .groups(data, (d) => d.commit)
      .map(([commit, lines]) => {
        let first = lines[0];
        let { author, date, time, timezone, datetime } = first;
        let ret = {
          id: commit,
          url: 'https://github.com/keyaura3/portfolio/commit/' + commit,
          author,
          date,
          time,
          timezone,
          datetime,
          hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
          totalLines: lines.length,
        };
  
        Object.defineProperty(ret, 'lines', {
          value: lines,
          // What other options do we need to set?
          // Hint: look up configurable, writable, and enumerable
        });
  
        return ret;
    });
}

function renderCommitInfo(data, commits) {
    // Create the dl element
    const dl = d3.select('#stats').append('dl').attr('class', 'stats');
  
    // Add total LOC
    dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
    dl.append('dd').text(data.length);
  
    // Add total commits
    dl.append('dt').text('Total commits');
    dl.append('dd').text(commits.length);
  
    // Time of day most work is done
    const hourCounts = d3.rollup(data, v => v.length, d => d.datetime.getHours());
    const peakHour = Array.from(hourCounts).reduce((a, b) => (a[1] > b[1] ? a : b))[0];
    dl.append('dt').text('Most active hour');
    dl.append('dd').text(`${peakHour}:00`);

    // Average line length
    const avgLength = d3.mean(data, d => d.length).toFixed(2);
    dl.append('dt').text('Average line length (chars)');
    dl.append('dd').text(avgLength);

    // Day of the week most work is done
    const dayCounts = d3.rollup(data, v => v.length, d => d.datetime.getDay());
    const dayMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const peakDay = Array.from(dayCounts).reduce((a, b) => (a[1] > b[1] ? a : b))[0];
    dl.append('dt').text('Most active day');
    dl.append('dd').text(dayMap[peakDay]);

}

function renderScatterPlot(data, commits) {
    const width = 1000;
    const height = 600;
    const margin = { top: 10, right: 10, bottom: 30, left: 40 };

    const usableWidth = width - margin.left - margin.right;
    const usableHeight = height - margin.top - margin.bottom;

    const colorScale = d3.scaleSequential()
        .domain([24, 0])
        .interpolator(d3.interpolatePlasma);

    const svg = d3.select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');

    const xScale = d3.scaleTime()
        .domain(d3.extent(commits, d => d.datetime))
        .range([margin.left, margin.left + usableWidth])
        .nice();

    const yScale = d3.scaleLinear()
        .domain([0, 24])
        .range([margin.top + usableHeight, margin.top]);

    svg.append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${margin.left},0)`)
        .call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableWidth));

    svg.append('g')
        .attr('transform', `translate(0, ${margin.top + usableHeight})`)
        .call(d3.axisBottom(xScale));

    svg.append('g')
        .attr('transform', `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(yScale).tickFormat(d => `${String(d % 24).padStart(2, '0')}:00`));

        svg.append('g')
        .attr('class', 'dots')
        .selectAll('circle')
        .data(commits)
        .join('circle')
        .attr('cx', d => xScale(d.datetime))
        .attr('cy', d => yScale(d.hourFrac))
        .attr('r', 5)
        .attr('fill', d => colorScale(d.hourFrac))
        .attr('opacity', 0.7)
        .on('mouseenter', (event, commit) => {
          renderTooltipContent(commit);
          updateTooltipVisibility(true);
          updateTooltipPosition(event);
        })
        .on('mousemove', updateTooltipPosition)
        .on('mouseleave', () => updateTooltipVisibility(false));
}

let data = await loadData();
let commits = processCommits(data);

renderCommitInfo(data, commits);
renderScatterPlot(data, commits);

function renderTooltipContent(commit) {
    document.getElementById('commit-link').textContent = commit.id;
    document.getElementById('commit-link').href = commit.url;
    document.getElementById('commit-date').textContent = commit.date;
    document.getElementById('commit-time').textContent = commit.time;
    document.getElementById('commit-author').textContent = commit.author;
    document.getElementById('commit-lines').textContent = commit.totalLines;
}
  
function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.style.left = `${event.clientX + 10}px`;
    tooltip.style.top = `${event.clientY + 10}px`;
}
  