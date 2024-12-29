// Margins and dimensions
const margin = { top: 20, right: 30, bottom: 50, left: 50 };
const width = 800 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

// Append SVG to the chart div
const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

// Scales
const x = d3.scaleTime().range([0, width]);
const y = d3.scaleLinear().range([height, 0]);
const color = d3.scaleOrdinal(d3.schemeCategory10);

// Append axes
svg.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0, ${height})`);

svg.append("g")
    .attr("class", "y-axis");

// Append grid groups
svg.append("g")
    .attr("class", "grid x-grid")
    .attr("transform", `translate(0, ${height})`);

svg.append("g")
    .attr("class", "grid y-grid");

// Line generator
const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.count));

// Function to update the grid
function updateGrid() {
    // Vertical grid lines
    svg.select(".x-grid")
        .call(d3.axisBottom(x)
            .tickSize(-height) // Extend ticks as grid lines
            .tickFormat("")    // Remove tick labels
        )
        .selectAll("line")
        .style("stroke", "#ddd")
        .style("stroke-dasharray", "3,3");

    // Horizontal grid lines
    svg.select(".y-grid")
        .call(d3.axisLeft(y)
            .tickSize(-width)
            .tickFormat("")
        )
        .selectAll("line")
        .style("stroke", "#ddd")
        .style("stroke-dasharray", "3,3");
}

// Load data
d3.json("/data/dataset.json").then(data => {
    const minYear = d3.min(data.links.flatMap(d => d.attr.map(attr => +attr.year)));
    const maxYear = d3.max(data.links.flatMap(d => d.attr.map(attr => +attr.year)));

    function getYearIntervals(startYear, endYear, interval) {
        const intervals = [];
        for (let i = startYear; i < endYear; i += interval) {
            intervals.push([i, Math.min(i + interval, endYear)]);
        }
        return intervals;
    }

    const yearInterval = 20;
    const allIntervals = getYearIntervals(minYear, maxYear, yearInterval);

    const intervalSelect = d3.select("#interval-select");
    intervalSelect.selectAll("option")
        .data(allIntervals)
        .enter()
        .append("option")
        .attr("value", d => `${d[0]}-${d[1]}`)
        .text(d => `${d[0]} - ${d[1]}`);

    let currentInterval = allIntervals[0];

    const countries = [...new Set(data.nodes.filter(d => d.noc).map(d => d.id))];
    const defaultCountry = countries[0];

    const select = d3.select("#country-select");
    select.selectAll("option")
        .data(countries)
        .enter()
        .append("option")
        .attr("value", d => d)
        .text(d => d);

    updateChart(defaultCountry, "disciplines", currentInterval);

    select.on("change", () => {
        const country = select.property("value");
        const viewMode = document.querySelector('input[name="view-mode"]:checked').value;
        updateChart(country, viewMode, currentInterval);
    });

    d3.selectAll('input[name="view-mode"]').on("change", () => {
        const country = select.property("value");
        const viewMode = document.querySelector('input[name="view-mode"]:checked').value;
        updateChart(country, viewMode, currentInterval);
    });

    intervalSelect.on("change", function() {
        const selectedInterval = d3.select(this).property("value").split("-");
        currentInterval = [+selectedInterval[0], +selectedInterval[1]];
        const country = select.property("value");
        const viewMode = document.querySelector('input[name="view-mode"]:checked').value;
        updateChart(country, viewMode, currentInterval);
    });

    const medalColors = { Gold: "gold", Silver: "silver", Bronze: "#cd7f32" };

    function updateLegend(linesData, viewMode) {
        const legend = d3.select("#legend");

        legend.selectAll("*").remove();

        legend.selectAll("div")
            .data(linesData)
            .enter()
            .append("div")
            .style("display", "flex")
            .style("align-items", "center")
            .style("margin-bottom", "5px")
            .each(function(d) {
                const container = d3.select(this);

                container.append("div")
                    .style("width", "20px")
                    .style("height", "20px")
                    .style("background-color", viewMode === "medals" ? medalColors[d.key] : color(d.key))
                    .style("margin-right", "10px");

                container.append("span").text(d.key);
            });
    }

    function updateChart(country, viewMode, currentInterval) {
        const countryData = data.links.filter(link => link.target === country);
        const datasetYears = Array.from(
            new Set(data.links.flatMap(d => d.attr.map(attr => +attr.year)))
        ).sort((a, b) => a - b);

        const allYears = datasetYears.filter(year => year >= currentInterval[0] && year <= currentInterval[1]);

        let linesData;
        if (viewMode === "disciplines") {
            linesData = Array.from(
                d3.group(countryData, d => d.source),
                ([key, values]) => ({
                    key,
                    values: fillMissingYears(
                        d3.rollups(
                            values.flatMap(d => d.attr),
                            v => v.length,
                            d => +d.year
                        ).map(([year, count]) => ({ year, count })),
                        allYears
                    )
                })
            );
        } else if (viewMode === "medals") {
            linesData = Array.from(
                d3.group(countryData.flatMap(d => d.attr), d => d.medal),
                ([key, values]) => ({
                    key,
                    values: fillMissingYears(
                        d3.rollups(
                            values,
                            v => v.length,
                            d => +d.year
                        ).map(([year, count]) => ({ year, count })),
                        allYears
                    )
                })
            );
        }

        x.domain(d3.extent(allYears));
        y.domain([0, Math.ceil(d3.max(linesData.flatMap(d => d.values), d => d.count))]);

        svg.select(".x-axis").call(d3.axisBottom(x).tickFormat(d3.format("d")).tickValues(allYears));
        svg.select(".y-axis").call(d3.axisLeft(y));

        const lines = svg.selectAll(".line").data(linesData, d => d.key);

        lines.enter()
            .append("path")
            .attr("class", "line")
            .attr("fill", "none")
            .attr("stroke", d => viewMode === "medals" ? medalColors[d.key] : color(d.key))
            .attr("stroke-width", 2)
            .attr("d", d => line(d.values))
            .merge(lines)
            .transition()
            .duration(750)
            .attr("d", d => line(d.values));

        lines.exit().remove();

        updateLegend(linesData, viewMode);

        updateGrid(); // Aggiorna la griglia
    }

    function fillMissingYears(data, allYears) {
        const filledData = [];
        let lastValue = 0;

        allYears.forEach(year => {
            const match = data.find(d => d.year === year);
            if (match) {
                lastValue = match.count;
                filledData.push(match);
            } else {
                filledData.push({ year, count: lastValue });
            }
        });

        return filledData;
    }
});
