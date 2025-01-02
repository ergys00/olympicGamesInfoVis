// Tooltip
const tooltip = d3.select(".tooltip");
let worldGeoJson; // Store the world GeoJSON data
let olympicData; // Store the Olympic data
let sportsSet; // Store list of the sports

// Load both datasets
Promise.all([
    d3.json("../../data/dataset.json"),
    d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson")
]).then(([data, world]) => {
    olympicData = data;
    worldGeoJson = world;
    sportsSet = getSportsSet(data);
    // Initialize the select dropdown
    populateSelect(data);

    // Get initial data for All Sports (default)
    const geoData = transformGeoDataFilteredBySport(data, "All");

    // Create initial visualization
    createGeospatialVisualization(geoData);

    // Add event listener for sport selection
    document.getElementById("sports").addEventListener("change", (event) => {
        const selectedSport = event.target.value;
        const newGeoData = transformGeoDataFilteredBySport(olympicData, selectedSport);
        updateVisualization(newGeoData);
    });
});

function getSportsSet(data) {
    sportsSet = new Set();
    // Extract unique sports
    data.links.forEach(link => {
        if (link.source)
            sportsSet.add(link.source);
    });
    return sportsSet;
}

function populateSelect(data) {
    const selectElement = document.getElementById('sports');

    // Add 'All Sports' option
    const allOption = document.createElement('option');
    allOption.value = 'All';
    allOption.textContent = 'All Sports';
    allOption.selected = true;
    selectElement.appendChild(allOption);

    // Sort sports alphabetically
    const sortedSports = Array.from(sportsSet).sort();

    // Add options to select
    sortedSports.forEach(sport => {
        const option = document.createElement('option');
        option.value = sport;
        option.textContent = sport;
        selectElement.appendChild(option);
    });
}

function transformGeoDataFilteredBySport(data, sport) {
    const geoMedals = {};
    data.links.filter(entry => (sport === 'All' ? true : (entry.source === sport))).forEach(link => {
        const target = link.target;
        if (!geoMedals[target])
            geoMedals[target] = 0;
        geoMedals[target] += link.attr.length;
    });

    return data.nodes
        .filter(node => node.noc)
        .map(node => ({
            name: node.name,
            id: node.id,
            totalMedals: geoMedals[node.id] || 0,
        }));
}

