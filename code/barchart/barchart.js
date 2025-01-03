// Margini e dimensioni del grafico
const margin = { top: 20, right: 300, bottom: 50, left: 100 };
const width = 1800 - margin.left - margin.right; // Larghezza aumentata
const height = 600 - margin.top - margin.bottom; // Altezza aumentata

// Creazione dell'SVG nel div del grafico
const svg = d3
  .select("#chart")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr(
    "transform",
    `translate(${margin.left}, ${margin.top})` // Centro orizzontale
  );

svg.append("style").text(`
     .year-delimiter {
    stroke: #d9d9d9;
    stroke-width: 2px;
  }
    .legend-checkbox {
      margin-right: 8px;
      cursor: pointer;
    }
    .legend-item {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
    }
    .legend-label {
      cursor: pointer;
      user-select: none;
    }
  `);

d3.select("#toggle-total-medals").remove();

// Scale per l'asse X e Y
// const x = d3.scaleTime().range([0, width]);
// const y = d3.scaleLinear().range([height, 0]);

// Scale for X axis - modify for grouped bars
const x = d3.scaleBand().range([0, width]).padding(0.1);
// Create another scale for groups within each year
const xSubgroup = d3.scaleBand().padding(0.05);

// Y scale remains the same
const y = d3.scaleLinear().range([height, 0]);

// Funzione per generare tick values interi limitati
function generateUniqueTicks(max) {
  // Se il valore massimo è piccolo, mostra tutti i valori
  if (max < 10) {
    return Array.from({ length: max + 1 }, (_, i) => i);
  }

  // Altrimenti, genera un numero limitato di tick values
  const numberOfTicks = 8; // Numero massimo di tick desiderati
  const step = Math.ceil(max / (numberOfTicks - 1));
  const ticks = [];

  // Aggiungi sempre 0 come primo valore
  ticks.push(0);

  // Aggiungi valori intermedi basati sullo step
  for (let i = step; i < max; i += step) {
    ticks.push(i);
  }

  // Assicurati di includere il valore massimo
  if (!ticks.includes(max)) {
    ticks.push(max);
  }

  return ticks;
}

// Scala di colori per le linee
const color = d3.scaleOrdinal([
  "#6FA3EF", // Blu Intenso
  "#71C687", // Verde Intenso
  "#FFD966", // Giallo Intenso
  "#FFA07A", // Arancione Intenso
  "#FF6FAF", // Rosa Intenso
  "#BA88FF", // Viola Intenso
  "#7FC4FF", // Celeste Intenso
  "#FF8674", // Corallo Intenso
  "#D8A9D8", // Lilla Intenso
  "#86C791", // Menta Intensa
  "#A3A3A3", // Grigio Intenso
]);


// Aggiunta degli assi
svg.append("g").attr("class", "x-axis").attr("transform", `translate(0, ${height})`);

svg.append("g").attr("class", "y-axis");

// Aggiunta dei gruppi per le griglie
svg.append("g").attr("class", "grid x-grid").attr("transform", `translate(0, ${height})`);

svg.append("g").attr("class", "grid y-grid");

// // Generatore di linee
// const line = d3
//   .line()
//   .x((d) => x(d.year))
//   .y((d) => y(d.count));

// // Generatore di aree sottese
// const area = d3
//   .area()
//   .x((d) => x(d.year))
//   .y0(height)
//   .y1((d) => y(d.count));

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
// Variabile globale per memorizzare gli anni delle Olimpiadi
let olympicYears;

// Funzione per aggiornare la griglia
function updateGrid() {
  // Griglia verticale
  svg
    .select(".x-grid")
    .call(d3.axisBottom(x).tickSize(-height).tickFormat(""))
    .selectAll("line")
    .style("stroke", "#aaa") // Colore
    .style("stroke-width", "0.5px") // Linee
    .style("stroke-dasharray", "2,2"); // Pattern tratteggiato

  // Griglia orizzontale
  svg
    .select(".y-grid")
    .call(d3.axisLeft(y).tickSize(-width).tickFormat(""))
    .selectAll("line")
    .style("stroke", "#aaa") // Colore
    .style("stroke-width", "0.5px") // Linee Spessore
    .style("stroke-dasharray", "2,2"); // Densità Pattern tratteggiato
}

