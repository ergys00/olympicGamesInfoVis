// Margini e dimensioni del grafico
const margin = { top: 20, right: 300, bottom: 50, left: 50 };
const width = 1200 - margin.left - margin.right; // Larghezza aumentata
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
    `translate(${(margin.left + margin.right) / 2}, ${margin.top})` // Centro orizzontale
  );

// Scale per l'asse X e Y
const x = d3.scaleTime().range([0, width]);
const y = d3.scaleLinear().range([height, 0]);

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
  "#A3A3A3"  // Grigio Intenso
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
// Variabile globale per memorizzare gli anni delle Olimpiadi
let olympicYears;

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
  olympicYears = Array.from(
    new Set(data.links.flatMap((d) => d.attr.map((attr) => +attr.year)))
  )
    .filter((year) => ![1916, 1940, 1944].includes(year)) // Escludi gli anni non validi
    .sort((a, b) => a - b);
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
  let allIntervals = getYearIntervals(minYear, maxYear, yearInterval).filter(
    (interval) => !(interval[0] === 2016 && interval[1] === 2020)
  );
  allIntervals = allIntervals
    .map((interval) => {
      // Modifica l'intervallo 1896-1916 in 1896-1912
      if (interval[0] === 1896 && interval[1] === 1916) {
        return [1896, 1912];
      }
      // Unisci l'intervallo 1996-2016 e 2016-2020 in 1996-2020
      if (interval[0] === 1996 && interval[1] === 2016) {
        return [1996, 2020];
      }
      // Mantieni tutti gli altri intervalli intatti
      return interval;
    })
    .filter((interval) => {
      // Filtra fuori gli intervalli che contengono esattamente 1916, 1940, o 1944
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
  allIntervals = [...allIntervals, ...updatedIntervals].sort(
    (a, b) => a[0] - b[0]
  );

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
  ].sort((a, b) => a.name.localeCompare(b.name)); // Ordinamento alfabetico;
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

  // Variabile per tracciare lo stato del pulsante
  let isTotalMedalsView = false;

 // Nella parte del codice che gestisce il pulsante "Mostra Medaglie Totali"
d3.select("#toggle-total-medals").on("click", () => {
    if (!isTotalMedalsView) {
      // Mostra i risultati totali
      isTotalMedalsView = true;
      d3.select("#toggle-total-medals").text("Resetta Risultati");

      const country = select.property("value");
      const selectedInterval = d3.select("#interval-select").property("value").split("-");
      const intervalStart = +selectedInterval[0];
      const intervalEnd = +selectedInterval[1];

      // Filtra i dati per il paese selezionato E per l'intervallo di anni
      const totalMedalsData = data.links
        .filter((link) => link.target === country)
        .flatMap((d) => d.attr)
        .filter(d => {
          const year = +d.year;
          return year >= intervalStart && year <= intervalEnd;
        });

      // Raggruppa per anno e calcola il totale delle medaglie
      const totalMedals = d3
        .rollups(
          totalMedalsData,
          (v) => v.length,
          (d) => +d.year
        )
        .map(([year, count]) => ({ year, count }));

      // Trova gli anni dell'intervallo che sono anche anni olimpici
      const intervalOlympicYears = olympicYears.filter(
        year => year >= intervalStart && year <= intervalEnd
      );

      // Riempie i dati mancanti solo per gli anni olimpici nell'intervallo
      const filledTotalMedals = fillMissingYears(totalMedals, intervalOlympicYears);

      // Aggiorna l'asse X per includere solo gli anni dell'intervallo
      x.domain([intervalStart, intervalEnd]);

      // Usa solo gli anni olimpici dell'intervallo come tick values
      svg.select(".x-axis").call(
        d3.axisBottom(x)
          .tickFormat(d3.format("d")) // Formato numerico intero
          .tickValues(intervalOlympicYears) // Usa solo gli anni olimpici dell'intervallo
      );

      // Aggiorna l'asse Y
      y.domain([
        0,
        Math.ceil(d3.max(filledTotalMedals, (d) => d.count) * 1.1),
      ]);

      svg.select(".y-axis").call(d3.axisLeft(y));

      // Rimuove tutte le altre linee e aree esistenti
      svg.selectAll(".line").remove();
      svg.selectAll(".area").remove();

      // Aggiungi o aggiorna l'area sottesa per il totale delle medaglie
      svg
        .append("path")
        .datum(filledTotalMedals)
        .attr("class", "area total")
        .attr("fill", "rgba(0, 0, 0, 0.5)")
        .attr("d", area);

      // Aggiungi o aggiorna la linea nera per il totale delle medaglie
      svg
        .append("path")
        .datum(filledTotalMedals)
        .attr("class", "line total")
        .attr("fill", "none")
        .attr("stroke", "#000")
        .attr("stroke-width", 2)
        .attr("d", line)
        .on("mouseover", function(event, d) {
          d3.select(this)
            .style("opacity", 1)
            .style("stroke-width", 4);
          svg.select(".area.total")
            .style("opacity", 0.5);
            
          const totalMedals = d3.sum(d, v => v.count);
          const selectedInterval = d3.select("#interval-select").property("value").split("-");
          const yearRange = `${selectedInterval[0]}-${selectedInterval[1]}`;
          
          tooltip
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY + 10}px`)
            .style("display", "inline-block")
            .html(`
              Periodo: ${yearRange}<br>
              Medaglie Totali: ${totalMedals}
            `);
        })
        .on("mouseout", function() {
          d3.select(this)
            .style("opacity", 1)
            .style("stroke-width", 2);
          svg.select(".area.total")
            .style("opacity", 0.3);
          tooltip.style("display", "none");
        });

      // Disabilita l'interazione con la legenda
      d3.selectAll(".legend-item").style("pointer-events", "none");

      // Aggiorna la legenda
      const legendGroup = svg.select(".legend-group");
      legendGroup
        .append("g")
        .attr("class", "legend-item total-legend")
        .attr(
          "transform",
          `translate(0, ${legendGroup.selectAll(".legend-item").size() * 20})`
        )
        .append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", "#000");

      legendGroup
        .select(".total-legend")
        .append("text")
        .attr("x", 20)
        .attr("y", 12)
        .text("Tutte le Olimpiadi")
        .style("font-size", "12px")
        .style("alignment-baseline", "middle");

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
    const viewMode = document.querySelector(
      'input[name="view-mode"]:checked'
    ).value;

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
    const viewMode = document.querySelector(
      'input[name="view-mode"]:checked'
    ).value;
    updateChart(country, viewMode, currentInterval);
  });

  // Colori per le medaglie
  const medalColors = {
    Gold: "#ffdf80",   // Oro Pastello
    Silver: "#A0A0A0", // Argento Pastello
    Bronze: "#e4b89e"  // Bronzo Pastello
  };
  

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
    // Toggle active state
    if (activeLegendKey === d.key) {
      activeLegendKey = null;
      // Reset all lines/areas
      d3.selectAll(".line")
        .style("opacity", 1)
        .style("stroke-width", 2)
        .classed("active", false);
      d3.selectAll(".area")
        .style("opacity", 0.6)
        .classed("active", false);
    } else {
      activeLegendKey = d.key;
      // Dim all lines/areas
      d3.selectAll(".line")
        .style("opacity", 0.2)
        .style("stroke-width", 2)
        .classed("active", false);
      d3.selectAll(".area")
        .style("opacity", 0.2)
        .classed("active", false);
      // Highlight selected line/area
      d3.select(`#line-${d.key}`)
        .style("opacity", 1)
        .style("stroke-width", 4)
        .classed("active", true);
      d3.select(`#area-${d.key}`)
        .style("opacity", 0.5)
        .classed("active", true);
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

  function updateChart(country, viewMode, currentInterval) {
    const countryData = data.links.filter((link) => link.target === country);

    // Trova gli anni che appartengono all'intervallo corrente
    const allYears = olympicYears.filter(
      (year) => year >= currentInterval[0] && year <= currentInterval[1]
    );

    // Rimuovi il primo anno dell'intervallo, se non è il primo intervallo
    const filteredYears =
      currentInterval[0] === olympicYears[0]
        ? allYears
        : allYears.filter((year) => year !== currentInterval[0]);

    let linesData;
    if (viewMode === "disciplines") {
      linesData = Array.from(
        d3.group(countryData, (d) => d.source),
        ([key, values]) => ({
          key,
          values: fillMissingYears(
            Array.from(
              d3.group(values.flatMap((d) => d.attr || []), (d) => d.year),
              ([year, entries]) => ({
                year: +year,
                count: entries.length, // Totale medaglie
                gold: entries.filter((entry) => entry.medal === "Gold").length, // Medaglie oro
                silver: entries.filter((entry) => entry.medal === "Silver").length, // Medaglie argento
                bronze: entries.filter((entry) => entry.medal === "Bronze").length, // Medaglie bronzo
              })
            ),
            filteredYears
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
            Array.from(
              d3.group(values, (d) => d.year),
              ([year, entries]) => ({
                year: +year,
                count: entries.length, // Totale medaglie per tipo
              })
            ),
            filteredYears
          ),
        })
      );
    
      // Aggiungere un controllo per verificare la somma totale delle medaglie
      const totalCalculatedMedals = linesData.reduce((sum, line) => {
        return sum + d3.sum(line.values, (v) => v.count);
      }, 0);
    
      console.log("Totale medaglie calcolato (medals mode):", totalCalculatedMedals);
    }


    x.domain(d3.extent(filteredYears));
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
      .call(
        d3.axisBottom(x).tickFormat(d3.format("d")).tickValues(filteredYears)
      );
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

    // Modifica del mouseover per mostrare il tooltip con informazioni dettagliate
    lines
    .enter()
    .append("path")
    .attr("class", (d) => `line line-${d.key}`)
    .attr("id", (d) => `line-${d.key}`)
    .attr("fill", "none")
    .attr("stroke", (d) => viewMode === "medals" ? medalColors[d.key] : color(d.key))
    .attr("stroke-width", 2)
    .attr("d", (d) => line(d.values))
    .style("pointer-events", "stroke")
    .style("stroke-linecap", "round")
    .style("stroke-linejoin", "round")
    .on("mouseover", function(event, d) {
      // Se c'è una selezione attiva, ignora le altre linee
      if (activeLegendKey && d.key !== activeLegendKey) return;
  
      // Prima abbassiamo tutte le opacità
      d3.selectAll(".line").style("opacity", 0.2);
      d3.selectAll(".area").style("opacity", 0.1);
      
      // Poi evidenziamo solo gli elementi interessati
      d3.select(`#line-${d.key}`)
        .style("opacity", 1)
        .style("stroke-width", 4);
      
      d3.select(`#area-${d.key}`)
        .style("opacity", 0.3)
       
  
        // Ottieni l'intervallo di anni selezionato
  const selectedInterval = d3.select("#interval-select").property("value").split("-");
  const yearRange = `${selectedInterval[0]}-${selectedInterval[1]}`;

      // Calcola i dettagli delle medaglie usando la logica originale
      if (viewMode === "disciplines") {
        const totalGold = d3.sum(d.values, (v) => v.gold || 0);
        const totalSilver = d3.sum(d.values, (v) => v.silver || 0);
        const totalBronze = d3.sum(d.values, (v) => v.bronze || 0);
        const totalMedals = totalGold + totalSilver + totalBronze; // Calcola il totale dalle singole medaglie
        
        tooltip
      .style("left", `${event.pageX + 10}px`)
      .style("top", `${event.pageY + 10}px`)
      .style("display", "inline-block")
      .html(`
        <strong>${d.key}</strong><br>
        Periodo: ${yearRange}<br>
        Totale Medaglie: ${totalMedals}<br>
        Oro: ${totalGold}<br>
        Argento: ${totalSilver}<br>
        Bronzo: ${totalBronze}
      `);
  } else if (viewMode === "medals") {
    const totalMedals = d3.sum(d.values, (v) => v.count);
    tooltip
      .style("left", `${event.pageX + 10}px`)
      .style("top", `${event.pageY + 10}px`)
      .style("display", "inline-block")
      .html(`
        <strong>${d.key}</strong><br>
        Periodo: ${yearRange}<br>
        Totale Medaglie: ${totalMedals}
      `);
  }
})
    .on("mouseout", function() {
      // Ripristina lo stato delle linee se non c'è una selezione attiva
      if (!activeLegendKey) {
        d3.selectAll(".line")
          .style("opacity", 1)
          .style("stroke-width", 2);
        d3.selectAll(".area")
          .style("opacity", 0.6);
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
        filledData.push({ year, count: 0, gold: 0, silver: 0, bronze: 0 });
      }
    });
  
    console.log("Filled Data:", filledData);
    return filledData;
  }
  
});