function createGeospatialVisualization(geoData) {
    const svgMap = d3.select("#map svg")
        .attr("width", 1200)
        .attr("height", 750)
        .attr("viewBox", [0, 0, 975, 610])
        .attr("style", "max-width: 100%; height: auto;");

    const projection = d3.geoMercator().center([0, 20]);
    const path = d3.geoPath().projection(projection);

    const mapGroup = svgMap.append("g");

    // Add zoom functionality with limited panning
    const zoom = d3.zoom()
        .scaleExtent([1, 8])
        .translateExtent([[0, 0], [975, 610]])
        .on("zoom", (event) => {
            mapGroup.attr("transform", event.transform);
            updateLabels(event.transform.k);
        });

    svgMap.call(zoom);

    // Define color scale
    const colorScale = d3.scalePow()
        .domain([0, d3.max(geoData, d => d.totalMedals)])
        .range(["#fee5da", "#a4141c"])
        .exponent(0.5);

    // Draw the map
    const states = mapGroup.selectAll("path")
        .data(worldGeoJson.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("stroke", "white")
        .attr("stroke-width", "0.3")
        .attr("fill", d => {
            const country = geoData.find(c => {
                if (c.name === d.properties.name)
                    return true;
                else if (c.id === d.id)
                    return true;
                else
                    return false;
            });
            return country ? colorScale(country.totalMedals) : "#eeeeee";
        });

    // Update tooltip event listeners
    updateTooltipListeners(states, geoData);

    // Add labels for each country
    const labels = mapGroup.selectAll("text")
        .data(worldGeoJson.features)
        .enter()
        .append("text")
        .attr("x", d => {
            const centroid = path.centroid(d);
            return centroid[0];
        })
        .attr("y", d => {
            const centroid = path.centroid(d);
            return centroid[1];
        })
        .text(d => {
            if (isNaN(d.id))
                return d.id;
        })
        .attr("fill", "black")
        .attr("text-anchor", "middle")
        .attr("pointer-events", "none")
        .style("font-size", 0)
        .style("opacity", 0);

    // Function to update labels based on zoom level
    function updateLabels(zoomLevel) {
        const labelBoxes = [];

        labels.each(function (d) {
            const stateBbox = path.bounds(d);
            const stateWidth = stateBbox[1][0] - stateBbox[0][0];
            const stateHeight = stateBbox[1][1] - stateBbox[0][1];
            const fontSize = Math.min(stateWidth, stateHeight) * 0.6 / (0.9 * zoomLevel);
            const clampedFontSize = Math.min(Math.max(fontSize, 1), 7);

            if (clampedFontSize >= 1) {
                const label = d3.select(this)
                    .style("font-size", clampedFontSize + "px");

                const bbox = this.getBBox();
                let isOverlapping = false;
                for (const box of labelBoxes) {
                    if (
                        bbox.x < box.x + box.width &&
                        bbox.x + bbox.width > box.x &&
                        bbox.y < box.y + box.height &&
                        bbox.y + bbox.height > box.y
                    ) {
                        isOverlapping = true;
                        break;
                    }
                }

                if (!isOverlapping) {
                    label.style("opacity", 1);
                    labelBoxes.push(bbox);
                } else {
                    label.style("opacity", 0);
                }
            } else {
                d3.select(this).style("opacity", 0);
            }
        });
    }

    // Initialize labels at the default zoom level
    updateLabels(1);
}

function updateTooltipListeners(states, geoData) {
    states
        .on("mouseover", function (event, d) {
            states.attr("opacity", 0.3);
            d3.select(this).attr("opacity", 1);

            const country = geoData.find(c => {
                if (c.name === d.properties.name)
                    return true;
                else if (c.id === d.id)
                    return true;
                else
                    return false;
            });
            const medals = country ? country.totalMedals : 0;
            tooltip.style("display", "block")
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px")
                .html(`${d.properties.name}<br>Total Medals: ${medals}`);
        })
        .on("mousemove", (event) => {
            tooltip.style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function () {
            states.attr("opacity", 1);
            tooltip.style("display", "none");
        })
        .on("click", function (event, d) {
            const countryId = d.id;
            const countryName = d.properties.name
            const sportsMedals = getSportsMedalsForCountry(countryId, countryName);
            drawBarChart(sportsMedals);
        });
}

function updateVisualization(newGeoData) {
    const colorScale = d3.scalePow()
        .domain([0, d3.max(newGeoData, d => d.totalMedals)])
        .range(["#fee5da", "#a4141c"])
        .exponent(0.5);

    const states = d3.select("#map svg")
        .selectAll("path")
        .data(worldGeoJson.features);

    states.transition()
        .duration(750)
        .attr("fill", d => {
            const country = newGeoData.find(c => c.id === d.id);
            return country !== undefined && country.totalMedals !== 0 ? colorScale(country.totalMedals) : "#eeeeee";
        });

    // Update tooltip event listeners with the new data
    updateTooltipListeners(states, newGeoData);
}

function getSportsMedalsForCountry(countryId, countryName) {
    const sportsMedals = {};
    realId = olympicData.nodes.find(c => {
        if (c.name === countryName)
            return true
        else if (c.id === countryId)
            return true
    }).id
    olympicData.links.forEach(link => {
        if (link.target === realId) {
            sportsSet.forEach(sport => {
                if (link.source === sport)
                    sportsMedals[sport] = (sportsMedals[sport] || 0) + link.attr.length;
            });
        }
    });
    return Object.entries(sportsMedals)
        .map(([sport, medals]) => ({sport, medals}))
        .sort((a, b) => b.medals - a.medals);
}

function drawBarChart(data) {
    const svgBarChart = d3.select("#barchart svg")
        .attr("width", 600)
        .attr("height", 750)
        .attr("viewBox", [0, 0, 600, 750])
        .attr("style", "max-width: 100%; height: auto;");

    svgBarChart.selectAll("*").remove(); // Clear previous chart

    const margin = { top: 20, right: 30, bottom: 40, left: 40 };
    const width = 600 - margin.left - margin.right;
    const height = 750 - margin.top - margin.bottom;

    const x = d3.scaleBand()
        .domain(data.map(d => d.sport))
        .range([margin.left, width + margin.left])
        .padding(0.1);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.medals)])
        .nice()
        .range([height + margin.top, margin.top]);

    // Use the same color scale as the map
    const colorScale = d3.scalePow()
        .domain([0, d3.max(data, d => d.medals)])
        .range(["#fee5da", "#a4141c"])
        .exponent(0.3);

    const xAxis = g => g
        .attr("transform", `translate(0,${height + margin.top})`)
        .call(d3.axisBottom(x).tickSizeOuter(0));

    const yAxis = g => g
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));

    svgBarChart.append("g")
        .selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .attr("x", d => x(d.sport))
        .attr("y", d => y(d.medals))
        .attr("width", x.bandwidth())
        .attr("height", d => height + margin.top - y(d.medals))
        .attr("fill", d => colorScale(d.medals)); // Apply the color scale

    svgBarChart.append("g")
        .call(xAxis);

    svgBarChart.append("g")
        .call(yAxis);
}