// Caricamento del dataset
d3.json("../../data/dataset.json").then((data) => {
  olympicYears = Array.from(new Set(data.links.flatMap((d) => d.attr.map((attr) => +attr.year))))
    .filter((year) => ![1916, 1940, 1944].includes(year)) // Escludo gli anni non validi
    .sort((a, b) => a - b);
  // Trovo l'anno minimo e massimo
  const minYear = d3.min(data.links.flatMap((d) => d.attr.map((attr) => +attr.year)));
  const maxYear = d3.max(data.links.flatMap((d) => d.attr.map((attr) => +attr.year)));

  // Funzione per calcolare intervalli di anni
  function getYearIntervals(startYear, endYear, interval) {
    const intervals = [];
    for (let i = startYear; i < endYear; i += interval) {
      intervals.push([i, Math.min(i + interval, endYear)]);
    }
    return intervals;
  }

  const yearInterval = 20; // Intervallo di 20 anni
  let allIntervals = getYearIntervals(minYear, maxYear, yearInterval).filter((interval) => !(interval[0] === 2016 && interval[1] === 2020));
  allIntervals = allIntervals
    .map((interval) => {
      // Modifica l'intervallo 1896-1916 in 1896-1912
      if (interval[0] === 1896 && interval[1] === 1916) {
        return [1896, 1912];
      }
      // Unisco l'intervallo 1996-2016 e 2016-2020 in 1996-2020
      if (interval[0] === 1996 && interval[1] === 2016) {
        return [1996, 2020];
      }
      // Mantengo tutti gli altri intervalli intatti
      return interval;
    })
    .filter((interval) => {
      // Filtro gli intervalli che contengono esattamente 1916, 1940, o 1944
      const excludedYears = [1916, 1940, 1944];
      return !excludedYears.some((year) => interval.includes(year));
    });

  // Aggiungi eventuali intervalli mancanti dopo la rimozione
  const updatedIntervals = [];
  for (let i = 0; i < allIntervals.length - 1; i++) {
    const current = allIntervals[i];
    const next = allIntervals[i + 1];
    // Aggiungi intervalli intermedi mancanti
    if (current[1] !== next[0]) {
      updatedIntervals.push([current[1], next[0]]);
    }
  }
  allIntervals = [...allIntervals, ...updatedIntervals].sort((a, b) => a[0] - b[0]);

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
  const countries = [...new Set(data.nodes.filter((d) => d.noc).map((d) => ({ id: d.id, name: d.name })))].sort((a, b) => a.name.localeCompare(b.name)); // Ordinamento alfabetico;
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
    const viewMode = document.querySelector('input[name="view-mode"]:checked').value;
    updateChart(country, viewMode, currentInterval);
  });

  // Variabile per tracciare lo stato del pulsante
  let isTotalMedalsView = false;

  // Parte del codice che gestisce il pulsante "Mostra Medaglie Totali"
  d3.select("#toggle-total-medals").on("click", () => {
    if (!isTotalMedalsView) {
      // Mostra i risultati totali
      isTotalMedalsView = true;
      d3.select("#toggle-total-medals").text("Resetta Risultati");

      const country = select.property("value");
      const selectedInterval = d3.select("#interval-select").property("value").split("-");
      const intervalStart = +selectedInterval[0];
      const intervalEnd = +selectedInterval[1];

      // Determina se questo è il primo intervallo
      const isFirstInterval = intervalStart === olympicYears[0];

      // Filtra i dati per il paese selezionato E per l'intervallo di anni
      // tenendo conto degli intervalli semi-aperti
      const totalMedalsData = data.links
        .filter((link) => link.target === country)
        .flatMap((d) => d.attr)
        .filter((d) => {
          const year = +d.year;
          if (isFirstInterval) {
            // Per il primo intervallo, includi anche l'anno iniziale
            return year >= intervalStart && year <= intervalEnd;
          } else {
            // Per tutti gli altri intervalli, escludi l'anno iniziale
            return year > intervalStart && year <= intervalEnd;
          }
        });

      // Trova gli anni dell'intervallo che sono anche anni olimpici
      const intervalOlympicYears = olympicYears.filter((year) => {
        if (isFirstInterval) {
          return year >= intervalStart && year <= intervalEnd;
        } else {
          return year > intervalStart && year <= intervalEnd;
        }
      });

      // Raggruppa per anno e calcola il totale delle medaglie
      const totalMedalsByYear = d3.group(totalMedalsData, (d) => d.year);
      const totalMedals = Array.from(totalMedalsByYear, ([year, medals]) => ({
        year: +year,
        count: medals.length,
      }));

      // Riempie i dati mancanti solo per gli anni olimpici nell'intervallo
      const filledTotalMedals = fillMissingYears(totalMedals, intervalOlympicYears);

      // Aggiorna l'asse X per includere solo gli anni dell'intervallo
      x.domain([
        intervalOlympicYears[0], // Usa il primo anno olimpico dell'intervallo
        intervalEnd,
      ]);

      // Usa solo gli anni olimpici dell'intervallo come tick values
      svg.select(".x-axis").call(d3.axisBottom(x).tickFormat(d3.format("d")).tickValues(intervalOlympicYears));

      // Aggiorna l'asse Y
      const maxMedals = Math.ceil(d3.max(filledTotalMedals, (d) => d.count) * 1.1);
      y.domain([0, maxMedals]);

      // Genera i tick values unici e interi per l'asse Y
      const yTickValues = generateUniqueTicks(maxMedals);
      svg.select(".y-axis").call(d3.axisLeft(y).tickValues(yTickValues).tickFormat(d3.format("d")));
      // Rimuove tutte le altre linee e aree esistenti
      svg.selectAll(".line").remove();
      svg.selectAll(".area").remove();

      // Aggiungi o aggiorna l'area sottesa per il totale delle medaglie
      svg.append("path").datum(filledTotalMedals).attr("class", "area total").attr("fill", "rgba(0, 0, 0, 0.5)").attr("d", area);

      // Aggiungi o aggiorna la linea nera per il totale delle medaglie
      svg
        .append("path")
        .datum(filledTotalMedals)
        .attr("class", "line total")
        .attr("fill", "none")
        .attr("stroke", "#000")
        .attr("stroke-width", 2)
        .attr("d", line)
        .on("mouseover", function (event, d) {
          d3.select(this).style("opacity", 1).style("stroke-width", 4);
          svg.select(".area.total").style("opacity", 0.5);

          // Calcola il totale effettivo delle medaglie nell'intervallo
          const totalMedalsCount = d3.sum(d, (v) => v.count);

          tooltip
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY + 10}px`)
            .style("display", "inline-block").html(`
            Periodo: ${intervalStart}-${intervalEnd}<br>
            Medaglie Totali: ${totalMedalsCount}
          `);
        })
        .on("mouseout", function () {
          d3.select(this).style("opacity", 1).style("stroke-width", 2);
          svg.select(".area.total").style("opacity", 0.3);
          tooltip.style("display", "none");
        });

      // Disabilita l'interazione con la legenda
      d3.selectAll(".legend-item").style("pointer-events", "none");

      // Aggiorna la legenda
      const legendGroup = svg.select(".legend-group");
      legendGroup
        .append("g")
        .attr("class", "legend-item total-legend")
        .attr("transform", `translate(0, ${legendGroup.selectAll(".legend-item").size() * 20})`)
        .append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", "#000");

      legendGroup.select(".total-legend").append("text").attr("x", 20).attr("y", 12).text("Medaglie Totali").style("font-size", "12px").style("alignment-baseline", "middle");

      // Aggiorna la griglia
      updateGrid();
    } else {
      // Reset ai risultati iniziali
      isTotalMedalsView = false;
      d3.select("#toggle-total-medals").text("Mostra Medaglie Totali");

      const country = select.property("value");
      const viewMode = "medals";
      updateChart(country, viewMode, currentInterval);

      // Riabilita l'interazione con la legenda
      d3.selectAll(".legend-item").style("pointer-events", "auto");

      // Rimuove l'elemento "Tutte le Olimpiadi" dalla legenda
      d3.select(".legend-item.total-legend").remove();
    }
  });
  // Event listener per cambio modalità di visualizzazione
  d3.selectAll('input[name="view-mode"]').on("change", () => {
    const viewMode = document.querySelector('input[name="view-mode"]:checked').value;

    // Mostra o nasconde il pulsante
    if (viewMode === "medals") {
      d3.select("#toggle-total-medals").style("display", "inline-block");
    } else {
      d3.select("#toggle-total-medals").style("display", "none");
    }

    const country = select.property("value");
    updateChart(country, viewMode, currentInterval);
  });

  // Event listener per cambio intervallo di anni
  intervalSelect.on("change", function () {
    const selectedInterval = d3.select(this).property("value").split("-");
    currentInterval = [+selectedInterval[0], +selectedInterval[1]];
    const country = select.property("value");
    const viewMode = document.querySelector('input[name="view-mode"]:checked').value;
    updateChart(country, viewMode, currentInterval);
  });

  // Colori per le medaglie
  const medalColors = {
    Gold: "#ffc107", // Oro più intenso
    Silver: "#78909c", // Argento più scuro
    Bronze: "#cd7f32", // Bronzo più intenso
  };
    /*// Colori per le medaglie
    const medalColors = {
      Gold: "#ffdf80",   // Oro Pastello
      Silver: "#d9d9d9", // Argento Pastello
      Bronze: "#e4b89e"  // Bronzo Pastello
    };*/

  // Funzione per aggiornare la legenda
  function updateLegend(linesData, viewMode) {
    // Remove existing legend
    svg.selectAll(".legend-group").remove();

    // Create new legend group
    const legend = svg
      .append("g")
      .attr("class", "legend-group")
      .attr("transform", `translate(${width + 20}, 20)`);

    // Create legend item containers
    const items = legend
      .selectAll(".legend-item")
      .data(linesData)
      .enter()
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", (d, i) => `translate(0, ${i * 25})`);

    // Add checkboxes within foreignObject
    items
      .append("foreignObject")
      .attr("width", 20)
      .attr("height", 20)
      .append("xhtml:div")
      .html(
        (d) => `
        <input type="checkbox" 
          class="legend-checkbox" 
          id="checkbox-${d.key.replace(/\s+/g, "-")}" 
          checked
        />
      `
      );

    // Add colored rectangles
    items
      .append("rect")
      .attr("x", 24)
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", (d) => (viewMode === "medals" ? medalColors[d.key] : color(d.key)));

    // Add text labels
    items
      .append("text")
      .attr("x", 44)
      .attr("y", 12)
      .text((d) => d.key)
      .attr("class", "legend-label");

    // Add event listeners for each legend item
    items.each(function (d) {
      const checkbox = d3.select(this).select("input");
      checkbox.on("change", function () {
        const isChecked = this.checked;
        const categoryKey = d.key.replace(/\s+/g, "-");

        // Update bars visibility
        svg.selectAll(`.bar-${categoryKey}`).style("display", isChecked ? "block" : "none");

        // If hovering a bar when unchecking, reset the view
        if (!isChecked) {
          svg.selectAll(".bar").style("opacity", 1).style("stroke", "none");
          svg.select(".connecting-line-group").style("display", "none");
        }
      });
    });
  }

  svg.append("g").attr("class", "connecting-line-group").style("display", "none");

  function updateChart(country, viewMode, currentInterval) {
    const countryData = data.links.filter((link) => link.target === country);

    const connectingLine = d3
      .line()
      .x((d) => x(d.year) + xSubgroup(d.key) + xSubgroup.bandwidth() / 2)
      .y((d) => y(d.value));

    const filteredYears = olympicYears.filter((year) => {
      if (currentInterval[0] === olympicYears[0]) {
        return year >= currentInterval[0] && year <= currentInterval[1];
      }
      return year > currentInterval[0] && year <= currentInterval[1];
    });

    svg.selectAll(".year-delimiter").remove();
    filteredYears.forEach((year) => {
      svg.append("line").attr("class", "year-delimiter").attr("x1", x(year)).attr("y1", 0).attr("x2", x(year)).attr("y2", height);
    });

    svg
      .append("line")
      .attr("class", "year-delimiter")
      .attr("x1", x(filteredYears[filteredYears.length - 1]) + x.bandwidth())
      .attr("y1", 0)
      .attr("x2", x(filteredYears[filteredYears.length - 1]) + x.bandwidth())
      .attr("y2", height);

    let groupedData;
    if (viewMode === "disciplines") {
      groupedData = Array.from(
        d3.group(countryData, (d) => d.source),
        ([key, values]) => ({
          key,
          values: fillMissingYears(
            Array.from(
              d3.group(
                values.flatMap((d) => d.attr || []),
                (d) => d.year
              ),
              ([year, entries]) => ({
                year: +year,
                count: entries.length,
                gold: entries.filter((entry) => entry.medal === "Gold").length,
                silver: entries.filter((entry) => entry.medal === "Silver").length,
                bronze: entries.filter((entry) => entry.medal === "Bronze").length,
              })
            ),
            filteredYears
          ),
        })
      );
    } else {
      groupedData = Array.from(
        d3.group(
          countryData.flatMap((d) => d.attr),
          (d) => d.medal
        ),
        ([key, values]) => ({
          key,
          values: fillMissingYears(
            Array.from(
              d3.group(values, (d) => d.year),
              ([year, entries]) => ({
                year: +year,
                count: entries.length,
              })
            ),
            filteredYears
          ),
        })
      );
    }

    // Update scales for bar chart
    x.domain(filteredYears);
    xSubgroup.domain(groupedData.map((d) => d.key)).range([0, x.bandwidth()]);

    const maxValue = Math.ceil(
      d3.max(
        groupedData.flatMap((d) => d.values),
        (d) => d.count
      )
    );
    y.domain([0, maxValue]);

    // Update axes
    const yTickValues = generateUniqueTicks(maxValue);
    svg.select(".x-axis").call(d3.axisBottom(x).tickFormat(d3.format("d")));

    svg.select(".y-axis").call(d3.axisLeft(y).tickValues(yTickValues).tickFormat(d3.format("d")));

    // Remove previous elements
    svg.selectAll(".bar-group").remove();

    const yearGroups = svg
      .selectAll(".bar-group")
      .data(filteredYears)
      .enter()
      .append("g")
      .attr("class", "bar-group")
      .attr("transform", (d) => `translate(${x(d)},0)`);
    // Create year groups
    // Create bars for each category within year groups
    yearGroups.selectAll(".bar")
  .data(year => groupedData.map(group => ({
    key: group.key,
    value: group.values.find(v => v.year === year)?.count || 0,
    year: year,
    // Add the full group data for accessing values later
    groupData: group.values
  })))
  .enter()
  .append("rect")
  .attr("class", d => `bar bar-${d.key.replace(/\s+/g, '-')}`)
  .attr("x", d => xSubgroup(d.key))
  .attr("y", d => y(d.value))
  .attr("width", xSubgroup.bandwidth())
  .attr("height", d => height - y(d.value))
  .attr("fill", d => viewMode === "medals" ? medalColors[d.key] : color(d.key))
  .on("mouseover", function(event, d) {
    const categoryKey = d.key.replace(/\s+/g, '-');
    const checkbox = d3.select(`#checkbox-${categoryKey}`);
    if (!checkbox.property("checked")) return;

    // Reduce opacity of all bars
    svg.selectAll(".bar")
      .filter(function() {
        const barCategoryKey = d3.select(this).attr("class").split(" ")[1].replace('bar-', '');
        const barCheckbox = d3.select(`#checkbox-${barCategoryKey}`);
        return barCheckbox.property("checked");
      })
      .style("opacity", 0.2);
    
    // Highlight bars of the same category
    svg.selectAll(`.bar-${categoryKey}`)
      .style("opacity", 1)
      .style("stroke", "#000")
      .style("stroke-width", 2);

    // Get all data points for this category
    const categoryData = filteredYears.map(year => ({
      key: d.key,
      value: groupedData.find(g => g.key === d.key)
        .values.find(v => v.year === year)?.count || 0,
      year: year
    })).filter(point => point.value !== undefined);

    // Show connecting line
    const lineGroup = svg.select(".connecting-line-group");
    lineGroup.style("display", "block")
      .selectAll("*").remove();

    // Add dotted line
    lineGroup.append("path")
      .datum(categoryData)
      .attr("fill", "none")
      .attr("stroke", viewMode === "medals" ? medalColors[d.key] : color(d.key))
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5")
      .attr("d", d3.line()
        .x(d => x(d.year) + xSubgroup(d.key) + xSubgroup.bandwidth() / 2)
        .y(d => y(d.value))
      );

    // Add circles at each point
    lineGroup.selectAll(".connection-point")
      .data(categoryData)
      .enter()
      .append("circle")
      .attr("class", "connection-point")
      .attr("cx", p => x(p.year) + xSubgroup(p.key) + xSubgroup.bandwidth() / 2)
      .attr("cy", p => y(p.value))
      .attr("r", 4)
      .attr("fill", viewMode === "medals" ? medalColors[d.key] : color(d.key))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);

    // Show tooltip with position adjustment
    const tooltipX = event.pageX + 10;
    const tooltipY = event.pageY - 28; // Offset to prevent tooltip from blocking the mouse

    tooltip
      .style("left", `${tooltipX}px`)
      .style("top", `${tooltipY}px`)
      .style("display", "block")
      .html(`
        <strong>${d.key}</strong><br>
        Anno: ${d.year}<br>
        Medaglie: ${d.value}
      `);
  })
  .on("mouseout", function() {
    // Restore opacity for all bars
    svg.selectAll(".bar")
      .filter(function() {
        const barCategoryKey = d3.select(this).attr("class").split(" ")[1].replace('bar-', '');
        const barCheckbox = d3.select(`#checkbox-${barCategoryKey}`);
        return barCheckbox.property("checked");
      })
      .style("opacity", 1)
      .style("stroke", "none");
    
    // Hide connecting line and points
    svg.select(".connecting-line-group")
      .style("display", "none");
    
    // Hide tooltip
    tooltip.style("display", "none");
  });
    updateLegend(groupedData, viewMode);
    updateGrid();
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
        filledData.push({ year, count: 0, gold: 0, silver: 0, bronze: 0 });
      }
    });

    return filledData;
  }
});

d3.select("#toggle-total-medals").on("click", null);
