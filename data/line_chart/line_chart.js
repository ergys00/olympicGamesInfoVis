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

// Axes
svg.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0, ${height})`);

svg.append("g")
    .attr("class", "y-axis");

// Line generator
const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.count));

// Load data
d3.json("/data/dataset.json").then(data => {
    const countries = [...new Set(data.nodes.filter(d => d.noc).map(d => d.id))];
    const defaultCountry = countries[0];

    // Popolo la select con i paesi
    const select = d3.select("#country-select");
    select.selectAll("option")
        .data(countries)
        .enter()
        .append("option")
        .attr("value", d => d)
        .text(d => d);

    // Set paese di default
    updateChart(defaultCountry, "disciplines");

    // Aggiungo event per la select e i radio buttons
    select.on("change", () => {
        const country = select.property("value");
        const viewMode = document.querySelector('input[name="view-mode"]:checked').value;
        updateChart(country, viewMode);
    });

    d3.selectAll('input[name="view-mode"]').on("change", () => {
        const country = select.property("value");
        const viewMode = document.querySelector('input[name="view-mode"]:checked').value;
        updateChart(country, viewMode);
    });

    // Colori medglie
    const medalColors = {
        Gold: "gold",
        Silver: "silver",
        Bronze: "#cd7f32"
    };

    // Aggiorno la legenda
    function updateLegend(linesData, viewMode) {
        const legend = d3.select("#legend");

        // Rimuovo legnda precedente
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
                
                // Set colore
                container.append("div")
                    .style("width", "20px")
                    .style("height", "20px")
                    .style("background-color", viewMode === "medals" ? medalColors[d.key] : color(d.key))
                    .style("margin-right", "10px");

                container.append("span")
                    .text(d.key);
            });
    }

    function updateChart(country, viewMode) {
        const countryData = data.links.filter(link => link.target === country);
    
        let linesData;
        if (viewMode === "disciplines") {
            linesData = Array.from(
                d3.group(countryData, d => d.source),
                ([key, values]) => ({
                    key,
                    values: computeCumulative(
                        fillMissingYears(
                            d3.rollups(
                                values.flatMap(d => d.attr),
                                v => v.length,
                                d => +d.year
                            ).map(([year, count]) => ({ year, count }))
                        )
                    )
                })
            );
        } else if (viewMode === "medals") {
            linesData = Array.from(
                d3.group(countryData.flatMap(d => d.attr), d => d.medal),
                ([key, values]) => ({
                    key,
                    values: computeCumulative(
                        fillMissingYears(
                            d3.rollups(
                                values,
                                v => v.length,
                                d => +d.year
                            ).map(([year, count]) => ({ year, count }))
                        )
                    )
                })
            );
        }
    
        x.domain(d3.extent(linesData.flatMap(d => d.values), d => d.year));
        y.domain([0, d3.max(linesData.flatMap(d => d.values), d => d.count)]);
    
        svg.select(".x-axis").call(d3.axisBottom(x).tickFormat(d3.format("d")));
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
    
        // Aggiorna la legenda
        updateLegend(linesData, viewMode);
    }
    
    // Funzione per riempire gli anni mancanti con un valore costante (ultimo noto)
    function fillMissingYears(data) {
        const allYears = d3.range(
            d3.min(data, d => d.year),
            d3.max(data, d => d.year) + 1
        );
    
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
    
    // Funzione per calcolare i valori cumulativi
    function computeCumulative(data) {
        let cumulativeCount = 0;
        return data.map(d => {
            cumulativeCount += d.count;
            return { year: d.year, count: cumulativeCount };
        });
    }
    
});
