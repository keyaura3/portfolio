import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let xScale, yScale;

async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: Number(row.line),
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
          configurable: true,
          writable: false,
          enumerable: false
        });
  
        return ret;
    });
}

function renderCommitInfo(data, commits) {
  d3.select('#stats').selectAll('*').remove();
  const dl = d3.select('#stats').append('dl').attr('class', 'stats');

  dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').text(data.length);

  dl.append('dt').text('Total commits');
  dl.append('dd').text(commits.length);

  const hourCounts = d3.rollup(data, v => v.length, d => d.datetime.getHours());
  const peakHour = Array.from(hourCounts).reduce((a, b) => (a[1] > b[1] ? a : b))[0];
  dl.append('dt').text('Most active hour');
  dl.append('dd').text(`${peakHour}:00`);

  const avgLength = d3.mean(data, d => d.length).toFixed(2);
  dl.append('dt').text('Average line length (chars)');
  dl.append('dd').text(avgLength);

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

    const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);
    const rScale = d3.scaleSqrt()
    .domain([minLines, maxLines])
    .range([3, 20]); 

    const colorScale = d3.scaleSequential()
        .domain([24, 0])
        .interpolator(d3.interpolateCool);

    const svg = d3.select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');

    xScale = d3.scaleTime()
        .domain(d3.extent(commits, d => d.datetime))
        .range([margin.left, margin.left + usableWidth])
        .nice();

    yScale = d3.scaleLinear()
        .domain([24, 0])
        .range([height - margin.bottom, margin.top]);

    svg.append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${margin.left},0)`)
        .call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableWidth));

    svg.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0, ${margin.top + usableHeight})`)
        .call(d3.axisBottom(xScale));

    svg.append('g')
        .attr('class', 'y-axis')
        .attr('transform', `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(yScale).tickFormat(d => `${String(d % 24).padStart(2, '0')}:00`));

    svg.append('g')
        .attr('class', 'dots')
        .selectAll('circle')
        .data(d3.sort(commits, d => -d.totalLines), d => d.id)
        .join('circle')
        .attr('cx', d => xScale(d.datetime))
        .attr('cy', d => yScale(d.hourFrac))
        .attr('r', d => rScale(d.totalLines))
        .attr('fill', d => colorScale(d.hourFrac))
        .attr('opacity', 0.7)
        .on('mouseenter', (event, commit) => {
        d3.select(event.currentTarget).attr('opacity', 1);
            renderTooltipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mousemove', updateTooltipPosition)
        .on('mouseleave', (event) => {
        d3.select(event.currentTarget).attr('opacity', 0.7);
        updateTooltipVisibility(false);
    });
    
    const brush = d3.brush()
        .on('start brush end', brushed);

    svg.call(brush);

    svg.selectAll('.dots, .overlay ~ *').raise();
}

function updateScatterPlot(data, commits) {
    const width = 1000;
    const height = 600;
    const margin = { top: 10, right: 10, bottom: 30, left: 40 };
    const usableHeight = height - margin.top - margin.bottom;

    const svg = d3.select('#chart').select('svg');

    xScale.domain(d3.extent(commits, d => d.datetime));

    const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);
    const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([3, 20]);

    const colorScale = d3.scaleSequential()
        .domain([24, 0])
        .interpolator(d3.interpolateCool);

    const xAxis = d3.axisBottom(xScale);
    const xAxisGroup = svg.select('g.x-axis');
    xAxisGroup.selectAll('*').remove();
    xAxisGroup.call(xAxis);

    const dots = svg.select('g.dots');

    const sortedCommits = d3.sort(commits, d => -d.totalLines);
    dots
        .selectAll('circle')
        .data(sortedCommits, d => d.id)
        .join('circle')
        .attr('cx', d => xScale(d.datetime))
        .attr('cy', d => yScale(d.hourFrac))
        .attr('r', d => rScale(d.totalLines))
        .attr('fill', d => colorScale(d.hourFrac))
        .attr('opacity', 0.7)
        .on('mouseenter', (event, commit) => {
            d3.select(event.currentTarget).attr('opacity', 1);
            renderTooltipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mousemove', updateTooltipPosition)
        .on('mouseleave', (event) => {
            d3.select(event.currentTarget).attr('opacity', 0.7);
            updateTooltipVisibility(false);
        });
}

let data = await loadData();
let commits = processCommits(data);

renderCommitInfo(data, commits);
renderScatterPlot(data, commits);

function renderTooltipContent(commit) {
    document.getElementById('commit-time-tooltip').textContent = commit.time;
    document.getElementById('commit-author').textContent = commit.author;
    document.getElementById('commit-lines').textContent = commit.totalLines;

    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');

    if (Object.keys(commit).length === 0) return;

    link.href = commit.url;
    link.textContent = commit.id;
    date.textContent = commit.datetime?.toLocaleString('en', {
        dateStyle: 'full',
    });
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

function brushed(event) {
    console.log(event);
    const selection = event.selection;
    d3.selectAll('circle').classed('selected', d => 
        isCommitSelected(selection, d)
    );
    renderSelectionCount(selection);
    renderLanguageBreakdown(selection);
}

function isCommitSelected(selection, d) {
  if (!selection) return false;

   const [x0, x1] = selection.map((d) => d[0]); 
   const [y0, y1] = selection.map((d) => d[1]); 
   const x = xScale(d.datetime); 
   const y = yScale(d.hourFrac); 
   return x >= x0 && x <= x1 && y >= y0 && y <= y1; 
}

function renderSelectionCount(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];

  const countElement = document.querySelector('#selection-count');
  countElement.textContent = `${
    selectedCommits.length || 'No'
  } commits selected`;

  return selectedCommits;
}

function renderLanguageBreakdown(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];
  const container = document.getElementById('language-breakdown');

  if (selectedCommits.length === 0) {
    container.innerHTML = '';
    return;
  }
  const requiredCommits = selectedCommits.length ? selectedCommits : commits;
  const lines = requiredCommits.flatMap((d) => d.lines);

  // Use d3.rollup to count lines per language
  const breakdown = d3.rollup(
    lines,
    (v) => v.length,
    (d) => d.type,
  );

  // Update DOM with breakdown
  container.innerHTML = '';

  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1~%')(proportion);

    container.innerHTML += `
            <dt>${language}</dt>
            <dd>${count} lines (${formatted})</dd>
        `;
  }
}

function updateFileDisplay(filteredCommits) {
  let lines = filteredCommits.flatMap((d) => d.lines);
  let files = d3
    .groups(lines, d => d.file)
    .map(([name, lines]) => ({ name, lines }))
    .sort((a, b) => b.lines.length - a.lines.length);

  const filesContainer = d3.select('#files')
    .selectAll('div')
    .data(files, d => d.name)
    .join(
      enter => enter.append('div').call(div => {
        div.append('dt').append('code');
        div.append('dd');
      })
    );

  filesContainer.select('dt > code').text(d => d.name);
  const colorScale = d3.scaleOrdinal(d3.schemeTableau10);

  filesContainer.select('dd')
    .selectAll('div')
    .data(d => d.lines)
    .join('div')
    .attr('class', 'loc')
    .style('--color', d => colorScale(d.type));
    // .attr('style', (d) => `--color: ${colors(d.type)}`);


}

// Step 1: Evolution visualization
let commitProgress = 100;

let timeScale = d3.scaleTime()
  .domain(d3.extent(commits, d => d.datetime))
  .range([0, 100]);

let commitMaxTime = timeScale.invert(commitProgress);

function onTimeSliderChange() {
  commitProgress = +document.getElementById("commit-progress").value;
  commitMaxTime = timeScale.invert(commitProgress);
  document.getElementById("commit-time").textContent = commitMaxTime.toLocaleString("en", { dateStyle: "long", timeStyle: "short" });
  const filteredCommits = commits.filter(d => d.datetime <= commitMaxTime);
  updateScatterPlot(data, filteredCommits);
  renderCommitInfo(data.filter(d => d.datetime <= commitMaxTime), filteredCommits);
  updateFileDisplay(filteredCommits);
}

document.getElementById("commit-progress").addEventListener("input", onTimeSliderChange);
onTimeSliderChange();