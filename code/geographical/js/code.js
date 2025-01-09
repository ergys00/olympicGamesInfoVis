// Tooltip
const tooltip = d3.select(".tooltip");
let worldGeoJson;
let olympicData;
let sportsSet;

// Carico entrambi i dataset
Promise.all([
    d3.json("../../data/dataset.json"),
    d3.json(
        "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"
    ),
]).then(([data, world]) => {
    olympicData = data;
    worldGeoJson = world;
    sportsSet = getSportsSet(data);

    //Popolo la select con gli sport letti
    populateSelect(data);

    //Una volta caricati gli sport la mappa mostra le medaglie totali per ogni nazione
    const geoData = transformGeoDataFilteredBySport(data, "All"); // questo è uno step di data transformation in cui fornico in output nazione : medaglie totali

    //Stampo la mappa
    createGeospatialVisualization(geoData);

    //Aggiungo listener alla select in modo tale che quando si seleziona un nuovo sport viene fatto l'update della visualizzazione
    document
        .getElementById("sports")
        .addEventListener("change", (event) => {
            const selectedSport = event.target.value;
            const newGeoData = transformGeoDataFilteredBySport(
                olympicData,
                selectedSport
            );
            updateVisualization(newGeoData);
        });
});

function getSportsSet(data) {
sportsSet = []
for(i = 0; i < 11; i++){
        sportsSet.push(data.nodes[i].name)
    }
    return sportsSet
}

function createLegend(colorScale) {
    const legendWidth = 200; // altezza della legenda
    const legendHeight = 10; // larghezza della legenda
    const margin = { top: 10, right: 10, bottom: 20, left: 10 };

    d3.select("#map svg .legend").remove();

    // aggiungo la legenda alla mappa
    const legendSvg = d3
        .select("#map svg")
        .append("g")
        .attr("class", "legend")
        .attr(
            "transform",
            `translate(${margin.left},${
                610 - legendHeight - margin.bottom
            })`
        ); // posiziono la legenda nell'angolo in basso a sinistra tramite traslazione

    // creo il gradiente per la legenda e gli do l'id legend-gradient
    const gradient = legendSvg
        .append("defs")
        .append("linearGradient")
        .attr("id", "legend-gradient")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "0%");
    const domain = colorScale.domain();
    const range = colorScale.range();
    gradient
        .selectAll("stop")
        .data(range)
        .enter()
        .append("stop")
        .attr("offset", (d, i) => i / (range.length - 1))
        .attr("stop-color", (d) => d);

    // aggiungo il gradiente al rettangolo della legenda
    legendSvg
        .append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#legend-gradient)");

    // creo scala della legenda
    const legendScale = d3
        .scaleLinear()
        .domain(domain)
        .range([0, legendWidth]);

    //faccio lo slice per fare in modo di aggiungere l'ultimo valore che altrimenti viene tagliato
    const tickValues = legendScale.ticks(5).slice(0, 4);
    tickValues.push(domain[1]);

    const legendAxis = d3
        .axisBottom(legendScale)
        .tickValues(tickValues)
        .tickFormat(d3.format("d"));

    legendSvg
        .append("g")
        .attr("transform", `translate(-0.5,${legendHeight})`)
        .call(legendAxis)
        .selectAll(".tick text")
        .attr("class", "legend-label");
}

function populateSelect(data) {
    const selectElement = document.getElementById("sports");

    // aggiungo l'opzione "All Sports"
    const allOption = document.createElement("option");
    allOption.value = "All";
    allOption.textContent = "All Sports";
    allOption.selected = true;
    selectElement.appendChild(allOption);

    // ordino gli sport in ordine alfabetico
    const sortedSports = sportsSet.sort();

    // popolo la select
    sortedSports.forEach((sport) => {
        const option = document.createElement("option");
        option.value = sport;
        option.textContent = sport;
        selectElement.appendChild(option);
    });
}

