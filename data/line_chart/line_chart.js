// Margini e dimensioni del grafico
const margin = { top: 20, right: 300, bottom: 50, left: 50 }; // Spazio aggiuntivo a destra per la legenda
const width = 1000 - margin.left - margin.right; // Grafico più grande
const height = 500 - margin.top - margin.bottom;

// Creazione dell'SVG nel div del grafico
const svg = d3
  .select("#chart")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left}, ${margin.top})`);

// Scale per l'asse X e Y
const x = d3.scaleTime().range([0, width]);
const y = d3.scaleLinear().range([height, 0]);

// Scala di colori per le linee
const color = d3.scaleOrdinal([
  "#1f77b4",
  "#ff7f0e",
  "#2ca02c",
  "#d62728",
  "#9467bd",
  "#8c564b",
  "#e377c2",
  "#7f7f7f",
  "#bcbd22",
  "#17becf",
]);

// Aggiunta degli assi
svg
  .append("g")
  .attr("class", "x-axis")
  .attr("transform", `translate(0, ${height})`);

svg.append("g").attr("class", "y-axis");

// Aggiunta dei gruppi per le griglie
svg
  .append("g")
  .attr("class", "grid x-grid")
  .attr("transform", `translate(0, ${height})`);

svg.append("g").attr("class", "grid y-grid");

// Generatore di linee
const line = d3
  .line()
  .x((d) => x(d.year))
  .y((d) => y(d.count));

// Generatore di aree sottese
const area = d3
  .area()
  .x((d) => x(d.year))
  .y0(height)
  .y1((d) => y(d.count));

// Tooltip per interazione con il mouse
const tooltip = d3
  .select("body")
  .append("div")
  .attr("id", "tooltip")
  .style("position", "absolute")
  .style("background", "rgba(0, 0, 0, 0.8)")
  .style("color", "#fff")
  .style("padding", "5px 10px")
  .style("border-radius", "5px")
  .style("display", "none");

// Variabile per tracciare la selezione corrente
let activeLegendKey = null;

// Funzione per aggiornare la griglia
function updateGrid() {
  // Griglia verticale
  svg
    .select(".x-grid")
    .call(
      d3
        .axisBottom(x)
        .tickSize(-height) // Linee della griglia
        .tickFormat("") // Nessuna etichetta
    )
    .selectAll("line")
    .style("stroke", "#ddd")
    .style("stroke-dasharray", "3,3");

  // Griglia orizzontale
  svg
    .select(".y-grid")
    .call(d3.axisLeft(y).tickSize(-width).tickFormat(""))
    .selectAll("line")
    .style("stroke", "#ddd")
    .style("stroke-dasharray", "3,3");
}

// Caricamento del dataset
d3.json("/data/dataset.json").then((data) => {
  // Trova l'anno minimo e massimo
  const minYear = d3.min(
    data.links.flatMap((d) => d.attr.map((attr) => +attr.year))
  );
  const maxYear = d3.max(
    data.links.flatMap((d) => d.attr.map((attr) => +attr.year))
  );

  // Funzione per calcolare intervalli di anni
  function getYearIntervals(startYear, endYear, interval) {
    const intervals = [];
    for (let i = startYear; i < endYear; i += interval) {
      intervals.push([i, Math.min(i + interval, endYear)]);
    }
    return intervals;
  }

  const yearInterval = 20; // Intervallo di 20 anni
  const allIntervals = getYearIntervals(minYear, maxYear, yearInterval);

  // Popolamento del menu a tendina per selezione intervalli
  const intervalSelect = d3.select("#interval-select");
  intervalSelect
    .selectAll("option")
    .data(allIntervals)
    .enter()
    .append("option")
    .attr("value", (d) => `${d[0]}-${d[1]}`)
    .text((d) => `${d[0]} - ${d[1]}`);

  let currentInterval = allIntervals[0];

  // Lista dei paesi con nome completo
  const countries = [
    ...new Set(
      data.nodes.filter((d) => d.noc).map((d) => ({ id: d.id, name: d.name }))
    ),
  ];
  const defaultCountry = countries[0].id;

  // Popolamento del menu a tendina per selezione paese
  const select = d3.select("#country-select");
  select
    .selectAll("option")
    .data(countries)
    .enter()
    .append("option")
    .attr("value", (d) => d.id)
    .text((d) => d.name);

  // Aggiornamento iniziale del grafico
  updateChart(defaultCountry, "disciplines", currentInterval);

  // Event listener per cambio paese
  select.on("change", () => {
    const country = select.property("value");
    const viewMode = document.querySelector(
      'input[name="view-mode"]:checked'
    ).value;
    updateChart(country, viewMode, currentInterval);
  });

  // Event listener per cambio modalità di visualizzazione
  d3.selectAll('input[name="view-mode"]').on("change", () => {
    const country = select.property("value");
    const viewMode = document.querySelector(
      'input[name="view-mode"]:checked'
    ).value;
    updateChart(country, viewMode, currentInterval);
  });

  // Event listener per cambio intervallo di anni
  intervalSelect.on("change", function () {
    const selectedInterval = d3.select(this).property("value").split("-");
    currentInterval = [+selectedInterval[0], +selectedInterval[1]];
    const country = select.property("value");
    const viewMode = document.querySelector(
      'input[name="view-mode"]:checked'
    ).value;
    updateChart(country, viewMode, currentInterval);
  });

  // Colori per le medaglie
  const medalColors = { Gold: "#FFD700", Silver: "#C0C0C0", Bronze: "#CD7F32" };

  // Funzione per aggiornare la legenda
  function updateLegend(linesData, viewMode) {
    svg.selectAll(".legend-group").remove(); // Rimuove la legenda precedente

    const legend = svg
      .append("g")
      .attr("class", "legend-group")
      .attr("transform", `translate(${width + 20}, 20)`); // Sposta la legenda a destra

    // Creazione degli elementi della legenda
    legend
      .selectAll(".legend-item")
      .data(linesData)
      .enter()
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", (d, i) => `translate(0, ${i * 20})`)
      .style("cursor", "pointer")
      .on("click", (_, d) => {
        // Alterna lo stato attivo per l'elemento selezionato
        activeLegendKey = activeLegendKey === d.key ? null : d.key;

        // Gestisce l'evidenziazione
        if (activeLegendKey) {
          d3.selectAll(".line, .area").style("opacity", 0.2);
          d3.select(`#line-${d.key}`)
            .style("opacity", 1)
            .classed("active", true)
            .style("stroke-width", 4);
          d3.select(`#area-${d.key}`)
            .style("opacity", 0.5)
            .classed("active", true);
        } else {
          d3.selectAll(".line")
            .style("opacity", 1)
            .style("stroke-width", 2)
            .classed("active", false);
          d3.selectAll(".area").style("opacity", 0.6).classed("active", false);
        }
      })
      .each(function (d) {
        const container = d3.select(this);

        // Rettangolo colorato della legenda
        container
          .append("rect")
          .attr("width", 15)
          .attr("height", 15)
          .attr(
            "fill",
            viewMode === "medals" ? medalColors[d.key] : color(d.key)
          );

        // Testo della legenda
        container
          .append("text")
          .attr("x", 20)
          .attr("y", 12)
          .text(d.key)
          .style("font-size", "12px")
          .style("alignment-baseline", "middle");
      });
  }

  // Funzione principale di aggiornamento del grafico
  function updateChart(country, viewMode, currentInterval) {
    const countryData = data.links.filter((link) => link.target === country);
    const datasetYears = Array.from(
      new Set(data.links.flatMap((d) => d.attr.map((attr) => +attr.year)))
    ).sort((a, b) => a - b);

    const allYears = datasetYears.filter(
      (year) => year >= currentInterval[0] && year <= currentInterval[1]
    );

    let linesData;
    if (viewMode === "disciplines") {
      linesData = Array.from(
        d3.group(countryData, (d) => d.source),
        ([key, values]) => ({
          key,
          values: fillMissingYears(
            d3
              .rollups(
                values.flatMap((d) => d.attr),
                (v) => v.length,
                (d) => +d.year
              )
              .map(([year, count]) => ({ year, count })),
            allYears
          ),
        })
      );
    } else if (viewMode === "medals") {
      linesData = Array.from(
        d3.group(
          countryData.flatMap((d) => d.attr),
          (d) => d.medal
        ),
        ([key, values]) => ({
          key,
          values: fillMissingYears(
            d3
              .rollups(
                values,
                (v) => v.length,
                (d) => +d.year
              )
              .map(([year, count]) => ({ year, count })),
            allYears
          ),
        })
      );
    }

    x.domain(d3.extent(allYears));
    y.domain([
      0,
      Math.ceil(
        d3.max(
          linesData.flatMap((d) => d.values),
          (d) => d.count
        )
      ),
    ]);

    svg
      .select(".x-axis")
      .call(d3.axisBottom(x).tickFormat(d3.format("d")).tickValues(allYears));
    svg.select(".y-axis").call(d3.axisLeft(y));

    const areas = svg.selectAll(".area").data(linesData, (d) => d.key);

    areas
      .enter()
      .append("path")
      .attr("class", (d) => `area area-${d.key}`)
      .attr("fill", (d) =>
        viewMode === "medals" ? medalColors[d.key] : color(d.key)
      )
      .attr("opacity", 0.6) // Aumentata saturazione
      .attr("id", (d) => `area-${d.key}`)
      .attr("d", (d) => area(d.values))
      .merge(areas)
      .transition()
      .duration(750)
      .attr("d", (d) => area(d.values));

    areas.exit().remove();

    const lines = svg.selectAll(".line").data(linesData, (d) => d.key);

    // Modifica del mouseover per mostrare solo il tooltip della selezione attiva
    lines
      .enter()
      .append("path")
      .attr("class", (d) => `line line-${d.key}`)
      .attr("id", (d) => `line-${d.key}`)
      .attr("fill", "none")
      .attr("stroke", (d) =>
        viewMode === "medals" ? medalColors[d.key] : color(d.key)
      )
      .attr("stroke-width", 2)
      .attr("d", (d) => line(d.values))
      .on("mouseover", function (event, d) {
        // Se c'è una selezione attiva, ignora le altre linee
        if (activeLegendKey && d.key !== activeLegendKey) return;

        // Evidenzia la linea selezionata
        d3.selectAll(".line, .area").style("opacity", 0.2);
        d3.select(`#line-${d.key}`)
          .style("opacity", 1)
          .style("stroke-width", 4);
        d3.select(`#area-${d.key}`).style("opacity", 0.5);

        // Mostra il tooltip solo per la linea selezionata
        const totalMedals = d3.sum(d.values, (v) => v.count);
        tooltip
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY + 10}px`)
          .style("display", "inline-block")
          .html(`${d.key}: ${totalMedals} total medals`);
      })
      .on("mouseout", function () {
        // Ripristina lo stato delle linee se non c'è una selezione attiva
        if (!activeLegendKey) {
          d3.selectAll(".line").style("opacity", 1).style("stroke-width", 2);
          d3.selectAll(".area").style("opacity", 0.6);
        }
        tooltip.style("display", "none");
      })
      .merge(lines)
      .transition()
      .duration(750)
      .attr("d", (d) => line(d.values));

    lines.exit().remove();

    updateLegend(linesData, viewMode);

    updateGrid(); // Aggiorna la griglia
  }

  // Funzione per riempire gli anni mancanti con valori predefiniti
  function fillMissingYears(data, allYears) {
    const filledData = [];
    let lastValue = 0;

    allYears.forEach((year) => {
      const match = data.find((d) => d.year === year);
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