function transformGeoDataFilteredBySport(data, sport) {
    const geoMedals = {};
    //se è stato scelto All allora prendo tutti i link altrimenti li filtro per lo sport scelto
    data.links
        .filter((entry) =>
            sport === "All" ? true : entry.source === sport.toLowerCase()
        )
        //per ognuno dei link sommo la lunghezza di attr che ha un'occorrenza a medaglia vinta
        .forEach((link) => {
            const target = link.target;
            if (!geoMedals[target]) geoMedals[target] = 0;
            geoMedals[target] += link.attr.length;
        });

    // restituisco un array di nome, id e medaglie totali
    return data.nodes
        .filter((node) => node.noc)
        .map((node) => ({
            name: node.name,
            id: node.id,
            totalMedals: geoMedals[node.id] || 0,
        }));
}

function createGeospatialVisualization(geoData) {
    const svgMap = d3
        .select("#map svg")
        .attr("width", 1200)
        .attr("height", 750)
        .attr("viewBox", [0, 0, 975, 610])
        .attr("style", "max-width: 100%; height: auto;");

    const projection = d3.geoMercator().center([0, 20]);
    const path = d3.geoPath().projection(projection);

    const mapGroup = svgMap.append("g");

    // aggiungo la funzionalità di zooming e panning
    const zoom = d3
        .zoom()
        .scaleExtent([1, 10])
        .translateExtent([
            [0, 0],
            [1200, 750],
        ])
        .on("zoom", (event) => {
            mapGroup.attr("transform", event.transform);
            updateLabels(event.transform.k);
        });

    svgMap.call(zoom);

    // definisco la scala dei colori
    const colorScale = d3
        .scalePow() //ho usato questa perché altrimenti non si sarebbero notate bene le differenze tra regioni
        .domain([0, d3.max(geoData, (d) => d.totalMedals)])
        .range(["#ffded6", "#ff6947"])
        .exponent(0.5);

    //creo la legenda basandomi sulla scala appena creata

    createLegend(colorScale);

    //disegno la mappa basandomi sulle feature della mappa geoJSON
    const states = mapGroup
        .selectAll("path")
        .data(worldGeoJson.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("stroke", "white")
        .attr("stroke-width", "0.3")
        .attr("fill", (d) => {
            const country = geoData.find((c) => {
                if (c.name === d.properties.name)
                    return true; //questo controllo in più perché per casi come il Sud Africa l'id non aveva corrispondenza
                else if (c.id === d.id) return true;
                else return false;
            });
            return country
                ? colorScale(country.totalMedals)
                : "#eeeeee";
        });

    // aggiorno i listener associati ai tooltip
    updateTooltipListeners(states, geoData);

    // aggiungo le label ad ogni nazione
    const labels = mapGroup
        .selectAll("text")
        .data(worldGeoJson.features)
        .enter()
        .append("text")
        .attr("x", (d) => {
            const largest = d3.geoArea(d) > 0 ? d : null;
            let x = largest
                ? projection(d3.geoCentroid(largest))[0]
                : 0;
            // devo gestire l'etichetta della Francia con un offset perché ha una parte nel sud america che fa slittare il centroide associato 
            if (d.id === "FRA" || d.properties.name === "France") {
                x += 25; 
            }
            return x;
        })
        .attr("y", (d) => {
            const largest = d3.geoArea(d) > 0 ? d : null;
            let y = largest
                ? projection(d3.geoCentroid(largest))[1]
                : 0;
            if (d.id === "FRA" || d.properties.name === "France") {
                y -= 10;
            }
            return y;
        })
        .text((d) => (isNaN(d.id) ? d.id : ""))
        .attr("fill", "black")
        .attr("text-anchor", "middle")
        .attr("pointer-events", "none")
        .style("font-size", 0)
        .style("opacity", 0);

    // funzione per gestire lo zoom 
    function updateLabels(zoomLevel) {
        const labelBoxes = [];

        labels.each(function (d) {
            const stateBbox = path.bounds(d);
            const stateWidth = stateBbox[1][0] - stateBbox[0][0];
            const stateHeight = stateBbox[1][1] - stateBbox[0][1];
            const fontSize =
                (Math.min(stateWidth, stateHeight) * 0.6) /
                (0.9 * zoomLevel);
            const clampedFontSize = Math.min(Math.max(fontSize, 1), 8);

            if (clampedFontSize >= 1) {
                const label = d3
                    .select(this)
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

    // le label sono inizializzate con zoom 1
    updateLabels(1);
}

function updateTooltipListeners(states, geoData) {
    states
        .on("mouseover", function (event, d) {
            states.attr("opacity", 0.20); //quando passo il mouse su una nazione rendo opache le altre per evidenziarla
            d3.select(this).attr("opacity", 1);

            const country = geoData.find((c) => {
                if (c.name === d.properties.name) return true;
                else if (c.id === d.id) return true;
                else return false;
            });
            const medals = country ? country.totalMedals : 0;
            tooltip
                .style("display", "block")
                .style("left", event.pageX + 10 + "px")
                .style("top", event.pageY - 10 + "px")
                .html(
                    `${d.properties.name}<br>Total Medals: ${medals}`
                );
        })
        .on("mousemove", (event) => {
            tooltip
                .style("left", event.pageX + 10 + "px")
                .style("top", event.pageY - 10 + "px");
        })
        .on("mouseout", function () {
            states.attr("opacity", 1);
            tooltip.style("display", "none");
        })
        .on("click", function (event, d) {
            const countryId = d.id;
            const countryName = d.properties.name;
            document.getElementById("chart-title").innerHTML =
                "Sports Medals Leadership for " + d.properties.name;
            document.getElementById("barchart").style = "block";
            const sportsMedals = getSportsMedalsForCountry(
                countryId,
                countryName
            );
            drawBarChart(sportsMedals);
        });
}

function updateVisualization(newGeoData) {
    //ogni volta in cui si fa la selezione di un nuovo sport va aggiornata la scala colori
    const colorScale = d3
        .scalePow()
        .domain([0, d3.max(newGeoData, (d) => d.totalMedals)])
        .range(["#ffded6", "#ff6947"])
        .exponent(0.5);

    const states = d3
        .select("#map svg")
        .selectAll("path")
        .data(worldGeoJson.features);

    states
        .transition()
        .duration(1250)
        .attr("fill", (d) => {
            const country = newGeoData.find((c) => {
                if (c.name === d.properties.name)
                    return true; //questo controllo in più perché per casi come il Sud Africa l'id non aveva corrispondenza
                else if (c.id === d.id) return true;
                else return false;
            });
            return (country !== undefined && country.totalMedals !== 0)
                ? colorScale(country.totalMedals)
                : "#eeeeee";
        });
    createLegend(colorScale);

    //aggiorno i listener relativi al tooltip da mostrare
    updateTooltipListeners(states, newGeoData);
}


//funzione che calcola medaglie per maschi e femmine
function getSportsMedalsForCountry(countryId, countryName) {
    const sportsMedals = {};
    const realId = olympicData.nodes.find((c) => {
        if (c.name === countryName) return true;
        else if (c.id === countryId) return true;
    }).id;

    olympicData.links.forEach((link) => {
        if (link.target === realId) {
            sportsSet.forEach((sport) => {
                if (link.source === sport.toLowerCase()) {
                    if (!sportsMedals[sport]) {
                        sportsMedals[sport] = {
                            male: 0,
                            female: 0,
                            total: 0,
                        };
                    }
                    link.attr.forEach((medal) => {
                        sportsMedals[sport].total += 1;
                        if (medal.athlete.sex === "Male") {
                            sportsMedals[sport].male += 1;
                        } else if (medal.athlete.sex === "Female") {
                            sportsMedals[sport].female += 1;
                        }
                    });
                }
            });
        }
    });

    //restituisco 3 dati: numero di medaglie maschili, femminili e totali
    return Object.entries(sportsMedals)
        .map(([sport, medals]) => ({
            sport,
            male: medals.male,
            female: medals.female,
            total: medals.total,
        }))
        .sort((a, b) => b.total - a.total);
}

function drawBarChart(data) {
    const svgBarChart = d3
        .select("#barchart svg")
        .attr("width", 600)
        .attr("height", 750)
        .attr("viewBox", [0, 0, 600, 750])
        .attr("style", "max-width: 100%; height: 95%;");

    svgBarChart.selectAll("*").remove();

    const margin = { top: 20, right: 50, bottom: 40, left: 60 };
    const width = 600 - margin.left - margin.right;
    const height = 750 - margin.top - margin.bottom;

    // dati da inserire nello stacked bar
    const sports = data.map((d) => d.sport);
    const stackedData = d3.stack().keys(["female", "male"])(data);

    // asse delle x
    const x = d3
        .scaleBand()
        .domain(sports)
        .range([margin.left, width + margin.left])
        .padding(0.1);

    // asse delle y
    const y = d3
        .scaleLinear()
        .domain([0, d3.max(data, (d) => d.total)])
        .nice()
        .range([height + margin.top, margin.top]);

    // colore associato ai sessi
    const color = d3
        .scaleOrdinal()
        .domain(["female", "male"])
        .range(["#fcd9f8", "#ade8ff"]);

    // aggiungo le stacked bars
    const layer = svgBarChart
        .selectAll("g.layer")
        .data(stackedData)
        .join("g")
        .attr("class", "layer")
        .attr("fill", (d) => color(d.key));

    
        layer
        .selectAll("rect")
        .data((d) => d)
        .join("rect")
        .attr("x", (d) => x(d.data.sport))
        .attr("y", (d) => y(d[1]))
        .attr("height", (d) => y(d[0]) - y(d[1]))
        .attr("width", x.bandwidth())
        .on("mouseover", function (event, d) {
            const gender = d3.select(this.parentNode).datum().key;
            const value = d[1] - d[0];
            tooltip
                .style("display", "block")
                .style("left", event.pageX + 10 + "px")
                .style("top", event.pageY - 10 + "px")
                .html(
                    `${
                        gender.charAt(0).toUpperCase() + gender.slice(1)
                    }: ${value}`
                );
        })
        .on("mouseout", function () {
            tooltip.style("display", "none");
        });

    // aggiungo il valore totale delle medaglie sopra ogni glyph dello stacked bar chart
    svgBarChart
        .selectAll(".total-label")
        .data(data)
        .join("text")
        .attr("class", "total-label")
        .attr("x", (d) => x(d.sport) + x.bandwidth() / 2)
        .attr("y", (d) => y(d.total) - 5)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text((d) => d.total);

    // aggiungo asse x
    svgBarChart
        .append("g")
        .attr("transform", `translate(0,${height + margin.top})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("font-size", 10)
        .style("text-anchor", "center");

    svgBarChart
        .append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));

    // aggiungo legenda che indica le colorazioni dei sessi
    const legend = svgBarChart
        .append("g")
        .attr("font-family", "sans-serif")
        .attr("font-size", 10)
        .attr("text-anchor", "start")
        .selectAll("g")
        .data(["female", "male"])
        .join("g")
        .attr(
            "transform",
            (d, i) =>
                `translate(${width + margin.left - 50},${
                    margin.top + i * 20
                })`
        );

    legend
        .append("rect")
        .attr("x", 0)
        .attr("width", 19)
        .attr("height", 19)
        .attr("fill", color);

    legend
        .append("text")
        .attr("x", 24)
        .attr("y", 9.5)
        .attr("dy", "0.32em")
        .text((d) => d.charAt(0).toUpperCase() + d.slice(1));
}